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

/**
 * When the Weekend League window opens and closes.
 *
 * CODE ISSUE 9. The Tournament screen printed "Opens {time}" using
 * `nextUnlockTime` from useRankLock - but that hook only fills that field
 * while ranked play is LOCKED, and returns an empty string otherwise. So
 * during the week, which is exactly when a player would want to know when
 * the league starts, the line read "Opens " and stopped. This works the
 * boundaries out directly instead, so both halves of the sentence always
 * have a time in them.
 *
 * The window matches hooks/useRankLock: it opens Thursday at 23:59 and
 * closes Sunday at 00:05. Those two facts live in one place now, so the
 * countdown, the copy and the lock cannot disagree.
 */
export interface LeagueWindow {
  /** Is the league running right now? */
  live: boolean;
  /** When the current window ends, or the next one opens. */
  boundary: Date;
  /** Milliseconds until that boundary. Never negative. */
  msRemaining: number;
}

const OPEN_DAY = 4;    // Thursday
const OPEN_HOUR = 23, OPEN_MINUTE = 59;
const CLOSE_DAY = 0;   // Sunday
const CLOSE_HOUR = 0, CLOSE_MINUTE = 5;

/** The next occurrence of a weekday at a time, at or after `from`. */
function next(from: Date, weekday: number, hour: number, minute: number): Date {
  const date = new Date(from);
  date.setSeconds(0, 0);
  const delta = (weekday - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + delta);
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() <= from.getTime()) date.setDate(date.getDate() + 7);
  return date;
}

export function getLeagueWindow(now: Date = new Date()): LeagueWindow {
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // The same test hooks/useRankLock makes, kept identical on purpose.
  const thursdayNight = day === OPEN_DAY && (hour > OPEN_HOUR || (hour === OPEN_HOUR && minute >= OPEN_MINUTE));
  const friday = day === 5;
  const saturday = day === 6;
  const sundayMorning = day === CLOSE_DAY && hour === CLOSE_HOUR && minute < CLOSE_MINUTE;
  const live = thursdayNight || friday || saturday || sundayMorning;

  const boundary = live
    ? next(now, CLOSE_DAY, CLOSE_HOUR, CLOSE_MINUTE)
    : next(now, OPEN_DAY, OPEN_HOUR, OPEN_MINUTE);

  return { live, boundary, msRemaining: Math.max(0, boundary.getTime() - now.getTime()) };
}

/** "Friday 00:05" - a boundary written the way the copy reads it. */
export function formatLeagueBoundary(date: Date): string {
  return date.toLocaleString(undefined, { weekday: "long", hour: "2-digit", minute: "2-digit" });
}
