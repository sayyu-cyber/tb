import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { realtimeChannelName, subscribe, toMillis, type Unsubscribe } from "@/lib/supabase/data";

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

export async function createClub(ownerUid: string, ownerName: string, ownerTrophies: number, name: string, tag: string, description: string): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("clubs")
    .insert({
      name: name.trim().slice(0, 30),
      tag: tag.trim().toUpperCase().slice(0, 5),
      description: description.trim().slice(0, 200),
      owner_id: ownerUid,
    })
    .select("id")
    .single();
  if (error) throw error;
  const { error: memberError } = await supabase.from("club_members").insert({
    club_id: data.id,
    user_id: ownerUid,
    display_name: ownerName,
    trophies: ownerTrophies,
    role: "owner",
  });
  if (memberError) throw memberError;
  return data.id;
}

export function watchClubList(onUpdate: (clubs: ClubDoc[]) => void, onError?: (err: Error) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => {
    try {
      const { data, error } = await supabase
        .from("clubs")
        .select("id,name,tag,description,owner_id,created_at,club_members(user_id,display_name,trophies,joined_at)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      onUpdate((data ?? []).map(toClub));
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Failed to load clubs"));
    }
  };
  void load();
  return subscribe(supabase.channel(realtimeChannelName("clubs:list")).on("postgres_changes", { event: "*", schema: "public", table: "clubs" }, load), onError);
}

export function watchMyClub(uid: string, onUpdate: (club: ClubDoc | null) => void, onError?: (err: Error) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => {
    try {
      const { data, error } = await supabase.from("club_members").select("club_id").eq("user_id", uid).maybeSingle();
      if (error) throw error;
      onUpdate(data?.club_id ? await selectClubById(data.club_id) : null);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Failed to load your club"));
    }
  };
  void load();
  return subscribe(supabase.channel(realtimeChannelName(`club-member:${uid}`)).on("postgres_changes", { event: "*", schema: "public", table: "club_members" }, load), onError);
}

export function watchClub(clubId: string, onUpdate: (club: ClubDoc | null) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => onUpdate(await selectClubById(clubId));
  void load().catch(console.error);
  return subscribe(supabase.channel(realtimeChannelName(`club:${clubId}`)).on("postgres_changes", { event: "*", schema: "public", table: "club_members", filter: `club_id=eq.${clubId}` }, load));
}

export async function joinClub(clubId: string, uid: string, name: string, trophies: number): Promise<void> {
  const club = await selectClubById(clubId);
  if (!club) throw new Error("Club not found");
  if (club.members.includes(uid)) return;
  if (club.members.length >= MAX_MEMBERS) throw new Error(`This club is full (max ${MAX_MEMBERS} members)`);
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("club_members").insert({ club_id: clubId, user_id: uid, display_name: name, trophies });
  if (error) throw error;
}

export async function leaveClub(clubId: string, uid: string): Promise<void> {
  const club = await selectClubById(clubId);
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("club_members").delete().eq("club_id", clubId).eq("user_id", uid);
  if (error) throw error;
  if (club?.ownerUid === uid) {
    const nextOwner = club.members.find((member) => member !== uid) ?? null;
    await supabase.from("clubs").update({ owner_id: nextOwner }).eq("id", clubId);
  }
}

export async function kickMember(clubId: string, ownerUid: string, targetUid: string): Promise<void> {
  const club = await selectClubById(clubId);
  if (!club || club.ownerUid !== ownerUid || targetUid === ownerUid) return;
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("club_members").delete().eq("club_id", clubId).eq("user_id", targetUid);
  if (error) throw error;
}

export async function sendClubMessage(clubId: string, senderUid: string, senderName: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("club_messages").insert({ club_id: clubId, sender_id: senderUid, sender_name: senderName, text: trimmed });
  if (error) throw error;
}

export function watchClubMessages(clubId: string, onUpdate: (messages: ClubMessage[]) => void, onError?: (error: Error) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => {
    try {
      const { data, error } = await supabase.from("club_messages").select("id,sender_id,sender_name,text,created_at").eq("club_id", clubId).order("created_at", { ascending: true }).limit(200);
      if (error) throw error;
      onUpdate((data ?? []).map((row: any) => ({ id: row.id, senderUid: row.sender_id, senderName: row.sender_name, text: row.text, createdAt: toMillis(row.created_at) })));
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Failed to load club messages"));
    }
  };
  void load();
  return subscribe(supabase.channel(realtimeChannelName(`club-messages:${clubId}`)).on("postgres_changes", { event: "*", schema: "public", table: "club_messages", filter: `club_id=eq.${clubId}` }, load), onError);
}

export async function getClub(clubId: string): Promise<ClubDoc | null> {
  return selectClubById(clubId);
}

