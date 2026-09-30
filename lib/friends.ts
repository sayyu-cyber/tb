import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { realtimeChannelName, subscribe, toMillis, type Unsubscribe } from "@/lib/supabase/data";
import { GameType } from "@/lib/matchmaking";
import { looksLikePlayerCode, normalizePlayerCode } from "@/lib/playerCode";

export interface FriendRequestDoc {
  id: string;
  from: string;
  fromName: string;
  to: string;
  toName: string;
  status: "pending" | "accepted" | "declined";
  createdAt: number;
}

export interface PlayerSearchResult {
  uid: string;
  displayName: string;
  trophies: number;
  photoURL?: string;
  lastSeen?: number;
}

export interface RecentPlayer extends PlayerSearchResult {
  playedAt: number;
  gameType: GameType;
}

export interface RoomInviteDoc {
  id: string;
  from: string;
  fromName: string;
  to: string;
  code: string;
  gameType: GameType;
  createdAt: number;
}

export interface Friend {
  requestId: string;
  uid: string;
  name: string;
}

type ProfileRow = {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  last_seen: string | null;
  ranked_progress?: { trophies: number | null } | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function toSearch(row: ProfileRow): PlayerSearchResult {
  const ranked = one(row.ranked_progress);
  return {
    uid: row.id,
    displayName: row.display_name || "Player",
    trophies: ranked?.trophies ?? 0,
    photoURL: row.photo_url ?? undefined,
    lastSeen: toMillis(row.last_seen) || undefined,
  };
}

async function loadProfiles(ids: string[]): Promise<Record<string, PlayerSearchResult>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return {};
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,display_name,photo_url,last_seen,ranked_progress(trophies)")
    .in("id", unique);
  if (error) throw error;
  return Object.fromEntries(((data ?? []) as unknown as ProfileRow[]).map((row) => [row.id, toSearch(row)]));
}

async function requestFromRow(row: {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}): Promise<FriendRequestDoc> {
  const profiles = await loadProfiles([row.from_user_id, row.to_user_id]);
  return {
    id: row.id,
    from: row.from_user_id,
    fromName: profiles[row.from_user_id]?.displayName ?? "Player",
    to: row.to_user_id,
    toName: profiles[row.to_user_id]?.displayName ?? "Player",
    status: row.status,
    createdAt: toMillis(row.created_at),
  };
}

export function watchSocialProfiles(
  uids: string[],
  onUpdate: (profiles: Record<string, PlayerSearchResult>) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const unique = [...new Set(uids)];
  const load = async () => {
    try {
      onUpdate(await loadProfiles(unique));
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Failed to load profiles"));
    }
  };
  void load();
  return subscribe(supabase.channel(realtimeChannelName(`social-profiles:${unique.join(",")}`)).on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load), onError);
}

export async function getFriendSuggestions(uid: string): Promise<PlayerSearchResult[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,display_name,photo_url,last_seen,ranked_progress(trophies)")
    .neq("id", uid)
    .order("last_seen", { ascending: false, nullsFirst: false })
    .limit(20);
  if (error) throw error;
  return ((data ?? []) as unknown as ProfileRow[]).map(toSearch);
}

export async function getRecentPlayers(uid: string): Promise<RecentPlayer[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("match_players")
    .select("match_id,created_at,matches(game_type,created_at),matches!inner(match_players(user_id))")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) throw error;
  const recent = new Map<string, { playedAt: number; gameType: GameType }>();
  for (const row of (data ?? []) as any[]) {
    const match = row.matches;
    for (const player of match?.match_players ?? []) {
      if (player.user_id !== uid && !recent.has(player.user_id)) {
        recent.set(player.user_id, { playedAt: toMillis(match.created_at), gameType: match.game_type });
      }
    }
  }
  const profiles = await loadProfiles(Array.from(recent.keys()));
  return Object.entries(profiles)
    .map(([id, profile]) => ({ ...profile, ...recent.get(id)! }))
    .sort((a, b) => b.playedAt - a.playedAt);
}

export async function searchPlayers(uid: string, prefix: string): Promise<PlayerSearchResult[]> {
  const trimmed = prefix.trim();
  if (!trimmed) return [];
  const supabase = getSupabaseBrowserClient();
  const code = normalizePlayerCode(trimmed);
  const query = supabase
    .from("profiles")
    .select("id,display_name,photo_url,last_seen,ranked_progress(trophies)")
    .neq("id", uid)
    .limit(16);
  const { data, error } = looksLikePlayerCode(trimmed)
    ? await query.eq("player_code", code)
    : await query.ilike("display_name", `${trimmed}%`);
  if (error) throw error;
  return ((data ?? []) as unknown as ProfileRow[]).map(toSearch).slice(0, 15);
}

async function findExistingRequest(uidA: string, uidB: string): Promise<FriendRequestDoc | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id,from_user_id,to_user_id,status,created_at")
    .or(`and(from_user_id.eq.${uidA},to_user_id.eq.${uidB}),and(from_user_id.eq.${uidB},to_user_id.eq.${uidA})`)
    .neq("status", "declined")
    .limit(1);
  if (error) throw error;
  return data?.[0] ? requestFromRow(data[0] as any) : null;
}

export async function sendFriendRequest(fromUid: string, _fromName: string, toUid: string, _toName: string): Promise<void> {
  if (fromUid === toUid) return;
  if (await findExistingRequest(fromUid, toUid)) return;
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("friend_requests").insert({ from_user_id: fromUid, to_user_id: toUid });
  if (error) throw error;
}

export async function respondToRequest(requestId: string, accept: boolean): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: accept ? "accepted" : "declined", updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) throw error;
}

export async function cancelOrRemove(requestId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("friend_requests").delete().eq("id", requestId);
  if (error) throw error;
}

function watchRequests(
  key: string,
  load: () => Promise<FriendRequestDoc[]>,
  onUpdate: (requests: FriendRequestDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const run = async () => {
    try {
      onUpdate(await load());
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Failed to load friend requests"));
    }
  };
  void run();
  return subscribe(supabase.channel(realtimeChannelName(key)).on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, run), onError);
}

async function loadRequests(column: "from_user_id" | "to_user_id", uid: string, status: "pending" | "accepted"): Promise<FriendRequestDoc[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id,from_user_id,to_user_id,status,created_at")
    .eq(column, uid)
    .eq("status", status)
    .limit(250);
  if (error) throw error;
  return Promise.all(((data ?? []) as any[]).map(requestFromRow));
}

export function watchIncomingRequests(uid: string, onUpdate: (requests: FriendRequestDoc[]) => void, onError?: (err: Error) => void): Unsubscribe {
  return watchRequests(`incoming:${uid}`, () => loadRequests("to_user_id", uid, "pending"), onUpdate, onError);
}

export function watchOutgoingRequests(uid: string, onUpdate: (requests: FriendRequestDoc[]) => void, onError?: (err: Error) => void): Unsubscribe {
  return watchRequests(`outgoing:${uid}`, () => loadRequests("from_user_id", uid, "pending"), onUpdate, onError);
}

export function watchFriends(uid: string, onUpdate: (friends: Friend[]) => void, onError?: (err: Error) => void): Unsubscribe {
  return watchRequests(
    `friends:${uid}`,
    async () => [...(await loadRequests("from_user_id", uid, "accepted")), ...(await loadRequests("to_user_id", uid, "accepted"))],
    (requests) => {
      onUpdate(
        requests.map((request) =>
          request.from === uid
            ? { requestId: request.id, uid: request.to, name: request.toName }
            : { requestId: request.id, uid: request.from, name: request.fromName }
        )
      );
    },
    onError
  );
}

export async function sendRoomInvite(fromUid: string, _fromName: string, toUid: string, code: string, gameType: GameType): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("room_invites").insert({ from_user_id: fromUid, to_user_id: toUid, room_code: code, game_type: gameType });
  if (error) throw error;
}

export function watchRoomInvites(uid: string, onUpdate: (invites: RoomInviteDoc[]) => void, onError?: (err: Error) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => {
    try {
      const { data, error } = await supabase.from("room_invites").select("id,from_user_id,to_user_id,room_code,game_type,created_at").eq("to_user_id", uid).limit(50);
      if (error) throw error;
      const profiles = await loadProfiles(((data ?? []) as any[]).map((row) => row.from_user_id));
      onUpdate(
        ((data ?? []) as any[]).map((row) => ({
          id: row.id,
          from: row.from_user_id,
          fromName: profiles[row.from_user_id]?.displayName ?? "Player",
          to: row.to_user_id,
          code: row.room_code,
          gameType: row.game_type,
          createdAt: toMillis(row.created_at),
        }))
      );
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Failed to load room invites"));
    }
  };
  void load();
  return subscribe(supabase.channel(realtimeChannelName(`room-invites:${uid}`)).on("postgres_changes", { event: "*", schema: "public", table: "room_invites" }, load), onError);
}

export async function dismissRoomInvite(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("room_invites").delete().eq("id", id);
  if (error) throw error;
}
