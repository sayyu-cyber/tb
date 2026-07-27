"use client";

// Mounted once (see MainLayout) - watches the signed-in player's own coin
// top-up requests and, the moment one flips to "approved" by an admin,
// credits the coins locally via the existing addCoins() and marks the
// request "credited" so it's never applied twice. Renders nothing.

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { watchMyTopups, markTopupCredited } from "@/lib/coinTopups";

export function CoinTopupWatcher() {
  const { user, isGuest } = useAuth();
  const { addCoins } = useEconomy();
  const processingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.uid || isGuest) return;
    return watchMyTopups(user.uid, (requests) => {
      for (const req of requests) {
        if (req.status !== "approved" || processingRef.current.has(req.id)) continue;
        processingRef.current.add(req.id);
        addCoins(req.coins, "purchase", `Coin top-up approved: ${req.packName}`);
        markTopupCredited(req.id).catch(() => {});
      }
    });
  }, [user?.uid, isGuest, addCoins]);

  return null;
}
