"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { heartbeat, HEARTBEAT_MS } from "@/lib/presence";

/**
 * No UI - keeps the signed-in player's `players/{uid}.lastSeen` fresh (see
 * lib/presence.ts) so friends can see a real "online" status. Mounted once
 * in MainLayout, same pattern as BackgroundMusicPlayer/CoinTopupWatcher.
 *
 * Skips guests: guest sessions (see AuthContext.signInAsGuest) are a local
 * uid with no real Firebase Auth session behind them, so a write here would
 * either fail firestore.rules' owner check or, worse, write to a
 * `players/{uid}` doc under an id nothing else ever reads consistently.
 */
export function PresenceHeartbeat() {
  const { user, isGuest } = useAuth();

  useEffect(() => {
    if (!user || isGuest) return;
    const uid = user.uid;

    heartbeat(uid).catch(() => {});
    const interval = setInterval(() => heartbeat(uid).catch(() => {}), HEARTBEAT_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") heartbeat(uid).catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, isGuest]);

  return null;
}
