"use client";

import { useState, useEffect } from "react";
import { FREE_DAILY_MATCHES, FREE_WEEKLY_MAX, VIP_DAILY_MATCHES } from "@/constants/ranks";

interface MatchLimits {
  dailyUsed: number;
  dailyTotal: number;
  dailyRemaining: number;
  weeklyUsed: number;
  weeklyTotal: number;
  weeklyRemaining: number;
  isVip: boolean;
}

export function useMatchLimits(userId?: string): MatchLimits {
  const [limits, setLimits] = useState<MatchLimits>({
    dailyUsed: 1,
    dailyTotal: FREE_DAILY_MATCHES,
    dailyRemaining: FREE_DAILY_MATCHES - 1,
    weeklyUsed: 5,
    weeklyTotal: FREE_WEEKLY_MAX,
    weeklyRemaining: FREE_WEEKLY_MAX - 5,
    isVip: false,
  });

  useEffect(() => {
    // TODO: Fetch from Firestore / localStorage
    // For now, demo values
    const stored = localStorage.getItem(`thaasbai_matches_${userId || "guest"}`);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const isVip = data.isVip || false;
        const dailyTotal = isVip ? VIP_DAILY_MATCHES : FREE_DAILY_MATCHES;
        const dailyUsed = data.dailyUsed || 0;
        const weeklyUsed = data.weeklyUsed || 0;

        setLimits({
          dailyUsed,
          dailyTotal,
          dailyRemaining: Math.max(0, dailyTotal - dailyUsed),
          weeklyUsed,
          weeklyTotal: FREE_WEEKLY_MAX,
          weeklyRemaining: Math.max(0, FREE_WEEKLY_MAX - weeklyUsed),
          isVip,
        });
      } catch {
        // keep defaults
      }
    }
  }, [userId]);

  const recordMatch = () => {
    setLimits(prev => {
      const updated = {
        ...prev,
        dailyUsed: prev.dailyUsed + 1,
        weeklyUsed: prev.weeklyUsed + 1,
      };
      localStorage.setItem(`thaasbai_matches_${userId || "guest"}`, JSON.stringify({
        dailyUsed: updated.dailyUsed,
        weeklyUsed: updated.weeklyUsed,
        isVip: prev.isVip,
        lastReset: new Date().toISOString(),
      }));
      return {
        ...updated,
        dailyRemaining: Math.max(0, prev.dailyTotal - updated.dailyUsed),
        weeklyRemaining: Math.max(0, prev.weeklyTotal - updated.weeklyUsed),
      };
    });
  };

  return { ...limits, recordMatch } as MatchLimits & { recordMatch: () => void };
}
