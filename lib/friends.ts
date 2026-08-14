// lib/friends.ts
//
// Friends (GDD Chapter 11): search for a player by name, send/accept/decline
// requests, see your friends list, and invite a friend into a private room.
//
// Design note: a friend request is a single shared document that neither
// side "owns" - either the sender or the recipient can act on it (accept,
// decline, cancel, unfriend by deleting it). This avoids ever needing one
// user to write into another user's personal document, which Firestore
// rules can't easily allow safely (same reasoning as the matchmaking queue
// and rooms).

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  limit,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GameType } from "@/lib/matchmaking";

const REQUESTS_COLLECTION = "friendRequests";
const INVITES_COLLECTION = "roomInvites";

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

export async function searchPlayers(uid: string, prefix: string): Promise<PlayerSearchResult[]> {
  const trimmed = prefix.trim();
  if (!trimmed) return [];
  const q = query(
    collection(db, "players"),
    where("displayName", ">=", trimmed),
    where("displayName", "<=", trimmed + ""),
    // Bound the read itself rather than fetching every match and slicing
    // client-side. 16 (not 15) so filtering out the caller below can't
    // leave a short page. Note this is a prefix match and Firestore range
    // queries are case-sensitive, so it finds "Sayyu" but not "sayyu".
    limit(16)
  );
  const snap = await getDocs(q);
  return snap.docs
    .filter((d) => d.id !== uid)
    .slice(0, 15)
    .map((d) => {
      const data = d.data();
      return { uid: d.id, displayName: data.displayName || "Player", trophies: data.trophies || 0 };
    });
}

/** Checks both possible directions for an existing pending/accepted request between two players. */
async function findExistingRequest(uidA: string, uidB: string): Promise<FriendRequestDoc | null> {
  const q1 = query(collection(db, REQUESTS_COLLECTION), where("from", "==", uidA), where("to", "==", uidB));
  const q2 = query(collection(db, REQUESTS_COLLECTION), where("from", "==", uidB), where("to", "==", uidA));
  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const all = [...snap1.docs, ...snap2.docs].filter((d) => d.data().status !== "declined");
  if (all.length === 0) return null;
  const d = all[0];
  return { id: d.id, ...(d.data() as Omit<FriendRequestDoc, "id">) };
}

export async function sendFriendRequest(
  fromUid: string,
  fromName: string,
  toUid: string,
  toName: string
): Promise<void> {
  if (fromUid === toUid) return;
  const existing = await findExistingRequest(fromUid, toUid);
  if (existing) return; // already friends, or a request is already pending

  await addDoc(collection(db, REQUESTS_COLLECTION), {
    from: fromUid,
    fromName,
    to: toUid,
    toName,
    status: "pending",
    createdAt: Date.now(),
  });
}

export async function respondToRequest(requestId: string, accept: boolean): Promise<void> {
  await updateDoc(doc(db, REQUESTS_COLLECTION, requestId), {
    status: accept ? "accepted" : "declined",
  });
}

export async function cancelOrRemove(requestId: string): Promise<void> {
  await deleteDoc(doc(db, REQUESTS_COLLECTION, requestId));
}

export function watchIncomingRequests(uid: string, onUpdate: (requests: FriendRequestDoc[]) => void): Unsubscribe {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    where("to", "==", uid),
    where("status", "==", "pending"),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FriendRequestDoc, "id">) })));
  });
}

export function watchOutgoingRequests(uid: string, onUpdate: (requests: FriendRequestDoc[]) => void): Unsubscribe {
  const q = query(
    collection(db, REQUESTS_COLLECTION),
    where("from", "==", uid),
    where("status", "==", "pending"),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FriendRequestDoc, "id">) })));
  });
}

export interface Friend {
  requestId: string;
  uid: string;
  name: string;
}

/** Friends = accepted requests in either direction, merged into one list. */
export function watchFriends(uid: string, onUpdate: (friends: Friend[]) => void): Unsubscribe {
  let fromResults: FriendRequestDoc[] = [];
  let toResults: FriendRequestDoc[] = [];

  const emit = () => {
    const friends: Friend[] = [
      ...fromResults.map((r) => ({ requestId: r.id, uid: r.to, name: r.toName })),
      ...toResults.map((r) => ({ requestId: r.id, uid: r.from, name: r.fromName })),
    ];
    onUpdate(friends);
  };

  const unsubFrom = onSnapshot(
    query(collection(db, REQUESTS_COLLECTION), where("from", "==", uid), where("status", "==", "accepted"), limit(250)),
    (snap) => {
      fromResults = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FriendRequestDoc, "id">) }));
      emit();
    }
  );
  const unsubTo = onSnapshot(
    query(collection(db, REQUESTS_COLLECTION), where("to", "==", uid), where("status", "==", "accepted"), limit(250)),
    (snap) => {
      toResults = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FriendRequestDoc, "id">) }));
      emit();
    }
  );

  return () => {
    unsubFrom();
    unsubTo();
  };
}

export async function sendRoomInvite(
  fromUid: string,
  fromName: string,
  toUid: string,
  code: string,
  gameType: GameType
): Promise<void> {
  await addDoc(collection(db, INVITES_COLLECTION), {
    from: fromUid,
    fromName,
    to: toUid,
    code,
    gameType,
    createdAt: Date.now(),
  });
}

export function watchRoomInvites(uid: string, onUpdate: (invites: RoomInviteDoc[]) => void): Unsubscribe {
  const q = query(collection(db, INVITES_COLLECTION), where("to", "==", uid), limit(50));
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RoomInviteDoc, "id">) })));
  });
}

export async function dismissRoomInvite(id: string): Promise<void> {
  await deleteDoc(doc(db, INVITES_COLLECTION, id));
}
