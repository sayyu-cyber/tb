import { applyMove, createState, projectMatch, winners, type AuthorityMatch, type Game, type Move } from "./matchAuthority";

type Config = { url: string; serviceKey: string; origins: string[] };
type Candidate = { game: Game; pool: string; players: string[]; room: string | null; party: string | null };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class RequestError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export function createMatchHandler(config: Config, requestFetch: typeof fetch = fetch) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin");
    const headers: Record<string, string> = { "Content-Type": "application/json", "Cache-Control": "no-store", Vary: "Origin" };
    if (origin && config.origins.includes(origin)) {
      headers["Access-Control-Allow-Origin"] = origin;
      headers["Access-Control-Allow-Headers"] = "authorization, apikey, content-type, x-client-info";
      headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    }
    const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (origin && !config.origins.includes(origin)) return respond({ error: "Origin is not allowed" }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return respond({ error: "POST required" }, 405);
    try {
      if (!config.url || !config.serviceKey) throw new RequestError("Game server is not configured", 503);
      const authorization = request.headers.get("authorization");
      if (!authorization?.startsWith("Bearer ")) throw new RequestError("Sign in to play", 401);
      const auth = await requestFetch(`${config.url}/auth/v1/user`, {
        headers: { Authorization: authorization, apikey: config.serviceKey }, signal: AbortSignal.timeout(10000),
      });
      if (!auth.ok) throw new RequestError("Your session expired. Sign in again.", 401);
      const user = await auth.json();
      if (!uuid.test(user.id) || user.is_anonymous) throw new RequestError("A permanent account is required", 403);
      const text = await request.text();
      if (text.length > 4096) throw new RequestError("Command is too large", 413);
      const command = JSON.parse(text);
      if (!command || typeof command !== "object" || Array.isArray(command)) throw new RequestError("Invalid command");
      const rpc = async <T,>(name: string, args: object): Promise<T> => {
        const response = await requestFetch(`${config.url}/rest/v1/rpc/${name}`, {
          method: "POST", headers: { Authorization: `Bearer ${config.serviceKey}`, apikey: config.serviceKey, "Content-Type": "application/json" },
          body: JSON.stringify(args), signal: AbortSignal.timeout(15000),
        });
        const result = await response.json();
        if (!response.ok) {
          // Database validation messages are useful; don't expose SQL details or internals.
          if (result.code === "P0001" || result.code === "42501") throw new RequestError(result.message, result.code === "42501" ? 403 : 400);
          console.error("Match command database failure", name, result.code);
          throw new RequestError("The game could not be saved. Please retry.", 503);
        }
        return result as T;
      };
      if (command.type === "form" || command.type === "start-room") {
        const room = command.type === "start-room" ? command.code : null;
        if (room !== null && (typeof room !== "string" || !/^[A-Z0-9]{6}$/.test(room))) throw new RequestError("Invalid room code");
        const game: Game = room ? "mindi" : command.game;
        const pool = room ? "casual" : command.pool;
        if (!["mindi", "gin_rummy"].includes(game) || !["casual", "ranked", "weekend"].includes(pool)) throw new RequestError("Invalid game mode");
        const party = command.party ?? null;
        if (party !== null && (typeof party !== "string" || !/^[A-Z0-9]{6}$/.test(party))) throw new RequestError("Invalid party");
        const candidate = await rpc<Candidate | null>("authority_candidates", { p_actor: user.id, p_game: game, p_pool: pool, p_party: party, p_room: room });
        if (!candidate) return respond({ result: null });
        const groups = candidate.game === "gin_rummy" && candidate.players.length === 4
          ? [candidate.players.slice(0, 2), candidate.players.slice(2, 4)] : [candidate.players];
        const tables = groups.map(players => {
          const match: AuthorityMatch = { game: candidate.game, players, state: createState(candidate.game, players),
            completed: false, deadline: Date.now() + 60000 };
          return { players, state: match.state, deadline: match.deadline, ...projectMatch(match) };
        });
        return respond({ result: await rpc<string | null>("authority_start", { p_actor: user.id, p_game: candidate.game, p_pool: candidate.pool,
          p_players: candidate.players, p_tables: tables, p_room: candidate.room, p_party: candidate.party }) });
      }
      if (command.type !== "move" || !uuid.test(command.matchId) || !Number.isSafeInteger(command.revision) || command.revision < 0) throw new RequestError("Invalid move command");
      const move = command.move as Move;
      if (!move || !["play", "draw", "discard", "forfeit", "timeout"].includes(move.type)) throw new RequestError("Unknown move");
      if ((move.type === "play" || move.type === "discard") && (!move.card || !["S","H","D","C"].includes(move.card.suit) || !Number.isInteger(move.card.rank))) throw new RequestError("Invalid card");
      if (move.type === "draw" && !["stock","discard"].includes(move.source)) throw new RequestError("Invalid draw source");
      const current = await rpc<AuthorityMatch & { revision: number }>("authority_load", { p_actor: user.id, p_match: command.matchId });
      if (current.revision !== command.revision) throw new RequestError("The table changed. Please try your move again.", 409);
      let next: AuthorityMatch;
      try { next = applyMove(current, user.id, move, Date.now()); }
      catch (error) { throw new RequestError(error instanceof Error ? error.message : "Invalid move"); }
      const projection = projectMatch(next);
      const saved = await rpc<boolean>("authority_commit", { p_actor: user.id, p_match: command.matchId, p_revision: current.revision,
        p_state: next.state, p_public: projection.publicState, p_private: projection.privateStates, p_deadline: next.deadline, p_winners: winners(next) });
      if (!saved) throw new RequestError("The table changed. Please try your move again.", 409);
      return respond({ result: true });
    } catch (error) {
      if (error instanceof RequestError) return respond({ error: error.message }, error.status);
      if (error instanceof SyntaxError) return respond({ error: "Invalid JSON" }, 400);
      console.error("Match command failed", error instanceof Error ? error.name : "unknown");
      return respond({ error: "The game server is unavailable. Please retry." }, 503);
    }
  };
}
