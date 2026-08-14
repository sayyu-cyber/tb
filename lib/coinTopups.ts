// lib/coinTopups.ts
//
// Coin top-up approval gate: "once customer top ups coins alert goes to
// admin panel and coin wont be credited till an admin approves." A top-up
// request is a document only the requesting player or an admin can touch;
// the admin can only flip its status (never directly credit coins into
// someone else's playerEconomy doc, since that stays owner-only per
// firestore.rules) - once a player's own client sees status flip to
// "approved", it credits its own coins locally (via EconomyContext's
// addCoins, called from the UI layer) and marks the request "credited" so
// it isn't applied twice.

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const COLLECTION = "coinTopupRequests";

export interface CoinTopupRequest {
  id: string;
  uid: string;
  playerName: string;
  coins: number;
  priceMVR: number;
  packName: string;
  status: "pending" | "approved" | "rejected" | "credited";
  createdAt: number;
  decidedAt?: number;
}

export async function requestCoinTopup(
  uid: string,
  playerName: string,
  coins: number,
  priceMVR: number,
  packName: string
): Promise<void> {
  await addDoc(collection(db, COLLECTION), {
    uid,
    playerName,
    coins,
    priceMVR,
    packName,
    status: "pending",
    createdAt: Date.now(),
  });
}

export function watchMyTopups(uid: string, onUpdate: (requests: CoinTopupRequest[]) => void): Unsubscribe {
  // A single player will never have a meaningful number of top-ups; cap it
  // so a long-lived account does not grow this listener without bound.
  const q = query(collection(db, COLLECTION), where("uid", "==", uid), limit(50));
  return onSnapshot(q, (snap) => {
    onUpdate(
      snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<CoinTopupRequest, "id">) }))
        .sort((a, b) => b.createdAt - a.createdAt)
    );
  });
}

/** Admin-only in practice (firestore.rules restricts reading every request to the admin email). */
export function watchAllTopups(onUpdate: (requests: CoinTopupRequest[]) => void): Unsubscribe {
  // Admin view: newest first, one page at a time. Without a limit this
  // re-read the entire top-up history on every single write.
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"), limit(200));
  return onSnapshot(q, (snap) => {
    onUpdate(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CoinTopupRequest, "id">) })));
  });
}

export async function decideTopup(id: string, approve: boolean): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    status: approve ? "approved" : "rejected",
    decidedAt: Date.now(),
  });
}

/** Called by the requesting player's own client once they see status === "approved". */
export async function markTopupCredited(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status: "credited" });
}
