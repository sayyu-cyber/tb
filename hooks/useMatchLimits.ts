"use client";

import { useEffect, useState } from "react";
import { FREE_DAILY_MATCHES, FREE_WEEKLY_MAX, VIP_DAILY_MATCHES } from "@/constants/ranks";
import { useEconomy } from "@/contexts/EconomyContext";
import { getWeekStartKey } from "@/lib/trophyUpdates";

interface MatchLimits {
  dailyUsed: number;
  dailyTotal: number;
  dailyRemaining: number;
  weeklyUsed: number;
  weeklyTotal: number;
  weeklyRemaining: number;
  isVip: boolean;
}

function getDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Tracks how many ranked/Weekend League matches a player has queued into
 * today and this week, for the daily/weekly free-tier caps (GDD Beta:
 * FREE_DAILY_MATCHES / FREE_WEEKLY_MAX, raised for VIP).
 *
 * Two bugs fixed here:
 * 1. Counters never reset - once a player used their 3 free daily matches,
 *    `dailyUsed` stayed at that number in localStorage forever, since
 *    nothing ever compared "today" to the day the count was recorded.
 *    Now compares against the current day key (and the current week key,
 *    shared with lib/trophyUpdates.ts's Weekend League week logic) and
 *    resets to zero whenever they don't match.
 * 2. `isVip` was its own separate localStorage field that nothing ever
 *    set to true - so VIP players never actually got the higher daily
 *    cap. It now reads real VIP status from EconomyContext.
 */
export function useMatchLimits(userId?: string): MatchLimits & { recordMatch: () => void } {
  const { state } = useEconomy();
  const isVip = state.profile.vip.active;
  const dailyTotal = isVip ? VIP_DAILY_MATCHES : FREE_DAILY_MATCHES;

  const [counts, setCounts] = useState({ dailyUsed: 0, weeklyUsed: 0 });

  useEffect(() => {
    const key = `thaasbai_matches_${userId || "guest"}`;
    const today = getDayKey();
    const thisWeek = getWeekStartKey();
    let dailyUsed = 0;
    let weeklyUsed = 0;

    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        dailyUsed = data.lastDay === today ? data.dailyUsed || 0 : 0;
        weeklyUsed = data.lastWeek === thisWeek ? data.weeklyUsed || 0 : 0;
      } catch {
        // keep zeros
      }
    }

    localStorage.setItem(key, JSON.stringify({ dailyUsed, weeklyUsed, lastDay: today, lastWeek: thisWeek }));
    setCounts({ dailyUsed, weeklyUsed });
  }, [userId]);

  const recordMatch = () => {
    const key = `thaasbai_matches_${userId || "guest"}`;
    const today = getDayKey();
    const thisWeek = getWeekStartKey();
    setCounts((prev) => {
      const updated = { dailyUsed: prev.dailyUsed + 1, weeklyUsed: prev.weeklyUsed + 1 };
      localStorage.setItem(key, JSON.stringify({ ...updated, lastDay: today, lastWeek: thisWeek }));
      return updated;
    });
  };

  return {
    dailyUsed: counts.dailyUsed,
    dailyTotal,
    dailyRemaining: Math.max(0, dailyTotal - counts.dailyUsed),
    weeklyUsed: counts.weeklyUsed,
    weeklyTotal: FREE_WEEKLY_MAX,
    weeklyRemaining: Math.max(0, FREE_WEEKLY_MAX - counts.weeklyUsed),
    isVip,
    recordMatch,
  };
}
