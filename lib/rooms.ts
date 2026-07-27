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
  /** Uids the owner has banned from this specific room code - banned
   *  players are blocked from rejoining (see joinRoom) even if they still
   *  have the code, unlike a kick which only removes them once. Defaults
   *  to [] for every room created before this field existed. */
  bannedUids?: string[];
  /** Mindi-only: "team2v2" (the default, fixed partnerships - seats 0&2 vs
   *  1&3) or "ffa1v1" (2 players, no partnership - see lib/mindiEngine.ts's
   *  teamOf(), which happens to reduce to individual scoring when only
   *  seats 0 and 1 are in play). Ignored for Gin Rummy, which is always
   *  1v1. 1v1v1/1v1v1v1 free-for-all aren't implemented yet - they'd need
   *  genuinely individual (non-team) scoring in mindiEngine.ts, not just a
   *  seat-count change, so they're deliberately deferred rather than
   *  half-shipped. */
  mindiMode?: "team2v2" | "ffa1v1";
  /** Owner-adjustable seat assignment for Team Mode - an ordering of
   *  `players` that decides who sits where (and therefore who's on which
   *  team: seats 0&2 = Team A, 1&3 = Team B) once the room is full. Falls
   *  back to `players`' join order if never set. Only meaningful for Mindi
   *  team2v2 rooms. */
  seatOrder?: string[];
}

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function maxPlayersFor(gameType: GameType, mode: "casual" | "rankedDuo", mindiMode: "team2v2" | "ffa1v1"): number {
  if (mode === "rankedDuo") return 2; // always just you + one partner, regardless of game
  if (gameType === "mindi") return mindiMode === "ffa1v1" ? 2 : 4;
  return 2;
}

export async function createRoom(
  ownerUid: string,
  ownerName: string,
  gameType: GameType,
  password: string | null,
  mode: "casual" | "rankedDuo" = "casual",
  mindiMode: "team2v2" | "ffa1v1" = "team2v2"
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
      maxPlayers: maxPlayersFor(gameType, mode, mindiMode),
      players: [ownerUid],
      playerNames: { [ownerUid]: ownerName },
      status: "waiting",
      matchId: null,
      createdAt: Date.now(),
      mode,
      bannedUids: [],
      ...(gameType === "mindi" ? { mindiMode, seatOrder: [ownerUid] } : {}),
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
    if (room.bannedUids?.includes(uid)) throw new Error("You have been banned from this room");
    if (room.password && room.password !== password) throw new Error("Incorrect room password");
    if (room.players.includes(uid)) return; // already in - fine
    if (room.players.length >= room.maxPlayers) throw new Error("This room is full");

    transaction.update(ref, {
      players: [...room.players, uid],
      playerNames: { ...room.playerNames, [uid]: displayName },
      ...(room.seatOrder ? { seatOrder: [...room.seatOrder, uid] } : {}),
    });
  });
}

/**
 * Owner rearranges who sits in which seat before starting a Mindi Team Mode
 * match - seats 0&2 become Team A, 1&3 become Team B (mindiEngine.ts's
 * teamOf()), so this is how the owner picks who's paired with whom. Must be
 * exactly the same set of uids already in the room, just reordered.
 */
export async function setSeatOrder(code: string, ownerUid: string, seatOrder: string[]): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const ref = doc(db, ROOMS_COLLECTION, code);
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as RoomDoc;
    if (room.ownerUid !== ownerUid) return;
    const sameSet =
      seatOrder.length === room.players.length &&
      room.players.every((p) => seatOrder.includes(p));
    if (!sameSet) throw new Error("Seat order must contain exactly the current players");
    transaction.update(ref, { seatOrder });
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
    const seatOrder = room.seatOrder ? room.seatOrder.filter((p) => p !== targetUid) : undefined;
    transaction.update(ref, { players, playerNames, ...(seatOrder ? { seatOrder } : {}) });
  });
}

/**
 * Like kickPlayer, but also adds the target to the room's ban list so they
 * can't simply rejoin with the same code (see joinRoom's bannedUids check).
 * The removed player finds out via their own watchRoom listener - once
 * their uid disappears from room.players while the room is still
 * "waiting", RoomLobbyClient shows them a "you were banned" screen.
 */
export async function banPlayer(code: string, ownerUid: string, targetUid: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const ref = doc(db, ROOMS_COLLECTION, code);
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const room = snap.data() as RoomDoc;
    if (room.ownerUid !== ownerUid || targetUid === ownerUid) return;

    const players = room.players.filter((p) => p !== targetUid);
    const playerNames = { ...room.playerNames };
    delete playerNames[targetUid];
    const bannedUids = Array.from(new Set([...(room.bannedUids ?? []), targetUid]));
    const seatOrder = room.seatOrder ? room.seatOrder.filter((p) => p !== targetUid) : undefined;
    transaction.update(ref, { players, playerNames, bannedUids, ...(seatOrder ? { seatOrder } : {}) });
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
    const seatOrder = room.seatOrder ? room.seatOrder.filter((p) => p !== uid) : undefined;
    transaction.update(ref, { players, playerNames, ...(seatOrder ? { seatOrder } : {}) });
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

    // Team Mode lets the owner rearrange seats (see setSeatOrder) - use
    // that order for team assignment if it's been set, otherwise fall back
    // to plain join order like before.
    const orderedPlayers =
      room.seatOrder && room.seatOrder.length === room.players.length ? room.seatOrder : room.players;

    const matchRef = doc(collection(db, "matches"));
    const matchDoc: MatchDoc<TState> = {
      gameType: room.gameType,
      players: orderedPlayers,
      status: "active",
      createdAt: Date.now(),
      state: buildInitialState(orderedPlayers),
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
