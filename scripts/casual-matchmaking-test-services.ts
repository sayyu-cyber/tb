// Test-only transport emulates the trusted server using the real authority engine.
// Authority state is inspectable by tests, but never returned through table reads.
import { createState, projectMatch, type Game } from "../server/matchAuthority";
import { getMatch } from "@/lib/matchmaking";

export const fixture: any = {
  game: "gin-rummy", active: false, queue: [], matches: [], players: [], authority: {},
  navigations: [], calls: [], requests: [], views: [], joinDelay: 0,
  lookupError: null, viewError: null, formationError: null, formationHttpError: null,
};
(window as any).queueFixture = fixture;
fixture.readMatch = (id: string) => getMatch(id);
fixture.seedMatch = (id: string, game: Game, players: string[], pool = "casual") => {
  if (fixture.authority[id]) throw new Error("Duplicate fixture match " + id);
  const state = createState(game, players);
  const match = { game, players, state, deadline: Date.now() + 30_000, completed: false };
  const projected = projectMatch(match);
  fixture.authority[id] = { ...match, ...projected };
  fixture.matches.push({ id, game_type: game, pool, status: "active", created_at: new Date().toISOString(), public_state: projected.publicState, revision: 0 });
  fixture.players.push(...players.map((user_id, seat_index) => ({ user_id, seat_index, match_id: id })));
  return id;
};
export function useAuth() { return { user: { uid: "viewer" } }; }
export function useRouter() { return { push: (url: string) => fixture.navigations.push(url) }; }

class Query {
  filters: ((row: any) => boolean)[] = [];
  operation = "select";
  single = false;
  orders: { key: string; ascending: boolean }[] = [];
  maximum = Infinity;
  constructor(public table: string) {}
  select() { return this; }
  eq(key: string, value: any) { this.filters.push(row => key.startsWith("matches.") ? row.matches?.[key.slice(8)] === value : row[key] === value); return this; }
  is(key: string, value: any) { this.filters.push(row => (row[key] ?? null) === value); return this; }
  gte(key: string, value: string) { this.filters.push(row => row[key] >= value); return this; }
  order(key: string, options: { ascending?: boolean } = {}) { this.orders.push({ key, ascending: options.ascending !== false }); return this; }
  limit(count: number) { this.maximum = count; return this; }
  maybeSingle() { this.single = true; return this; }
  delete() { this.operation = "delete"; return this; }
  async then(resolve: (value: any) => any) {
    fixture.calls.push(this.table + ":" + this.operation);
    if (this.table === "match_players" && fixture.lookupError) return resolve({ data: null, error: fixture.lookupError });
    if (!["matchmaking_queue", "matches", "match_players"].includes(this.table)) throw new Error("Unexpected table " + this.table);
    if (this.operation === "delete" && this.table !== "matchmaking_queue") throw new Error("Client cannot mutate matches");
    const source = this.table === "matchmaking_queue" ? fixture.queue : this.table === "matches" ? fixture.matches : fixture.players;
    const rows = source.map((row: any) => this.table === "match_players" ? { ...row, matches: fixture.matches.find((match: any) => match.id === row.match_id) } : row)
      .filter((row: any) => this.filters.every(filter => filter(row)));
    rows.sort((a: any, b: any) => {
      for (const { key, ascending } of this.orders) {
        const compared = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
        if (compared) return ascending ? compared : -compared;
      }
      return 0;
    });
    if (this.operation === "delete") fixture.queue = source.filter((row: any) => !this.filters.every(filter => filter(row)));
    return resolve({ data: this.single ? rows[0] ?? null : rows.slice(0, this.maximum), error: null });
  }
}
const client: any = {
  from: (table: string) => new Query(table),
  rpc: async (name: string, args: any) => {
    fixture.calls.push(name);
    fixture.requests.push({ transport: "rpc", name, args: structuredClone(args) });
    if (name === "join_matchmaking_queue") {
      await new Promise(resolve => setTimeout(resolve, fixture.joinDelay));
      fixture.queue = fixture.queue.filter((row: any) => row.user_id !== "viewer");
      fixture.queue.push({ user_id: "viewer", game_type: args.p_game_type, pool: args.p_pool, party_id: null, queued_at: new Date().toISOString(), heartbeat_at: new Date().toISOString() });
      fixture.calls.push("join_matchmaking_queue:complete");
      return { data: null, error: null };
    }
    if (name === "get_match_view") {
      if (Object.keys(args).length !== 1 || typeof args.p_match !== "string") throw new Error("Invalid match view request");
      if (fixture.viewError) return { data: null, error: fixture.viewError };
      const row = fixture.matches.find((match: any) => match.id === args.p_match);
      if (!row) return { data: null, error: null };
      const authority = fixture.authority[args.p_match];
      if (!authority?.players.includes("viewer")) return { data: null, error: { message: "Not a participant" } };
      const state = structuredClone(authority.publicState);
      const handKey = row.game_type === "mindi" ? "handsByUid" : "hands";
      state[handKey] = { ...state[handKey], viewer: structuredClone(authority.privateStates.viewer.hand) };
      const view = { gameType: row.game_type, pool: row.pool, status: row.status, createdAt: Date.parse(row.created_at), revision: row.revision, players: authority.players, state };
      fixture.views.push(structuredClone(view));
      return { data: view, error: null };
    }
    throw new Error("Unexpected RPC " + name);
  },
  functions: {
    invoke: async (name: string, { body }: { body: any }) => {
      fixture.calls.push(name + ":" + body.type);
      fixture.requests.push({ transport: "function", name, body: structuredClone(body) });
      if (name !== "match-command" || body.type !== "form" || Object.keys(body).some(key => !["type", "game", "pool", "party"].includes(key))) {
        throw new Error("Browser formation must send only type/game/pool/party, never players or state");
      }
      if (!["mindi", "gin_rummy"].includes(body.game) || !["casual", "ranked", "weekend"].includes(body.pool)) throw new Error("Invalid formation settings");
      if (fixture.formationHttpError) return { data: null, error: { context: new Response(JSON.stringify({ error: fixture.formationHttpError }), { status: 503 }) } };
      if (fixture.formationError) return { data: { error: fixture.formationError }, error: null };
      const existing = fixture.matches.find((match: any) => match.game_type === body.game && match.pool === body.pool && match.status === "active"
        && fixture.players.some((player: any) => player.match_id === match.id && player.user_id === "viewer"));
      if (existing) return { data: { result: existing.id }, error: null };
      const mine = fixture.queue.find((row: any) => row.user_id === "viewer" && row.game_type === body.game && row.pool === body.pool && (row.party_id ?? null) === (body.party ?? null));
      if (!mine) return { data: { result: null }, error: null };
      mine.heartbeat_at = new Date().toISOString();
      const eligible = fixture.queue.filter((row: any) => row.game_type === body.game && row.pool === body.pool && Date.parse(row.heartbeat_at) > Date.now() - 120_000)
        .sort((a: any, b: any) => a.queued_at.localeCompare(b.queued_at) || a.user_id.localeCompare(b.user_id));
      let players: string[];
      if (body.party) {
        const mine = eligible.filter((row: any) => row.party_id === body.party);
        const otherParty = eligible.find((row: any) => row.party_id && row.party_id !== body.party
          && eligible.filter((entry: any) => entry.party_id === row.party_id).length === 2)?.party_id;
        if (mine.length !== 2 || !otherParty) return { data: { result: null }, error: null };
        const theirs = eligible.filter((row: any) => row.party_id === otherParty);
        players = [mine[0].user_id, theirs[0].user_id, mine[1].user_id, theirs[1].user_id];
      } else {
        const count = body.game === "mindi" ? 4 : 2;
        players = eligible.filter((row: any) => !row.party_id).slice(0, count).map((row: any) => row.user_id);
        if (players.length !== count) return { data: { result: null }, error: null };
      }
      if (!players.includes("viewer")) return { data: { result: null }, error: null };
      const id = fixture.seedMatch("table-" + body.game, body.game, players, body.pool);
      fixture.queue = fixture.queue.filter((row: any) => !players.includes(row.user_id));
      return { data: { result: id }, error: null };
    },
  },
  channel: () => ({ on() { return this; }, subscribe() { return this; } }),
  removeChannel: async () => {},
};
export function getSupabaseBrowserClient() { return client; }
