"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FREE_DAILY_MATCHES, FREE_WEEKLY_MAX, VIP_DAILY_MATCHES } from "@/constants/ranks";
import { useEconomy } from "@/contexts/EconomyContext";
import { getDayKey, getWeekStartKey, nextUtcMidnight } from "@/lib/competitionTime";

interface MatchLimits {
  dailyUsed: number;
  dailyTotal: number;
  dailyRemaining: number;
  weeklyUsed: number;
  weeklyTotal: number;
  weeklyRemaining: number;
  isVip: boolean;
}

type Counts = { dailyUsed: number; weeklyUsed: number; lastDay: string; lastWeek: string };
const count = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;

function currentCounts(value: Partial<Counts> | null, now: Date): Counts {
  const lastDay = getDayKey(now);
  const lastWeek = getWeekStartKey(now);
  return {
    dailyUsed: value?.lastDay === lastDay ? count(value.dailyUsed) : 0,
    weeklyUsed: value?.lastWeek === lastWeek ? count(value.weeklyUsed) : 0,
    lastDay,
    lastWeek,
  };
}

/** Local display counters; authoritative queue limits must be enforced by the server. */
export function useMatchLimits(userId?: string): MatchLimits & { recordMatch: () => void } {
  const { state } = useEconomy();
  const isVip = state.profile.vip.active;
  const dailyTotal = isVip ? VIP_DAILY_MATCHES : FREE_DAILY_MATCHES;
  const key = `thaasbai_matches_${userId || "guest"}`;
  const [snapshot, setSnapshot] = useState(() => ({ key, counts: currentCounts(null, new Date()) }));
  const memory = useRef(snapshot);
  const pendingWrite = useRef<string | null>(null);

  const readCounts = useCallback((): Counts => {
    let data: Partial<Counts> | null = memory.current.key === key ? memory.current.counts : null;
    if (pendingWrite.current === key) return currentCounts(data, new Date());
    try {
      const stored = localStorage.getItem(key);
      data = stored ? JSON.parse(stored) : null;
    } catch {
      // Keep session counters when storage is blocked or contains malformed JSON.
    }
    return currentCounts(data, new Date());
  }, [key]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      const next = { key, counts: readCounts() };
      memory.current = next;
      setSnapshot(next);
      timer = setTimeout(refresh, Math.max(1, nextUtcMidnight() - Date.now()));
    };
    const onStorage = (event: StorageEvent) => { if (event.key === key || event.key === null) refresh(); };
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [key, readCounts]);

  const recordMatch = useCallback(() => {
    // Re-read and normalize before incrementing, including after a suspended tab resumes.
    const previous = readCounts();
    const counts = { ...previous, dailyUsed: previous.dailyUsed + 1, weeklyUsed: previous.weeklyUsed + 1 };
    const next = { key, counts };
    memory.current = next;
    try {
      localStorage.setItem(key, JSON.stringify(counts));
      pendingWrite.current = null;
    } catch {
      pendingWrite.current = key;
      // Keep the current session usable when browser storage is unavailable.
    }
    setSnapshot(next);
  }, [key, readCounts]);

  const counts = currentCounts(snapshot.key === key ? snapshot.counts : null, new Date());
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
