"use client";

// Mounted once (see MainLayout) - watches the signed-in player's own coin
// top-up requests. The server credits approvals atomically; this watcher
// only refreshes the display when a request is credited. Renders nothing.

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { watchMyTopups } from "@/lib/coinTopups";

export function CoinTopupWatcher() {
  const { user, isGuest } = useAuth();
  const { refreshBalance } = useEconomy();
  const processingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.uid || isGuest) return;
    return watchMyTopups(user.uid, (requests) => {
      for (const req of requests) {
        if (req.status !== "credited" || processingRef.current.has(req.id)) continue;
        processingRef.current.add(req.id);
        void refreshBalance().catch(() => { processingRef.current.delete(req.id); });
      }
    });
  }, [user?.uid, isGuest, refreshBalance]);

  return null;
}
