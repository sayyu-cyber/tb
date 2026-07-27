// lib/clubs.ts
//
// Clubs (guild-style groups of players) - "Add Clubs feature" from your
// list. A player can be a member of at most one club at a time, to keep
// membership simple to reason about (no multi-club leaderboards/overlap to
// juggle). Clubs are publicly browsable (like the leaderboard) so anyone can
// find and request to join one; only the owner manages membership/settings.
//
// Same no-backend, client-trusted Firestore model as the rest of this app -
// see the trust-model notes at the top of lib/matchmaking.ts and lib/rooms.ts.

import {
  collection,
  doc,
  addDoc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const CLUBS_COLLECTION = "clubs";
const MAX_MEMBERS = 30;

export interface ClubDoc {
  id: string;
  name: string;
  tag: string; // short 2-5 char badge shown next to member names
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

export async function createClub(
  ownerUid: string,
  ownerName: string,
  ownerTrophies: number,
  name: string,
  tag: string,
  description: string
): Promise<string> {
  const ref = await addDoc(collection(db, CLUBS_COLLECTION), {
    name: name.trim().slice(0, 30),
    tag: tag.trim().toUpperCase().slice(0, 5),
    description: description.trim().slice(0, 200),
    ownerUid,
    members: [ownerUid],
    memberNames: { [ownerUid]: ownerName },
    memberTrophies: { [ownerUid]: ownerTrophies },
    createdAt: Date.now(),
  });
  return ref.id;
}

/** Browsable club list, newest first - open to any signed-in user, like the leaderboard. */
export function watchClubList(onUpdate: (clubs: ClubDoc[]) => void): Unsubscribe {
  const q = query(collection(db, CLUBS_COLLECTION), orderBy("createdAt", "desc"), limit(50));
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClubDoc, "id">) })));
  });
}

/** The club a player currently belongs to, if any (a player is in at most one). */
export function watchMyClub(uid: string, onUpdate: (club: ClubDoc | null) => void): Unsubscribe {
  const q = query(collection(db, CLUBS_COLLECTION), where("members", "array-contains", uid));
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.length > 0 ? { id: snap.docs[0].id, ...(snap.docs[0].data() as Omit<ClubDoc, "id">) } : null);
  });
}

export function watchClub(clubId: string, onUpdate: (club: ClubDoc | null) => void): Unsubscribe {
  return onSnapshot(doc(db, CLUBS_COLLECTION, clubId), (snap) => {
    onUpdate(snap.exists() ? { id: snap.id, ...(snap.data() as Omit<ClubDoc, "id">) } : null);
  });
}

export async function joinClub(clubId: string, uid: string, name: string, trophies: number): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const ref = doc(db, CLUBS_COLLECTION, clubId);
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error("Club not found");
    const club = snap.data() as ClubDoc;
    if (club.members.includes(uid)) return;
    if (club.members.length >= MAX_MEMBERS) throw new Error(`This club is full (max ${MAX_MEMBERS} members)`);
    transaction.update(ref, {
      members: [...club.members, uid],
      memberNames: { ...club.memberNames, [uid]: name },
      memberTrophies: { ...club.memberTrophies, [uid]: trophies },
    });
  });
}

export async function leaveClub(clubId: string, uid: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const ref = doc(db, CLUBS_COLLECTION, clubId);
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const club = snap.data() as ClubDoc;
    const members = club.members.filter((m) => m !== uid);
    const memberNames = { ...club.memberNames };
    delete memberNames[uid];
    const memberTrophies = { ...club.memberTrophies };
    delete memberTrophies[uid];

    // Owner leaving hands ownership to the next-longest member instead of
    // orphaning the club - if nobody's left, the club becomes empty (still
    // visible, just ownerless; harmless since only the owner can manage it).
    const newOwner = club.ownerUid === uid ? members[0] : club.ownerUid;
    transaction.update(ref, { members, memberNames, memberTrophies, ...(newOwner ? { ownerUid: newOwner } : {}) });
  });
}

export async function kickMember(clubId: string, ownerUid: string, targetUid: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const ref = doc(db, CLUBS_COLLECTION, clubId);
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const club = snap.data() as ClubDoc;
    if (club.ownerUid !== ownerUid || targetUid === ownerUid) return;
    const members = club.members.filter((m) => m !== targetUid);
    const memberNames = { ...club.memberNames };
    delete memberNames[targetUid];
    const memberTrophies = { ...club.memberTrophies };
    delete memberTrophies[targetUid];
    transaction.update(ref, { members, memberNames, memberTrophies });
  });
}

export async function sendClubMessage(clubId: string, senderUid: string, senderName: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  await addDoc(collection(doc(db, CLUBS_COLLECTION, clubId), "messages"), {
    senderUid,
    senderName,
    text: trimmed,
    createdAt: Date.now(),
  });
}

export function watchClubMessages(clubId: string, onUpdate: (messages: ClubMessage[]) => void): Unsubscribe {
  const q = query(collection(doc(db, CLUBS_COLLECTION, clubId), "messages"), orderBy("createdAt", "asc"), limit(200));
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClubMessage, "id">) })));
  });
}

export async function getClub(clubId: string): Promise<ClubDoc | null> {
  const snap = await getDoc(doc(db, CLUBS_COLLECTION, clubId));
  return snap.exists() ? { id: snap.id, ...(snap.data() as Omit<ClubDoc, "id">) } : null;
}
