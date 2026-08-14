// lib/weekendLeague.ts
//
// Weekend League (GDD Chapter 7): players who've reached Silver+ qualify;
// during the Friday-Saturday window (see hooks/useRankLock), qualified
// players can queue into a separate "weekend" matchmaking pool (still the
// same lib/matchmaking.ts machinery under the hood) instead of casual
// Ranked. Standings are each player's weeklyTrophies (lib/trophyUpdates.ts),
// which lazily resets per-player at the start of their first match each week.
//
// Known gap (see PROGRESS.md): there's no scheduled job to snapshot brackets
// or permanently crown a "Weekend Champion" at the exact end of the window -
// that needs a Cloud Function (the project already has a functions/ folder
// with similar scheduled jobs, so it's a natural place to add one later).
// For now, standings are a live leaderboard of this week's qualified
// players, which is a fair proxy for "who's winning" during the window.

import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const QUALIFYING_RANKS = ["Silver", "Gold", "Platinum"];

export interface WeeklyStanding {
  uid: string;
  displayName: string;
  weeklyTrophies: number;
  currentRank: string;
}

export function isQualified(rank: string): boolean {
  return QUALIFYING_RANKS.includes(rank);
}

/** Live standings among qualified (Silver+) players this week, highest weeklyTrophies first. */
export async function getWeeklyStandings(limitCount = 50): Promise<WeeklyStanding[]> {
  const q = // Standings only ever render a leaderboard-sized page.
    query(collection(db, "players"), where("currentRank", "in", QUALIFYING_RANKS), limit(100));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        displayName: data.displayName || "Player",
        weeklyTrophies: data.weeklyTrophies || 0,
        currentRank: data.currentRank || "Silver",
      };
    })
    .sort((a, b) => b.weeklyTrophies - a.weeklyTrophies)
    .slice(0, limitCount);
}
