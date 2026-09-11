// lib/presence.ts
//
// "Online" status for the friends rail (components/home/FriendsRail.tsx).
// There is no realtime presence service in this app (no Realtime Database,
// no onDisconnect hooks) - what exists instead is a heartbeat: every signed
// in (non-guest) player's `players/{uid}` doc gets a fresh `lastSeen`
// timestamp every HEARTBEAT_MS while the app is open and visible (see
// components/system/PresenceHeartbeat.tsx, mounted once in MainLayout). A
// friend counts as online if their lastSeen falls inside ONLINE_WINDOW_MS.
//
// This is approximate by nature - closing the tab without a network error
// leaves the last heartbeat's timestamp in place for up to ONLINE_WINDOW_MS
// after they've actually left - but it's a real, derived signal rather than
// a fabricated status dot, which is the bar that matters here.

import { doc, onSnapshot, setDoc, Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const HEARTBEAT_MS = 45_000;
export const ONLINE_WINDOW_MS = 90_000;

export async function heartbeat(uid: string): Promise<void> {
  await setDoc(doc(db, "players", uid), { lastSeen: Date.now() }, { merge: true });
}

export function watchLastSeen(uid: string, onUpdate: (lastSeen: number | null) => void): Unsubscribe {
  return onSnapshot(doc(db, "players", uid), (snap) => {
    onUpdate(snap.exists() ? (snap.data().lastSeen as number | undefined) ?? null : null);
  });
}

export function isOnline(lastSeen: number | null): boolean {
  return lastSeen != null && Date.now() - lastSeen < ONLINE_WINDOW_MS;
}
