import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { realtimeChannelName, toMillis, type Unsubscribe } from "@/lib/supabase/data";

// Each refresh supersedes older requests. Polling covers RLS-filtered deletes,
// which cannot reliably notify a client that just lost its membership.
type SocialSource = {
  table: string;
  filter?: string;
  accept?: (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => boolean;
};

export function watchSocialSnapshot<T>(key: string, tables: SocialSource[], load: () => Promise<T>, onUpdate: (value: T) => void, onError?: (err: Error) => void, cleared?: T): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  let active = true;
  let revision = 0;
  const refresh = async () => {
    const request = ++revision;
    try {
      const value = await load();
      if (active && request === revision) onUpdate(value);
    } catch (error) {
      if (active && request === revision) {
        if (cleared !== undefined) onUpdate(cleared);
        onError?.(error instanceof Error ? error : new Error("Failed to refresh social data"));
      }
    }
  };
  let channel = supabase.channel(realtimeChannelName(key));
  for (const { accept, ...source } of tables) {
    channel = channel.on("postgres_changes", { event: "*", schema: "public", ...source }, (payload) => {
      if (!accept || accept(payload)) void refresh();
    });
  }
  channel.subscribe((status, error) => {
    if (!active) return;
    if (status === "SUBSCRIBED") void refresh();
    if (status === "CHANNEL_ERROR") onError?.(error instanceof Error ? error : new Error("Realtime subscription failed"));
  });
  const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
    if (!active || (event !== "SIGNED_OUT" && event !== "SIGNED_IN")) return;
    revision++;
    if (cleared !== undefined) onUpdate(cleared);
    // Do not await a Supabase request from inside its auth callback.
    void Promise.resolve().then(() => { if (active) void refresh(); });
  });
  const onFocus = () => { void refresh(); };
  const timer = typeof window !== "undefined" ? window.setInterval(onFocus, 30_000) : undefined;
  if (typeof window !== "undefined") window.addEventListener("focus", onFocus);
  void refresh();
  return () => {
    active = false;
    revision++;
    authListener.subscription.unsubscribe();
    if (typeof window !== "undefined") {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    }
    void supabase.removeChannel(channel);
  };
}

export async function socialCommand<T = void>(action: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabaseBrowserClient().rpc("social_mutate", { p_action: action, p_payload: payload });
  if (error) throw error;
  return data as T;
}

export interface MessageCursor { createdAt: string; id: string }

export async function loadSocialMessagePage(kind: "dm" | "club", id: string, before?: MessageCursor) {
  const { data, error } = await getSupabaseBrowserClient().rpc("social_message_page", {
    p_kind: kind, p_id: id, p_before_time: before?.createdAt ?? null, p_before_id: before?.id ?? null, p_limit: 200,
  });
  if (error) throw error;
  const rows = (data ?? []) as { id: string; sender_id: string; sender_name: string; text: string; created_at: string }[];
  const oldest = rows[rows.length - 1];
  // Keep the exact database timestamp; milliseconds would lose cursor precision.
  const nextCursor = rows.length === 200 && oldest ? { createdAt: oldest.created_at, id: oldest.id } : null;
  return { rows: [...rows].reverse(), nextCursor };
}

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

export async function ensureConversation(myUid: string, _myName: string, otherUid: string, _otherName: string): Promise<string> {
  return socialCommand<string>("dm_ensure", { actor: myUid, other: otherUid });
}

export async function sendMessage(conversationId: string, senderUid: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  await socialCommand("dm_send", { id: conversationId, actor: senderUid, text: trimmed });
}

export async function markConversationRead(conversationId: string, uid: string): Promise<void> {
  await socialCommand("dm_read", { id: conversationId, actor: uid });
}

export async function loadMessagesPage(conversationId: string, before?: MessageCursor): Promise<{ messages: DmMessage[]; nextCursor: MessageCursor | null }> {
  const { rows, nextCursor } = await loadSocialMessagePage("dm", conversationId, before);
  return { messages: rows.map((row) => ({ id: row.id, senderUid: row.sender_id, text: row.text, createdAt: toMillis(row.created_at) })), nextCursor };
}

export function watchMessages(conversationId: string, onUpdate: (messages: DmMessage[]) => void, onError?: (err: Error) => void): Unsubscribe {
  return watchSocialSnapshot(`messages:${conversationId}`, [
    { table: "messages", filter: `room_id=eq.${conversationId}` },
    { table: "chat_participants", filter: `room_id=eq.${conversationId}` },
  ], async () => (await loadMessagesPage(conversationId)).messages, onUpdate, onError, []);
}

export function watchConversations(uid: string, onUpdate: (conversations: DmConversation[]) => void, onError?: (err: Error) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => {
      const { data: participantRows, error: participantsError } = await supabase.from("chat_participants").select("room_id").eq("user_id", uid).limit(100);
      if (participantsError) throw participantsError;
      const roomIds = (participantRows ?? []).map((row) => row.room_id);
      if (!roomIds.length) {
        return [];
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

      return (
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
  };
  return watchSocialSnapshot(`conversations:${uid}`, [{ table: "chat_rooms" }, { table: "chat_participants" }], load, onUpdate, onError, []);
}

