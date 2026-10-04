"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getWeekStartKey, nextWeekResetAt } from "@/lib/competitionTime";
import type { LeaderboardEntry, LeaderboardMeta, LeaderboardPeriod } from "@/types";

const LEADERBOARD_SIZE = 50;
type Joined<T> = T | T[] | null;
type PlayerStats = { total_matches: number | null; wins: number | null; win_percentage: number | null };
type LeaderboardRow = {
  user_id: string;
  trophies: number | null;
  weekly_trophies: number | null;
  current_rank: string | null;
  profiles: Joined<{
    display_name: string | null;
    photo_url: string | null;
    avatar_preset: string | null;
    player_stats: Joined<PlayerStats>;
  }>;
};

function one<T>(value: Joined<T> | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

/** Filter and rank the full population in SQL before applying the top-50 limit. */
async function loadRows(period: LeaderboardPeriod, week: string, ids: string[]): Promise<LeaderboardRow[]> {
  if (period === "friends" && !ids.length) return [];
  let query = getSupabaseBrowserClient()
    .from("ranked_progress")
    .select("user_id,trophies,weekly_trophies,current_rank,profiles!inner(display_name,photo_url,avatar_preset,player_stats(total_matches,wins,win_percentage))");
  if (period === "weekly") query = query.eq("week_start", week);
  if (period === "friends") query = query.in("user_id", ids);
  const { data, error } = await query
    .order(period === "weekly" ? "weekly_trophies" : "trophies", { ascending: false })
    .order("user_id", { ascending: true })
    .limit(LEADERBOARD_SIZE);
  if (error) throw error;
  return (data ?? []) as unknown as LeaderboardRow[];
}

export function useLeaderboard(period: LeaderboardPeriod = "weekly", friendUids: string[] = []) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [week, setWeek] = useState(getWeekStartKey);
  const request = useRef(0);
  const cancelRequests = useCallback(() => { ++request.current; }, []);
  const friendKey = [...new Set(friendUids)].sort().join(",");

  const fetchLeaderboard = useCallback(async () => {
    const version = ++request.current;
    setLoading(true);
    setError(null);
    const thisWeek = getWeekStartKey();
    setWeek(thisWeek);
    try {
      const rows = await loadRows(period, thisWeek, friendKey ? friendKey.split(",") : []);
      if (version !== request.current) return;
      setEntries(rows.map((row, index) => {
        const profile = one(row.profiles);
        const stats = one(profile?.player_stats);
        return {
          rank: index + 1,
          uid: row.user_id,
          username: profile?.display_name || "Player",
          trophies: (period === "weekly" ? row.weekly_trophies : row.trophies) ?? 0,
          avatar: profile?.photo_url ?? undefined,
          avatarPreset: profile?.avatar_preset ?? undefined,
          currentRank: row.current_rank ?? undefined,
          totalMatches: stats?.total_matches ?? 0,
          wins: stats?.wins ?? 0,
          winPercentage: stats?.win_percentage ?? 0,
        };
      }));
    } catch (err) {
      if (version !== request.current) return;
      console.error("Failed to load leaderboard:", err);
      setError("Couldn't load the leaderboard. Please try again.");
      setEntries([]);
    } finally {
      if (version === request.current) setLoading(false);
    }
  }, [period, friendKey]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      void fetchLeaderboard();
      timer = setTimeout(refresh, nextWeekResetAt() - Date.now());
    };
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelRequests();
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchLeaderboard, cancelRequests]);

  const meta: LeaderboardMeta = useMemo(() => ({
    period,
    weekStartKey: week,
    nextResetAt: nextWeekResetAt(new Date(`${week}T00:00:00Z`)),
  }), [period, week]);

  return { entries, loading, error, refresh: fetchLeaderboard, meta };
}
