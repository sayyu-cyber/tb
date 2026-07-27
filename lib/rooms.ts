// lib/rooms.ts
//
// Private match rooms (GDD Chapter 12): a friend creates a room and shares
// its code (and optional password); others join with that code, the owner
// kicks anyone unwanted and starts the match once full. Once started, a
// room hands off to the exact same `matches/{matchId}` document used by
// Ranked mode (lib/matchmaking.ts) - a room is just a different way to
// assemble the player list before a match begins.
//
// Same trust model/limitations as lib/matchmaking.ts: no game server, so
// this is all client-trusted Firestore reads/writes. The room code (and
// password, if set) are the only real access control - see the rules for
// the `rooms` collection in firestore.rules.

import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  collection,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GameType, MatchDoc } from "@/lib/matchmaking";

const ROOMS_COLLECTION = "rooms";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion

export interface RoomDoc {
  code: string;
  gameType: GameType;
  ownerUid: string;
  password: string | null;
  maxPlayers: number;
  players: string[];
  playerNames: Record<string, string>;
  status: "waiting" | "started" | "closed";
  matchId: string | null;
  createdAt: number;
  /** "rankedDuo" rooms are just a 2-person "bring your own partner" party
   *  formed before Ranked queueing (see lib/matchmaking.ts's
   *  tryFormDuoMatch) - not a casual private match. Defaults to "casual"
   *  for every room created before this field existed. */
  mode?: "casual" | "rankedDuo";
}

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function maxPlayersFor(gameType: GameType, mode: "casual" | "rankedDuo"): number {
  if (mode === "rankedDuo") return 2; // always just you + one partner, regardless of game
  return gameType === "mindi" ? 4 : 2;
}

export async function createRoom(
  ownerUid: string,
  ownerName: string,
  gameType: GameType,
  password: string | null,
  mode: "casual" | "rankedDuo" = "casual"
): Promise<string> {
  // Vanishingly unlikely to collide, but check anyway before committing.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const ref = doc(db, ROOMS_COLLECTION, code);
    const existing = await getDoc(ref);
    if (existing.exists()) continue;

    const room: RoomDoc = {
      code,
      gameType,
      ownerUid,
      password: password || null,
      maxPlayers: maxPlayersFor(gameType, mode),
      players: [ownerUid],
      playerNames: { [ownerUid]: ownerName },
      status: "waiting",
      matchId: null,
      createdAt: Date.now(),
      mode,
    };
    await setDoc(ref, room);
    return code;
  }
  throw new Error("Could not generate a unique room code - please try again");
}

export async function joinRoom(
  code: string,
  uid: string,
  displayName: string,
  password: string
): Promise<void> {
  const upperCode = code.trim().toUpperCase();
  await runTransaction(db, async (transaction) => {
    const ref = doc(db, ROOMS_COLLECTION, upperCode);
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error("Room not found - check the code and try again");
    const room = snap.data() as RoomDoc;

    if (room.status !== "waiting") throw new Error("This room has already started or closed");
    if (room.password && room.password !== password) throw new Error("Incorrect room password");
    if (room.players.includes(uid)) return; // already in - fine
    if (room.players.length >= room.maxPlayers) throw new Error("This room is full");

    transaction.update(ref, {
      players: [...room.players, uid],
      playerNames: { ...room.playerNames, [uid]: displayName },
    });
  });
}

export async function kickPlayer(code: string, ownerUid: string, targetUid: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const ref = doc(db, ROOMS_COLLECTION, code);
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as RoomDoc;
    if (room.ownerUid !== ownerUid || targetUid === ownerUid) return;

    const players = room.players.filter((p) => p !== targetUid);
    const playerNames = { ...room.playerNames };
    delete playerNames[targetUid];
    transaction.update(ref, { players, playerNames });
  });
}

export async function leaveRoom(code: string, uid: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const ref = doc(db, ROOMS_COLLECTION, code);
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as RoomDoc;
    if (room.ownerUid === uid) {
      transaction.update(ref, { status: "closed" });
      return;
    }
    const players = room.players.filter((p) => p !== uid);
    const playerNames = { ...room.playerNames };
    delete playerNames[uid];
    transaction.update(ref, { players, playerNames });
  });
}

export async function closeRoom(code: string, ownerUid: string): Promise<void> {
  const ref = doc(db, ROOMS_COLLECTION, code);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const room = snap.data() as RoomDoc;
  if (room.ownerUid !== ownerUid) return;
  await deleteDoc(ref).catch(async () => {
    // Rules may forbid delete depending on config - fall back to marking closed.
    await setDoc(ref, { ...room, status: "closed" });
  });
}

/**
 * Owner starts the match: builds the initial game state (same shape used by
 * Ranked matchmaking) from the room's player list and creates the shared
 * match document, then flips the room to "started" so everyone's listener
 * picks up the matchId and navigates in together.
 */
export async function startRoomMatch<TState>(
  code: string,
  ownerUid: string,
  buildInitialState: (orderedPlayerUids: string[]) => TState
): Promise<string> {
  return runTransaction(db, async (transaction) => {
    const ref = doc(db, ROOMS_COLLECTION, code);
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error("Room not found");
    const room = snap.data() as RoomDoc;
    if (room.ownerUid !== ownerUid) throw new Error("Only the room owner can start the match");
    if (room.players.length !== room.maxPlayers) throw new Error("Room isn't full yet");

    const matchRef = doc(collection(db, "matches"));
    const matchDoc: MatchDoc<TState> = {
      gameType: room.gameType,
      players: room.players,
      status: "active",
      createdAt: Date.now(),
      state: buildInitialState(room.players),
    };
    transaction.set(matchRef, matchDoc);
    transaction.update(ref, { status: "started", matchId: matchRef.id });
    return matchRef.id;
  });
}

export function watchRoom(code: string, onUpdate: (room: RoomDoc | null) => void): Unsubscribe {
  return onSnapshot(doc(db, ROOMS_COLLECTION, code), (snap) => {
    onUpdate(snap.exists() ? (snap.data() as RoomDoc) : null);
  });
}
