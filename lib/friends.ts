import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toMillis, type Unsubscribe } from "@/lib/supabase/data";
import { socialCommand, watchSocialSnapshot } from "@/lib/messages";
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
  const profiles: Record<string, PlayerSearchResult> = {};
  // Bound UUID filters so large friend lists stay below URL-size limits.
  for (let start = 0; start < unique.length; start += 100) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,display_name,photo_url,last_seen,ranked_progress(trophies)")
      .in("id", unique.slice(start, start + 100));
    if (error) throw error;
    for (const row of (data ?? []) as unknown as ProfileRow[]) profiles[row.id] = toSearch(row);
  }
  return profiles;
}

type RequestRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

function requestFromRow(row: RequestRow, profiles: Record<string, PlayerSearchResult>): FriendRequestDoc {
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
  const unique = [...new Set(uids)].filter(Boolean).sort();
  if (!unique.length) {
    onUpdate({});
    return () => {};
  }
  const relevant = new Set(unique);
  const accept = (field: string) => (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
    const id = payload.new?.[field] ?? payload.old?.[field];
    // Restricted delete payloads may omit the user key; polling also recovers them.
    return typeof id !== "string" || relevant.has(id);
  };
  return watchSocialSnapshot(`social-profiles:${unique.join(",")}`, [
    { table: "profiles", accept: accept("id") },
    { table: "ranked_progress", accept: accept("user_id") },
  ], () => loadProfiles(unique), onUpdate, onError, {});
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

export async function sendFriendRequest(fromUid: string, _fromName: string, toUid: string, _toName: string): Promise<void> {
  await socialCommand("friend_send", { actor: fromUid, other: toUid });
}

export async function respondToRequest(requestId: string, accept: boolean): Promise<void> {
  await socialCommand("friend_respond", { id: requestId, accept });
}

export async function cancelOrRemove(requestId: string): Promise<void> {
  await socialCommand("friend_remove", { id: requestId });
}

function watchRequests(
  key: string,
  load: () => Promise<FriendRequestDoc[]>,
  onUpdate: (requests: FriendRequestDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return watchSocialSnapshot(key, [{ table: "friend_requests" }, { table: "blocks" }], load, onUpdate, onError, []);
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
  const rows = (data ?? []) as RequestRow[];
  const profiles = await loadProfiles(rows.flatMap((row) => [row.from_user_id, row.to_user_id]));
  return rows.map((row) => requestFromRow(row, profiles));
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

export async function sendRoomInvite(fromUid: string, _fromName: string, toUid: string, code: string, _gameType: GameType): Promise<void> {
  await socialCommand("invite_send", { actor: fromUid, other: toUid, code });
}

export function watchRoomInvites(uid: string, onUpdate: (invites: RoomInviteDoc[]) => void, onError?: (err: Error) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => {
      const { data, error } = await supabase.from("room_invites").select("id,from_user_id,to_user_id,room_code,game_type,created_at").eq("to_user_id", uid).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      const profiles = await loadProfiles(((data ?? []) as any[]).map((row) => row.from_user_id));
      return (
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
  };
  return watchSocialSnapshot(`room-invites:${uid}`, [{ table: "room_invites" }, { table: "blocks" }], load, onUpdate, onError, []);
}

export async function dismissRoomInvite(id: string): Promise<void> {
  await socialCommand("invite_remove", { id });
}
