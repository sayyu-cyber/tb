import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { realtimeChannelName, subscribe, toMillis, type Unsubscribe } from "@/lib/supabase/data";
import { GameType, MatchDoc } from "@/lib/matchmaking";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface RoomDoc {
  code: string;
  gameType: GameType;
  ownerUid: string;
  password: string | null;
  maxPlayers: number;
  players: string[];
  playerNames: Record<string, string>;
  status: "waiting" | "started" | "closed";
  matchId: string | null;
  createdAt: number;
  mode?: "casual" | "rankedDuo";
  bannedUids?: string[];
  mindiMode?: "team2v2" | "ffa1v1";
  seatOrder?: string[];
}

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

function maxPlayersFor(gameType: GameType, mode: "casual" | "rankedDuo", mindiMode: "team2v2" | "ffa1v1"): number {
  if (mode === "rankedDuo") return 2;
  if (gameType === "mindi") return mindiMode === "ffa1v1" ? 2 : 4;
  return 2;
}

function toRoom(row: any): RoomDoc {
  const players = (row.room_players ?? []).sort((a: any, b: any) => (a.seat_index ?? 999) - (b.seat_index ?? 999));
  return {
    code: row.code,
    gameType: row.game_type,
    ownerUid: row.owner_id,
    password: row.password_hash,
    maxPlayers: row.max_players,
    players: players.map((player: any) => player.user_id),
    playerNames: Object.fromEntries(players.map((player: any) => [player.user_id, player.display_name || "Player"])),
    status: row.status,
    matchId: row.match_id,
    createdAt: toMillis(row.created_at),
    mode: row.mode,
    bannedUids: (row.room_bans ?? []).map((ban: any) => ban.user_id),
    mindiMode: row.mindi_mode ?? undefined,
    seatOrder: players.map((player: any) => player.user_id),
  };
}

export async function getRoom(code: string): Promise<RoomDoc | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("game_rooms")
    .select("*,room_players(user_id,display_name,seat_index,joined_at),room_bans(user_id)")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data ? toRoom(data) : null;
}

export async function createRoom(ownerUid: string, ownerName: string, gameType: GameType, password: string | null, mode: "casual" | "rankedDuo" = "casual", mindiMode: "team2v2" | "ffa1v1" = "team2v2"): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const { error } = await supabase.from("game_rooms").insert({
      code,
      game_type: gameType,
      owner_id: ownerUid,
      password_hash: password || null,
      max_players: maxPlayersFor(gameType, mode, mindiMode),
      mode,
      mindi_mode: gameType === "mindi" ? mindiMode : null,
    });
    if (error) {
      if (error.code === "23505") continue;
      throw error;
    }
    const { error: playerError } = await supabase.from("room_players").insert({ room_code: code, user_id: ownerUid, display_name: ownerName, seat_index: 0 });
    if (playerError) throw playerError;
    return code;
  }
  throw new Error("Could not generate a unique room code - please try again");
}

export async function joinRoom(code: string, uid: string, displayName: string, password: string, inviteToken?: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("join_room", { p_code: code.trim().toUpperCase(), p_password: password, p_invite: inviteToken || null });
  if (error) throw new Error(error.message);
}

export async function createRoomInviteLink(code: string): Promise<string> {
  const { data, error } = await getSupabaseBrowserClient().rpc("create_room_invite_link", { p_code: code });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function setSeatOrder(code: string, ownerUid: string, seatOrder: string[]): Promise<void> {
  const room = await getRoom(code);
  if (!room || room.ownerUid !== ownerUid) return;
  const sameSet = seatOrder.length === room.players.length && room.players.every((p) => seatOrder.includes(p));
  if (!sameSet) throw new Error("Seat order must contain exactly the current players");
  const supabase = getSupabaseBrowserClient();
  await Promise.all(seatOrder.map((uid, seatIndex) => supabase.from("room_players").update({ seat_index: seatIndex }).eq("room_code", code).eq("user_id", uid)));
}

export async function kickPlayer(code: string, ownerUid: string, targetUid: string): Promise<void> {
  const room = await getRoom(code);
  if (!room || room.ownerUid !== ownerUid || targetUid === ownerUid) return;
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("room_players").delete().eq("room_code", code).eq("user_id", targetUid);
  if (error) throw error;
}

export async function banPlayer(code: string, ownerUid: string, targetUid: string): Promise<void> {
  await kickPlayer(code, ownerUid, targetUid);
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("room_bans").upsert({ room_code: code, user_id: targetUid });
  if (error) throw error;
}

export async function leaveRoom(code: string, uid: string): Promise<void> {
  const room = await getRoom(code);
  const supabase = getSupabaseBrowserClient();
  if (room?.ownerUid === uid) {
    await supabase.from("game_rooms").update({ status: "closed" }).eq("code", code);
    return;
  }
  await supabase.from("room_players").delete().eq("room_code", code).eq("user_id", uid);
}

export async function closeRoom(code: string, ownerUid: string): Promise<void> {
  const room = await getRoom(code);
  if (!room || room.ownerUid !== ownerUid) return;
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("game_rooms").update({ status: "closed" }).eq("code", code);
  if (error) throw error;
}

export async function startRoomMatch<TState>(code: string, ownerUid: string, buildInitialState: (orderedPlayerUids: string[]) => TState): Promise<string> {
  const room = await getRoom(code);
  if (!room) throw new Error("Room not found");
  if (room.ownerUid !== ownerUid) throw new Error("Only the room owner can start the match");
  if (room.players.length !== room.maxPlayers) throw new Error("Room isn't full yet");
  const orderedPlayers = room.seatOrder && room.seatOrder.length === room.players.length ? room.seatOrder : room.players;
  const supabase = getSupabaseBrowserClient();
  const matchDoc: MatchDoc<TState> = {
    gameType: room.gameType,
    pool: room.mode === "rankedDuo" ? "ranked" : "casual",
    players: orderedPlayers,
    status: "active",
    createdAt: Date.now(),
    state: buildInitialState(orderedPlayers),
  };
  const { data: match, error } = await supabase.from("matches").insert({
    game_type: matchDoc.gameType,
    pool: matchDoc.pool,
    status: "active",
    public_state: matchDoc.state as any,
  }).select("id").single();
  if (error) throw error;
  const { error: playersError } = await supabase.from("match_players").insert(orderedPlayers.map((userId, seatIndex) => ({ match_id: match.id, user_id: userId, seat_index: seatIndex })));
  if (playersError) throw playersError;
  const { error: roomError } = await supabase.from("game_rooms").update({ status: "started", match_id: match.id }).eq("code", code);
  if (roomError) throw roomError;
  return match.id;
}

export function watchRoom(code: string, onUpdate: (room: RoomDoc | null) => void, onError?: (err: Error) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => {
    try {
      onUpdate(await getRoom(code));
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Failed to load room"));
    }
  };
  void load();
  return subscribe(supabase.channel(realtimeChannelName(`room:${code}`))
    .on("postgres_changes", { event: "*", schema: "public", table: "game_rooms", filter: `code=eq.${code}` }, load)
    .on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: `room_code=eq.${code}` }, load), onError);
}
