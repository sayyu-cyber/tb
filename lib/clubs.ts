import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toMillis, type Unsubscribe } from "@/lib/supabase/data";
import { loadSocialMessagePage, socialCommand, watchSocialSnapshot, type MessageCursor } from "@/lib/messages";

export const MAX_MEMBERS = 30;

export interface ClubDoc {
  id: string;
  name: string;
  tag: string;
  description: string;
  ownerUid: string;
  members: string[];
  memberNames: Record<string, string>;
  memberTrophies: Record<string, number>;
  createdAt: number;
}

export interface ClubMessage {
  id: string;
  senderUid: string;
  senderName: string;
  text: string;
  createdAt: number;
}

function toClub(row: any): ClubDoc {
  const members = row.club_members ?? [];
  return {
    id: row.id,
    name: row.name,
    tag: row.tag,
    description: row.description,
    ownerUid: row.owner_id ?? "",
    members: members.map((member: any) => member.user_id),
    memberNames: Object.fromEntries(members.map((member: any) => [member.user_id, member.display_name || "Player"])),
    memberTrophies: Object.fromEntries(members.map((member: any) => [member.user_id, member.trophies || 0])),
    createdAt: toMillis(row.created_at),
  };
}

async function selectClubById(clubId: string): Promise<ClubDoc | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("clubs")
    .select("id,name,tag,description,owner_id,created_at,club_members(user_id,display_name,trophies,joined_at)")
    .eq("id", clubId)
    .maybeSingle();
  if (error) throw error;
  return data ? toClub(data) : null;
}

export async function createClub(ownerUid: string, _ownerName: string, _ownerTrophies: number, name: string, tag: string, description: string): Promise<string> {
  return socialCommand<string>("club_create", { actor: ownerUid, name: name.trim().slice(0, 30), tag: tag.trim().toUpperCase().slice(0, 5), description: description.trim().slice(0, 200) });
}

export function watchClubList(onUpdate: (clubs: ClubDoc[]) => void, onError?: (err: Error) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id,name,tag,description,owner_id,created_at,club_members(user_id,display_name,trophies,joined_at)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map(toClub);
  };
  return watchSocialSnapshot("clubs:list", [{ table: "clubs" }, { table: "club_members" }], load, onUpdate, onError, []);
}

export function watchMyClub(uid: string, onUpdate: (club: ClubDoc | null) => void, onError?: (err: Error) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => {
      const { data, error } = await supabase.from("club_members").select("club_id").eq("user_id", uid).maybeSingle();
      if (error) throw error;
      return data?.club_id ? await selectClubById(data.club_id) : null;
  };
  return watchSocialSnapshot(`club-member:${uid}`, [{ table: "club_members" }, { table: "clubs" }], load, onUpdate, onError, null);
}

export function watchClub(clubId: string, onUpdate: (club: ClubDoc | null) => void, onError?: (err: Error) => void): Unsubscribe {
  return watchSocialSnapshot(`club:${clubId}`, [{ table: "club_members", filter: `club_id=eq.${clubId}` }, { table: "clubs", filter: `id=eq.${clubId}` }], () => selectClubById(clubId), onUpdate, onError, null);
}

export async function joinClub(clubId: string, uid: string, _name: string, _trophies: number): Promise<void> {
  await socialCommand("club_join", { id: clubId, actor: uid });
}

export async function leaveClub(clubId: string, uid: string): Promise<void> {
  await socialCommand("club_leave", { id: clubId, actor: uid });
}

export async function kickMember(clubId: string, ownerUid: string, targetUid: string): Promise<void> {
  await socialCommand("club_kick", { id: clubId, actor: ownerUid, other: targetUid });
}

export async function transferClubOwnership(clubId: string, ownerUid: string, targetUid: string): Promise<void> {
  await socialCommand("club_transfer", { id: clubId, actor: ownerUid, other: targetUid });
}

export async function sendClubMessage(clubId: string, senderUid: string, _senderName: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  await socialCommand("club_send", { id: clubId, actor: senderUid, text: trimmed });
}

export async function loadClubMessagesPage(clubId: string, before?: MessageCursor): Promise<{ messages: ClubMessage[]; nextCursor: MessageCursor | null }> {
  const { rows, nextCursor } = await loadSocialMessagePage("club", clubId, before);
  return { messages: rows.map((row) => ({ id: row.id, senderUid: row.sender_id, senderName: row.sender_name, text: row.text, createdAt: toMillis(row.created_at) })), nextCursor };
}

export function watchClubMessages(clubId: string, onUpdate: (messages: ClubMessage[]) => void, onError?: (error: Error) => void): Unsubscribe {
  return watchSocialSnapshot(`club-messages:${clubId}`, [{ table: "club_messages", filter: `club_id=eq.${clubId}` }, { table: "club_members", filter: `club_id=eq.${clubId}` }], async () => (await loadClubMessagesPage(clubId)).messages, onUpdate, onError, []);
}

export async function getClub(clubId: string): Promise<ClubDoc | null> {
  return selectClubById(clubId);
}

