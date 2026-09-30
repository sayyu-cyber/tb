import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { realtimeChannelName, subscribe, toMillis, type Unsubscribe } from "@/lib/supabase/data";

export type GameType = "mindi" | "gin_rummy";
export type Pool = "ranked" | "weekend" | "casual";

export interface MatchDoc<TState = unknown> {
  gameType: GameType;
  pool?: Pool;
  players: string[];
  status: "active" | "completed";
  createdAt: number;
  state: TState;
}

const STALE_QUEUE_MS = 2 * 60 * 1000;

/** PostgREST errors are plain objects, so String(error) hides their message. */
export function matchmakingErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return typeof error === "string" ? error : "Couldn't connect to matchmaking. Please try again.";
}

async function matchFromRow<TState>(row: any): Promise<MatchDoc<TState>> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("match_players")
    .select("user_id,seat_index")
    .eq("match_id", row.id)
    .order("seat_index", { ascending: true });
  if (error) throw error;
  return {
    gameType: row.game_type,
    pool: row.pool,
    players: (data ?? []).map((player: any) => player.user_id),
    status: row.status,
    createdAt: toMillis(row.created_at),
    state: row.public_state as TState,
  };
}

async function createMatch<TState>(players: string[], gameType: GameType, pool: Pool, state: TState): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data: match, error } = await supabase
    .from("matches")
    .insert({ game_type: gameType, pool, status: "active", public_state: state as any })
    .select("id")
    .single();
  if (error) throw error;
  const { error: playersError } = await supabase.from("match_players").insert(
    players.map((userId, seatIndex) => ({ match_id: match.id, user_id: userId, seat_index: seatIndex }))
  );
  if (playersError) throw playersError;
  return match.id;
}

export async function joinQueue(uid: string, gameType: GameType, pool: Pool = "ranked"): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("join_matchmaking_queue", { p_game_type: gameType, p_pool: pool });
  if (error) throw error;
}

export async function leaveQueue(uid: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("matchmaking_queue").delete().eq("user_id", uid);
  if (error) throw error;
}

export async function joinDuoQueue(uid: string, partyId: string, gameType: GameType, pool: Pool = "ranked"): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("matchmaking_queue").upsert({ user_id: uid, game_type: gameType, pool, party_id: partyId });
  if (error) throw error;
}

export async function tryFormDuoMatch<TState>(
  myUid: string,
  partyId: string,
  gameType: GameType,
  buildInitialState: (players: string[]) => TState,
  pool: Pool = "ranked"
): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  const cutoff = new Date(Date.now() - STALE_QUEUE_MS).toISOString();
  const { data, error } = await supabase
    .from("matchmaking_queue")
    .select("user_id,party_id,queued_at")
    .eq("game_type", gameType)
    .eq("pool", pool)
    .gte("queued_at", cutoff);
  if (error) throw error;
  const entries = (data ?? []).filter((entry: any) => entry.party_id);
  const myDuo = entries.filter((entry: any) => entry.party_id === partyId).slice(0, 2).map((entry: any) => entry.user_id);
  if (myDuo.length < 2) return false;
  const otherParty = entries.find((entry: any) => entry.party_id !== partyId)?.party_id;
  if (!otherParty) return false;
  const theirDuo = entries.filter((entry: any) => entry.party_id === otherParty).slice(0, 2).map((entry: any) => entry.user_id);
  if (theirDuo.length < 2) return false;

  if (gameType === "mindi") {
    const players = [myDuo[0], theirDuo[0], myDuo[1], theirDuo[1]];
    await createMatch(players, gameType, pool, buildInitialState(players));
  } else {
    for (const players of [[myDuo[0], theirDuo[0]], [myDuo[1], theirDuo[1]]]) {
      await createMatch(players, gameType, pool, buildInitialState(players));
    }
  }
  await supabase.from("matchmaking_queue").delete().in("user_id", [...myDuo, ...theirDuo]);
  return true;
}

export async function tryFormMatch<TState>(
  uid: string,
  gameType: GameType,
  neededPlayers: number,
  buildInitialState: (orderedPlayerUids: string[]) => TState,
  pool: Pool = "ranked"
): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data: queued, error: refreshError } = await supabase.rpc("refresh_matchmaking_queue", { p_game_type: gameType, p_pool: pool });
  if (refreshError) throw refreshError;
  if (!queued) return null;
  const cutoff = new Date(Date.now() - STALE_QUEUE_MS).toISOString();
  const { data, error } = await supabase
    .from("matchmaking_queue")
    .select("user_id,queued_at")
    .eq("game_type", gameType)
    .eq("pool", pool)
    .is("party_id", null)
    .gte("heartbeat_at", cutoff)
    .order("queued_at", { ascending: true });
  if (error) throw error;
  if (!(data ?? []).some((entry: any) => entry.user_id === uid)) return null;
  const others = (data ?? []).filter((entry: any) => entry.user_id !== uid).slice(0, neededPlayers - 1).map((entry: any) => entry.user_id);
  if (others.length < neededPlayers - 1) return null;
  const players = [...others, uid];
  const { data: matchId, error: matchError } = await supabase.rpc("try_form_match", {
    p_game_type: gameType, p_pool: pool, p_players: players, p_state: buildInitialState(players),
  });
  if (matchError) throw matchError;
  return matchId as string | null;
}

export function watchForMatch(uid: string, gameType: GameType, onFound: (matchId: string, match: MatchDoc) => void, onError?: (err: unknown) => void, pool: Pool = "ranked"): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  let stopped = false;
  let loading = false;
  const load = async () => {
    if (stopped || loading) return;
    loading = true;
    try {
      const active = await getActiveMatchId(uid, gameType, pool);
      if (!active || stopped) return;
      const match = await getMatch(active.matchId);
      if (!stopped && match && (match.pool ?? "ranked") === pool) onFound(active.matchId, match);
    } catch (error) {
      if (!stopped) onError?.(error);
    } finally {
      loading = false;
    }
  };
  void load();
  // Discovery must also work when Realtime reconnects or misses an INSERT.
  const interval = setInterval(() => void load(), 2500);
  const unwatch = subscribe(supabase.channel(realtimeChannelName(`matches-for:${uid}`)).on("postgres_changes", { event: "*", schema: "public", table: "match_players", filter: `user_id=eq.${uid}` }, load));
  return () => { stopped = true; clearInterval(interval); unwatch(); };
}

export async function getMatch<TState>(matchId: string): Promise<MatchDoc<TState> | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
  if (error) throw error;
  return data ? matchFromRow<TState>(data) : null;
}

export async function getActiveMatchId(uid: string, gameType?: GameType, pool?: Pool): Promise<{ matchId: string; gameType: GameType } | null> {
  const supabase = getSupabaseBrowserClient();
  let query = supabase
    .from("match_players")
    .select("match_id,matches!inner(game_type,pool,status,created_at)")
    .eq("user_id", uid)
    .eq("matches.status", "active")
    .order("created_at", { ascending: false })
    .limit(20);
  if (gameType) query = query.eq("matches.game_type", gameType);
  if (pool) query = query.eq("matches.pool", pool);
  const { data, error } = await query;
  if (error) throw error;
  const row = (data ?? []).find((item: any) => item.matches?.status === "active") as any;
  return row ? { matchId: row.match_id, gameType: row.matches.game_type } : null;
}

export function watchMatch<TState>(matchId: string, onUpdate: (match: MatchDoc<TState> | null) => void, onError?: (err: Error) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => {
    try {
      onUpdate(await getMatch<TState>(matchId));
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Failed to load match"));
    }
  };
  void load();
  return subscribe(supabase.channel(realtimeChannelName(`match:${matchId}`)).on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, load), onError);
}

export async function updateMatchState<TState>(matchId: string, updater: (current: MatchDoc<TState>) => Partial<MatchDoc<TState>> | null): Promise<void> {
  const current = await getMatch<TState>(matchId);
  if (!current) throw new Error("match-not-found");
  const patch = updater(current);
  if (!patch) return;
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("matches")
    .update({
      ...(patch.status ? { status: patch.status, completed_at: patch.status === "completed" ? new Date().toISOString() : null } : {}),
      ...(patch.state !== undefined ? { public_state: patch.state as any } : {}),
    })
    .eq("id", matchId);
  if (error) throw error;
}
