// Browser fixture: production hook, matchmaking service and engines run normally.
// Only the Supabase transport, authentication and navigation are substituted.
export const fixture: any = { game: "gin-rummy", active: false, queue: [], matches: [], players: [], navigations: [], calls: [], joinDelay: 0, lookupError: null };
(window as any).queueFixture = fixture;
export function useAuth() { return { user: { uid: "viewer" } }; }
export function useRouter() { return { push: (url: string) => fixture.navigations.push(url) }; }

class Query {
  filters: ((row: any) => boolean)[] = [];
  operation = "select";
  single = false;
  constructor(public table: string) {}
  select() { return this; }
  eq(key: string, value: any) { this.filters.push(row => key.startsWith("matches.") ? row.matches?.[key.slice(8)] === value : row[key] === value); return this; }
  is(key: string, value: any) { this.filters.push(row => (row[key] ?? null) === value); return this; }
  gte(key: string, value: string) { this.filters.push(row => row[key] >= value); return this; }
  order() { return this; }
  limit() { return this; }
  maybeSingle() { this.single = true; return this; }
  delete() { this.operation = "delete"; return this; }
  async then(resolve: (value: any) => any) {
    fixture.calls.push(this.table + ":" + this.operation);
    if (this.table === "match_players" && fixture.lookupError) return resolve({ data: null, error: fixture.lookupError });
    const source = this.table === "matchmaking_queue" ? fixture.queue : this.table === "matches" ? fixture.matches : fixture.players;
    const rows = source.map((row: any) => this.table === "match_players" ? { ...row, matches: fixture.matches.find((match: any) => match.id === row.match_id) } : row)
      .filter((row: any) => this.filters.every(filter => filter(row)));
    if (this.operation === "delete") fixture.queue = source.filter((row: any) => !this.filters.every(filter => filter(row)));
    return resolve({ data: this.single ? rows[0] ?? null : rows, error: null });
  }
}
const client: any = {
  from: (table: string) => new Query(table),
  rpc: async (name: string, args: any) => {
    fixture.calls.push(name);
    if (name === "join_matchmaking_queue") {
      await new Promise(resolve => setTimeout(resolve, fixture.joinDelay));
      fixture.queue = fixture.queue.filter((row: any) => row.user_id !== "viewer");
      fixture.queue.push({ user_id: "viewer", game_type: args.p_game_type, pool: args.p_pool, party_id: null, queued_at: new Date().toISOString(), heartbeat_at: new Date().toISOString() });
      return { data: null, error: null };
    }
    if (name === "refresh_matchmaking_queue") return { data: fixture.queue.some((row: any) => row.user_id === "viewer" && row.game_type === args.p_game_type && row.pool === args.p_pool), error: null };
    if (name === "try_form_match") {
      const id = "table-" + args.p_game_type;
      fixture.matches.push({ id, game_type: args.p_game_type, pool: args.p_pool, status: "active", created_at: new Date().toISOString(), public_state: args.p_state });
      fixture.players.push(...args.p_players.map((user_id: string, seat_index: number) => ({ user_id, seat_index, match_id: id })));
      fixture.queue = fixture.queue.filter((row: any) => !args.p_players.includes(row.user_id));
      return { data: id, error: null };
    }
    throw new Error("Unexpected RPC " + name);
  },
  channel: () => ({ on() { return this; }, subscribe() { return this; } }),
  removeChannel: async () => {},
};
export function getSupabaseBrowserClient() { return client; }
