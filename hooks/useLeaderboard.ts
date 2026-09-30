"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getWeekStartKey } from "@/lib/trophyUpdates";
import type { LeaderboardEntry, LeaderboardMeta, LeaderboardPeriod } from "@/types";

const LEADERBOARD_SIZE = 50;

type LeaderboardRow = {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  avatar_preset: string | null;
  player_stats?: {
    total_matches: number | null;
    wins: number | null;
    win_percentage: number | null;
  } | null;
  ranked_progress?: {
    trophies: number | null;
    weekly_trophies: number | null;
    week_start: string | null;
    current_rank: string | null;
  } | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function num(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function toEntry(row: LeaderboardRow, rankingValue: number, rank: number): LeaderboardEntry {
  return {
    rank,
    uid: row.id,
    username: row.display_name || "Player",
    trophies: rankingValue,
    avatar: row.photo_url ?? undefined,
    avatarPreset: row.avatar_preset ?? undefined,
    currentRank: one(row.ranked_progress)?.current_rank ?? undefined,
    totalMatches: num(one(row.player_stats)?.total_matches),
    wins: num(one(row.player_stats)?.wins),
    winPercentage: num(one(row.player_stats)?.win_percentage),
  };
}

function nextMondayMidnight(from: Date = new Date()): number {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const daysUntilMonday = 7 - ((d.getDay() + 6) % 7);
  d.setDate(d.getDate() + daysUntilMonday);
  return d.getTime();
}

async function loadRows(ids?: string[]): Promise<LeaderboardRow[]> {
  const supabase = getSupabaseBrowserClient();
  let query = supabase
    .from("profiles")
    .select("id,display_name,photo_url,avatar_preset,player_stats(total_matches,wins,win_percentage),ranked_progress(trophies,weekly_trophies,week_start,current_rank)");
  if (ids?.length) query = query.in("id", ids);
  const { data, error } = await query.limit(Math.max(LEADERBOARD_SIZE, ids?.length ?? 0) || LEADERBOARD_SIZE);
  if (error) throw error;
  return (data ?? []) as unknown as LeaderboardRow[];
}

export function useLeaderboard(period: LeaderboardPeriod = "weekly", friendUids: string[] = []) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const friendKey = friendUids.join(",");

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let rows: LeaderboardRow[];
      if (period === "friends") {
        const uids = friendKey ? friendKey.split(",") : [];
        if (!uids.length) {
          setEntries([]);
          return;
        }
        rows = await loadRows(uids);
      } else {
        rows = await loadRows();
      }

      const thisWeek = getWeekStartKey();
      const ranked = rows
        .filter((row) => period !== "weekly" || one(row.ranked_progress)?.week_start === thisWeek)
        .map((row) => ({
          row,
          value: period === "weekly" ? num(one(row.ranked_progress)?.weekly_trophies) : num(one(row.ranked_progress)?.trophies),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, LEADERBOARD_SIZE)
        .map(({ row, value }, index) => toEntry(row, value, index + 1));

      setEntries(ranked);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
      setError("Couldn't load the leaderboard. Please try again.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [period, friendKey]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const meta: LeaderboardMeta = useMemo(
    () => ({
      period,
      weekStartKey: getWeekStartKey(),
      nextResetAt: nextMondayMidnight(),
    }),
    [period]
  );

  return { entries, loading, error, refresh: fetchLeaderboard, meta };
}
