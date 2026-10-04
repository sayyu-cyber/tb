import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { realtimeChannelName, subscribe, toMillis, type Unsubscribe } from "@/lib/supabase/data";
import { GameType } from "@/lib/matchmaking";
import { invokeMatchCommand } from "@/lib/matchCommand";

export interface RoomDoc {
  code: string;
  gameType: GameType;
  ownerUid: string;
  /** Compatibility marker for password prompts; never contains a credential. */
  password: boolean;
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

function toRoom(row: any): RoomDoc {
  const players = (row.room_players ?? []).sort((a: any, b: any) => (a.seat_index ?? 999) - (b.seat_index ?? 999));
  return {
    code: row.code,
    gameType: row.game_type,
    ownerUid: row.owner_id,
    password: row.has_password === true,
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
    .select("code,game_type,owner_id,has_password,max_players,status,match_id,mode,mindi_mode,created_at,room_players(user_id,display_name,seat_index,joined_at),room_bans(user_id)")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data ? toRoom(data) : null;
}

export async function createRoom(_ownerUid: string, _ownerName: string, gameType: GameType, password: string | null, mode: "casual" | "rankedDuo" = "casual", mindiMode: "team2v2" | "ffa1v1" = "team2v2"): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("create_room", {
    p_game_type: gameType, p_password: password || null, p_mode: mode, p_mindi_mode: mindiMode,
  });
  if (error) throw new Error(error.message);
  if (typeof data !== "string" || !data) throw new Error("Room creation did not return a room code");
  return data;
}

export async function joinRoom(code: string, _uid: string, _displayName: string, password: string, inviteToken?: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("join_room", { p_code: code.trim().toUpperCase(), p_password: password, p_invite: inviteToken || null });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (data?.ok !== true) throw new Error("The room could not confirm your seat");
}

export async function createRoomInviteLink(code: string): Promise<string> {
  const { data, error } = await getSupabaseBrowserClient().rpc("create_room_invite_link", { p_code: code });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function setSeatOrder(code: string, _ownerUid: string, seatOrder: string[]): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("set_room_seat_order", { p_code: code.trim().toUpperCase(), p_seat_order: seatOrder });
  if (error) throw new Error(error.message);
}

export async function kickPlayer(code: string, _ownerUid: string, targetUid: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("remove_room_player", { p_code: code.trim().toUpperCase(), p_target: targetUid, p_ban: false });
  if (error) throw new Error(error.message);
}

export async function banPlayer(code: string, _ownerUid: string, targetUid: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("remove_room_player", { p_code: code.trim().toUpperCase(), p_target: targetUid, p_ban: true });
  if (error) throw new Error(error.message);
}

export async function leaveRoom(code: string, _uid: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("leave_room", { p_code: code.trim().toUpperCase(), p_close: false });
  if (error) throw new Error(error.message);
}

export async function closeRoom(code: string, _ownerUid: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("leave_room", { p_code: code.trim().toUpperCase(), p_close: true });
  if (error) throw new Error(error.message);
}

export async function startRoomMatch<TState>(code: string, _ownerUid?: string, _buildInitialState?: (orderedPlayerUids: string[]) => TState): Promise<string> {
  const matchId = await invokeMatchCommand<string | null>({ type: "start-room", code: code.trim().toUpperCase() });
  if (typeof matchId !== "string" || !matchId) throw new Error("The room could not start a match");
  return matchId;
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
