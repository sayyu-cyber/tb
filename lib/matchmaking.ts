import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { realtimeChannelName, subscribe, type Unsubscribe } from "@/lib/supabase/data";
import { invokeMatchCommand } from "./matchCommand";
import type { Move } from "../server/matchAuthority";

export type GameType = "mindi" | "gin_rummy";
export type Pool = "ranked" | "weekend" | "casual";
export interface MatchDoc<TState = unknown> {
  gameType: GameType; pool?: Pool; players: string[];
  status: "active" | "completed"; createdAt: number; revision?: number; state: TState;
}
export function matchmakingErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return typeof error === "string" ? error : "Couldn't connect to matchmaking. Please try again.";
}
export async function joinQueue(_uid: string, gameType: GameType, pool: Pool = "ranked"): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("join_matchmaking_queue", { p_game_type: gameType, p_pool: pool });
  if (error) throw error;
}
export async function leaveQueue(uid: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().from("matchmaking_queue").delete().eq("user_id", uid);
  if (error) throw error;
}
export async function joinDuoQueue(_uid: string, partyId: string, gameType: GameType, pool: Pool = "ranked"): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("join_duo_queue", { p_party: partyId, p_game_type: gameType, p_pool: pool });
  if (error) throw error;
}
// Legacy deal builders are deliberately ignored; only the trusted server deals.
export async function tryFormDuoMatch<TState>(_uid: string, partyId: string, gameType: GameType,
  _build: (players: string[]) => TState, pool: Pool = "ranked"): Promise<boolean> {
  return !!await invokeMatchCommand<string | null>({ type: "form", party: partyId, game: gameType, pool });
}
export async function tryFormMatch<TState>(_uid: string, gameType: GameType, _needed: number,
  _build: (players: string[]) => TState, pool: Pool = "ranked"): Promise<string | null> {
  return invokeMatchCommand({ type: "form", game: gameType, pool });
}
export async function getMatch<TState>(matchId: string): Promise<MatchDoc<TState> | null> {
  const { data, error } = await getSupabaseBrowserClient().rpc("get_match_view", { p_match: matchId });
  if (error) throw error;
  return data as MatchDoc<TState> | null;
}
export async function sendMatchMove(matchId: string, revision: number | undefined, move: Move): Promise<void> {
  if (!Number.isSafeInteger(revision)) throw new Error("This table needs to be refreshed before playing.");
  await invokeMatchCommand({ type: "move", matchId, revision, move });
}
export async function getActiveMatchId(uid: string, gameType?: GameType, pool?: Pool): Promise<{ matchId: string; gameType: GameType } | null> {
  let query = getSupabaseBrowserClient().from("match_players")
    .select("match_id,matches!inner(game_type,pool,status,created_at)").eq("user_id", uid)
    .eq("matches.status", "active").order("created_at", { ascending: false }).limit(20);
  if (gameType) query = query.eq("matches.game_type", gameType);
  if (pool) query = query.eq("matches.pool", pool);
  const { data, error } = await query;
  if (error) throw error;
  const row = (data ?? []).find((item: any) => item.matches?.status === "active") as any;
  return row ? { matchId: row.match_id, gameType: row.matches.game_type } : null;
}
export function watchForMatch(uid: string, gameType: GameType, onFound: (id: string, match: MatchDoc) => void,
  onError?: (error: unknown) => void, pool: Pool = "ranked"): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  let stopped = false, loading = false;
  const load = async () => {
    if (stopped || loading) return;
    loading = true;
    try {
      const active = await getActiveMatchId(uid, gameType, pool);
      if (!active || stopped) return;
      const match = await getMatch(active.matchId);
      if (!stopped && match && (match.pool ?? "ranked") === pool) onFound(active.matchId, match);
    } catch (error) { if (!stopped) onError?.(error); }
    finally { loading = false; }
  };
  void load();
  const interval = setInterval(() => void load(), 2500);
  const unwatch = subscribe(supabase.channel(realtimeChannelName(`matches-for:${uid}`))
    .on("postgres_changes", { event: "*", schema: "public", table: "match_players", filter: `user_id=eq.${uid}` }, load));
  return () => { stopped = true; clearInterval(interval); unwatch(); };
}
export function watchMatch<TState>(matchId: string, onUpdate: (match: MatchDoc<TState> | null) => void,
  onError?: (error: Error) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  let stopped = false, loading = false, requested = false, lastRevision = -1;
  const load = async () => {
    if (stopped) return;
    if (loading) { requested = true; return; }
    loading = true;
    try {
      const match = await getMatch<TState>(matchId);
      if (stopped) return;
      if (!match || (match.revision ?? 0) >= lastRevision) {
        lastRevision = match?.revision ?? 0;
        onUpdate(match);
      }
      const deadline = (match?.state as { turnDeadline?: number } | undefined)?.turnDeadline;
      // Either participant can request expiry. Server time and revision decide it.
      if (match?.status === "active" && deadline && deadline <= Date.now()) {
        try {
          await sendMatchMove(matchId, match.revision, { type: "timeout" });
          requested = true;
        } catch { /* A racing move or clock skew is reconciled by the next snapshot. */ }
      }
    } catch (error) { if (!stopped) onError?.(error instanceof Error ? error : new Error(matchmakingErrorMessage(error))); }
    finally {
      loading = false;
      if (requested && !stopped) { requested = false; void load(); }
    }
  };
  void load();
  const interval = setInterval(() => void load(), 3000);
  const unwatch = subscribe(supabase.channel(realtimeChannelName(`match:${matchId}`))
    .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, load), onError);
  const resume = () => { if (document.visibilityState === "visible") void load(); };
  document.addEventListener("visibilitychange", resume);
  return () => { stopped = true; clearInterval(interval); unwatch(); document.removeEventListener("visibilitychange", resume); };
}
