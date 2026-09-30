import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { fromMillis, realtimeChannelName, subscribe, toMillis, type Unsubscribe } from "@/lib/supabase/data";

export interface DmConversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage: string;
  lastMessageAt: number;
  lastSenderUid: string;
  lastReadAt?: Record<string, number>;
}

export interface DmMessage {
  id: string;
  senderUid: string;
  text: string;
  createdAt: number;
}

export function conversationIdFor(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("_");
}

async function roomForParticipants(uidA: string, uidB: string): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const key = conversationIdFor(uidA, uidB);
  const { data, error } = await supabase.from("chat_rooms").select("id").eq("type", "dm").eq("metadata->>dm_key", key).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function ensureConversation(myUid: string, myName: string, otherUid: string, otherName: string): Promise<string> {
  const existing = await roomForParticipants(myUid, otherUid);
  if (existing) return existing;

  const supabase = getSupabaseBrowserClient();
  const key = conversationIdFor(myUid, otherUid);
  const { data: room, error: roomError } = await supabase
    .from("chat_rooms")
    .insert({ type: "dm", metadata: { dm_key: key } })
    .select("id")
    .single();
  if (roomError) throw roomError;

  const { error: participantsError } = await supabase.from("chat_participants").insert([
    { room_id: room.id, user_id: myUid, display_name: myName },
    { room_id: room.id, user_id: otherUid, display_name: otherName },
  ]);
  if (participantsError) throw participantsError;
  return room.id;
}

export async function sendMessage(conversationId: string, senderUid: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("messages").insert({ room_id: conversationId, sender_id: senderUid, text: trimmed });
  if (error) throw error;
  const { error: updateError } = await supabase
    .from("chat_rooms")
    .update({ last_message: trimmed, last_message_at: new Date().toISOString(), last_sender_id: senderUid })
    .eq("id", conversationId);
  if (updateError) throw updateError;
}

export async function markConversationRead(conversationId: string, uid: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("chat_participants")
    .update({ last_read_at: fromMillis(Date.now()) })
    .eq("room_id", conversationId)
    .eq("user_id", uid);
  if (error) throw error;
}

export function watchMessages(conversationId: string, onUpdate: (messages: DmMessage[]) => void, onError?: (err: Error) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => {
    try {
      const { data, error } = await supabase.from("messages").select("id,sender_id,text,created_at").eq("room_id", conversationId).order("created_at", { ascending: true }).limit(200);
      if (error) throw error;
      onUpdate((data ?? []).map((row) => ({ id: row.id, senderUid: row.sender_id, text: row.text, createdAt: toMillis(row.created_at) })));
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Failed to load messages"));
    }
  };
  void load();
  return subscribe(supabase.channel(realtimeChannelName(`messages:${conversationId}`)).on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `room_id=eq.${conversationId}` }, load), onError);
}

export function watchConversations(uid: string, onUpdate: (conversations: DmConversation[]) => void, onError?: (err: Error) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => {
    try {
      const { data: participantRows, error: participantsError } = await supabase.from("chat_participants").select("room_id").eq("user_id", uid).limit(100);
      if (participantsError) throw participantsError;
      const roomIds = (participantRows ?? []).map((row) => row.room_id);
      if (!roomIds.length) {
        onUpdate([]);
        return;
      }
      const [{ data: rooms, error: roomsError }, { data: participants, error: participantsAllError }] = await Promise.all([
        supabase.from("chat_rooms").select("id,last_message,last_message_at,last_sender_id").eq("type", "dm").in("id", roomIds),
        supabase.from("chat_participants").select("room_id,user_id,display_name,last_read_at").in("room_id", roomIds),
      ]);
      if (roomsError) throw roomsError;
      if (participantsAllError) throw participantsAllError;

      const grouped = new Map<string, typeof participants>();
      for (const participant of participants ?? []) {
        grouped.set(participant.room_id, [...(grouped.get(participant.room_id) ?? []), participant]);
      }

      onUpdate(
        (rooms ?? [])
          .map((room) => {
            const people = grouped.get(room.id) ?? [];
            return {
              id: room.id,
              participants: people.map((person) => person.user_id),
              participantNames: Object.fromEntries(people.map((person) => [person.user_id, person.display_name])),
              lastMessage: room.last_message,
              lastMessageAt: toMillis(room.last_message_at),
              lastSenderUid: room.last_sender_id ?? "",
              lastReadAt: Object.fromEntries(people.filter((person) => person.last_read_at).map((person) => [person.user_id, toMillis(person.last_read_at)])),
            };
          })
          .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
      );
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Failed to load conversations"));
    }
  };
  void load();
  return subscribe(supabase.channel(realtimeChannelName(`conversations:${uid}`)).on("postgres_changes", { event: "*", schema: "public", table: "chat_rooms" }, load), onError);
}

