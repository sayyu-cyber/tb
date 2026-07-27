// lib/messages.ts
//
// Direct messages between friends (GDD "Add message feature within friends").
// Same no-backend trust model as the rest of this app: a conversation is a
// plain Firestore document both participants can read/write, with a
// `messages` subcollection for the actual chat log. There is no message
// moderation or delivery guarantee beyond what Firestore itself provides.
//
// A conversation's id is deterministic - the two participants' uids, sorted
// and joined - so both sides always land on the same document without a
// lookup step, and firestore.rules can check `request.auth.uid in
// resource.data.participants` without needing to know which side is which.

import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const CONVERSATIONS_COLLECTION = "dmConversations";

export interface DmConversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage: string;
  lastMessageAt: number;
  lastSenderUid: string;
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

/** Creates the conversation doc if it doesn't exist yet - safe to call every time a chat screen opens. */
export async function ensureConversation(
  myUid: string,
  myName: string,
  otherUid: string,
  otherName: string
): Promise<string> {
  const id = conversationIdFor(myUid, otherUid);
  const ref = doc(db, CONVERSATIONS_COLLECTION, id);
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    await setDoc(ref, {
      participants: [myUid, otherUid],
      participantNames: { [myUid]: myName, [otherUid]: otherName },
      lastMessage: "",
      lastMessageAt: Date.now(),
      lastSenderUid: "",
    });
  }
  return id;
}

export async function sendMessage(conversationId: string, senderUid: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  const ref = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  await addDoc(collection(ref, "messages"), {
    senderUid,
    text: trimmed,
    createdAt: Date.now(),
  });
  // Best-effort preview update for the conversation list - not transactional
  // with the message write above, but a stale preview by a moment is a
  // harmless cosmetic gap, not a data-integrity issue.
  await setDoc(
    ref,
    { lastMessage: trimmed, lastMessageAt: Date.now(), lastSenderUid: senderUid },
    { merge: true }
  );
}

/** Ordered oldest-to-newest, live - a plain orderBy with no other filter needs no composite index. */
export function watchMessages(conversationId: string, onUpdate: (messages: DmMessage[]) => void): Unsubscribe {
  const ref = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  const q = query(collection(ref, "messages"), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DmMessage, "id">) })));
  });
}

/**
 * All of a player's conversations, most-recently-active first. The
 * array-contains filter is required, not optional - Firestore rejects an
 * unfiltered collection query against a per-document "am I a participant"
 * rule outright, since it can't verify every possible result would pass.
 * No orderBy in the query itself (sorting by lastMessageAt client-side
 * instead) so this never needs a manually-created composite index - same
 * pattern used throughout this codebase for matchmaking/leaderboards.
 */
export function watchConversations(uid: string, onUpdate: (conversations: DmConversation[]) => void): Unsubscribe {
  const q = query(collection(db, CONVERSATIONS_COLLECTION), where("participants", "array-contains", uid));
  return onSnapshot(q, (snap) => {
    const all = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<DmConversation, "id">) }))
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    onUpdate(all);
  });
}
