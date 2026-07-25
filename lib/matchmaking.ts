// lib/matchmaking.ts
//
// Shared real-player matchmaking for Ranked mode, used by both Mindi (needs
// 4 players) and Gin Rummy (needs 2). There is no dedicated game server in
// this app - matches are plain Firestore documents that every participant's
// client reads and writes directly.
//
// Known limitation (accepted for now, see PROGRESS.md): because match state
// lives in a document every player can read, a technically savvy opponent
// could inspect the raw Firestore payload and see information the UI hides
// from them (e.g. your hand). Hardening this properly would mean moving the
// authoritative game state into Cloud Functions so each player only ever
// receives their own hand - a bigger backend project, deliberately deferred.
//
// There is also a small, accepted race: if two different "completing"
// clients try to form a match from overlapping queued players at the exact
// same moment, one of the earlier-queued players can end up double-booked
// into two match documents and only ever joins the first one they see,
// leaving the other match short a player. This should be rare at low
// concurrency and is a reasonable trade-off for a Firestore-only backend.

import {
  collection,
  doc,
  deleteDoc,
  setDoc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  runTransaction,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type GameType = "mindi" | "gin_rummy";

export interface MatchDoc<TState = unknown> {
  gameType: GameType;
  players: string[]; // uids, in seat order - seat index = players.indexOf(uid)
  status: "active" | "completed";
  createdAt: number;
  state: TState;
}

const QUEUE_COLLECTION = "matchmakingQueue";
const MATCHES_COLLECTION = "matches";
const STALE_QUEUE_MS = 2 * 60 * 1000; // ignore queue entries older than this

export async function joinQueue(uid: string, gameType: GameType): Promise<void> {
  await setDoc(doc(db, QUEUE_COLLECTION, uid), {
    uid,
    gameType,
    queuedAt: Date.now(),
  });
}

export async function leaveQueue(uid: string): Promise<void> {
  await deleteDoc(doc(db, QUEUE_COLLECTION, uid)).catch(() => {
    /* already gone - fine */
  });
}

/**
 * Looks for enough other waiting players to form a match. If found, creates
 * the match document and returns its id. If not enough players are waiting
 * yet, returns null (caller should keep waiting and try again later).
 */
export async function tryFormMatch<TState>(
  uid: string,
  gameType: GameType,
  neededPlayers: number,
  buildInitialState: (orderedPlayerUids: string[]) => TState
): Promise<string | null> {
  const cutoff = Date.now() - STALE_QUEUE_MS;
  // Single equality filter only (no orderBy/limit in the query itself) so
  // this never depends on a manually-created composite index - queues are
  // small, so sorting/slicing the result client-side is cheap.
  const q = query(collection(db, QUEUE_COLLECTION), where("gameType", "==", gameType));
  const snap = await getDocs(q);
  const others = snap.docs
    .map((d) => d.data() as { uid: string; queuedAt: number })
    .filter((d) => d.uid !== uid && d.queuedAt >= cutoff)
    .sort((a, b) => a.queuedAt - b.queuedAt)
    .slice(0, neededPlayers - 1);

  if (others.length < neededPlayers - 1) {
    return null;
  }

  const orderedPlayerUids = [...others.map((o) => o.uid), uid];

  try {
    const matchId = await runTransaction(db, async (transaction) => {
      // Re-check every candidate is still actually queued (not already
      // claimed by a concurrent match) before committing to them.
      for (const other of others) {
        const ref = doc(db, QUEUE_COLLECTION, other.uid);
        const current = await transaction.get(ref);
        if (!current.exists()) {
          throw new Error("candidate-no-longer-queued");
        }
      }

      const matchRef = doc(collection(db, MATCHES_COLLECTION));
      const matchDoc: MatchDoc<TState> = {
        gameType,
        players: orderedPlayerUids,
        status: "active",
        createdAt: Date.now(),
        state: buildInitialState(orderedPlayerUids),
      };
      transaction.set(matchRef, matchDoc);
      transaction.delete(doc(db, QUEUE_COLLECTION, uid));
      return matchRef.id;
    });

    return matchId;
  } catch (err) {
    // Either a benign race (someone else grabbed a candidate first) or a
    // real problem (permission denied, missing index, etc). Log it so it's
    // at least visible in the browser console instead of failing silently.
    console.error("tryFormMatch failed:", err);
    return null;
  }
}

/**
 * Listens for a match this player has been placed into (by someone else's
 * tryFormMatch). Deliberately filters on nothing but the array-contains
 * clause in the query itself (gameType/status/recency are all checked
 * client-side afterwards) - combining array-contains with extra equality
 * filters or an orderBy needs a manually-created Firestore composite index,
 * and a signed-in player is only ever in a handful of match documents at
 * once, so filtering the small result set in JS is simpler and needs no
 * index setup at all.
 */
export function watchForMatch(
  uid: string,
  gameType: GameType,
  onFound: (matchId: string, match: MatchDoc) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const q = query(collection(db, MATCHES_COLLECTION), where("players", "array-contains", uid));
  return onSnapshot(
    q,
    (snap) => {
      const candidates = snap.docs
        .map((d) => ({ id: d.id, data: d.data() as MatchDoc }))
        .filter((m) => m.data.gameType === gameType && m.data.status === "active")
        .sort((a, b) => b.data.createdAt - a.data.createdAt);
      if (candidates.length > 0) {
        onFound(candidates[0].id, candidates[0].data);
      }
    },
    (err) => {
      console.error("watchForMatch failed:", err);
      onError?.(err);
    }
  );
}

export async function getMatch<TState>(matchId: string): Promise<MatchDoc<TState> | null> {
  const snap = await getDoc(doc(db, MATCHES_COLLECTION, matchId));
  return snap.exists() ? (snap.data() as MatchDoc<TState>) : null;
}

export function watchMatch<TState>(matchId: string, onUpdate: (match: MatchDoc<TState> | null) => void): Unsubscribe {
  return onSnapshot(doc(db, MATCHES_COLLECTION, matchId), (snap) => {
    onUpdate(snap.exists() ? (snap.data() as MatchDoc<TState>) : null);
  });
}

/** Writes new match state, only if it's still the expected player's turn (checked by the caller-supplied guard). */
export async function updateMatchState<TState>(
  matchId: string,
  updater: (current: MatchDoc<TState>) => Partial<MatchDoc<TState>> | null
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const ref = doc(db, MATCHES_COLLECTION, matchId);
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error("match-not-found");
    const current = snap.data() as MatchDoc<TState>;
    const patch = updater(current);
    if (!patch) return; // guard rejected the update (e.g. not your turn anymore)
    transaction.update(ref, patch as Record<string, unknown>);
  });
}
