"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, documentId, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getWeekStartKey } from "@/lib/trophyUpdates";
import type { LeaderboardEntry, LeaderboardMeta, LeaderboardPeriod } from "@/types";

const LEADERBOARD_SIZE = 50;
/** Firestore caps an `in` filter at 30 values, so friend lookups are chunked. */
const IN_CHUNK = 30;

/**
 * Leaderboard data.
 *
 * Every figure here is read straight from `players/{uid}` - the same document
 * lib/trophyUpdates.ts writes after each ranked match. Nothing is recomputed
 * or re-derived on the client, so the board cannot drift from the
 * authoritative ranking.
 *
 * Fields used: `trophies` (lifetime), `weeklyTrophies` + `weekStart` (the
 * lazy weekly counter), `totalMatches`, `wins`, `winPercentage`,
 * `currentRank`, `displayName`, `photoURL`, `avatarPreset`.
 */

type PlayerDoc = Record<string, unknown>;

function num(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

/** Shared projection so every period produces identically shaped rows. */
function toEntry(uid: string, data: PlayerDoc, rankingValue: number, rank: number): LeaderboardEntry {
  return {
    rank,
    uid,
    username: str(data.displayName) || "Player",
    trophies: rankingValue,
    avatar: str(data.photoURL),
    avatarPreset: str(data.avatarPreset),
    currentRank: str(data.currentRank),
    totalMatches: num(data.totalMatches),
    wins: num(data.wins),
    winPercentage: num(data.winPercentage),
  };
}

/** Local-time instant at which getWeekStartKey() next changes value. */
function nextMondayMidnight(from: Date = new Date()): number {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  // (day + 6) % 7 is days since Monday; 7 minus that is days until the next.
  const daysUntilMonday = 7 - ((d.getDay() + 6) % 7);
  d.setDate(d.getDate() + daysUntilMonday);
  return d.getTime();
}

export function useLeaderboard(period: LeaderboardPeriod = "weekly", friendUids: string[] = []) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable primitive so the effect does not re-run on every parent render just
  // because the friends array was rebuilt with the same contents.
  const friendKey = friendUids.join(",");

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let results: LeaderboardEntry[] = [];

      if (period === "allTime") {
        const snap = await getDocs(
          query(collection(db, "players"), orderBy("trophies", "desc"), limit(LEADERBOARD_SIZE))
        );
        results = snap.docs.map((d, i) => toEntry(d.id, d.data(), num(d.data().trophies), i + 1));
      } else if (period === "weekly") {
        const thisWeek = getWeekStartKey();
        const snap = await getDocs(
          query(collection(db, "players"), orderBy("weeklyTrophies", "desc"), limit(LEADERBOARD_SIZE))
        );
        // The weekly reset is lazy: a player who has not played since the week
        // rolled over still carries LAST week's figure until their next match.
        // Filtering on the stored week key is what makes this board honestly
        // "this week" rather than "whenever each player last played".
        results = snap.docs
          .filter((d) => d.data().weekStart === thisWeek)
          .map((d, i) => toEntry(d.id, d.data(), num(d.data().weeklyTrophies), i + 1));
      } else {
        const uids = friendKey ? friendKey.split(",") : [];
        if (uids.length === 0) {
          setEntries([]);
          return;
        }
        const chunks: string[][] = [];
        for (let i = 0; i < uids.length; i += IN_CHUNK) chunks.push(uids.slice(i, i + IN_CHUNK));
        const snaps = await Promise.all(
          chunks.map((chunk) =>
            getDocs(query(collection(db, "players"), where(documentId(), "in", chunk)))
          )
        );
        results = snaps
          .flatMap((snap) => snap.docs)
          .map((d) => ({ uid: d.id, data: d.data(), value: num(d.data().trophies) }))
          .sort((a, b) => b.value - a.value)
          .map((row, i) => toEntry(row.uid, row.data, row.value, i + 1));
      }

      setEntries(results);
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
