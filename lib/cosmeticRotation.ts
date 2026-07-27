// lib/cosmeticRotation.ts
//
// Weekly/seasonal cosmetic rotation (GDD Version 1.5 "Seasonal cosmetic
// rotation"). Previously the Shop's "Featured" tab (components/shop/
// CosmeticShop.tsx) showed a countdown to the next Sunday reset, but the
// actual item list was `ALL_COSMETICS.filter(c => c.isFeatured || ...)` -
// `isFeatured` is never set on any item in data/cosmetics.ts, so that
// filter silently fell through to "every non-VIP Legendary item", which
// never changes. The countdown timer was promising a rotation that never
// happened.
//
// This is a pure, deterministic function of the calendar week - same
// pattern used elsewhere in this project (lib/trophyUpdates.ts's
// getWeekStartKey) to avoid needing a scheduled Cloud Function: every
// client computes the same featured set for the same week purely from
// the current date, with no Firestore write or backend job required.

import { CosmeticItem } from "@/types/economy";
import { ALL_COSMETICS } from "@/data/cosmetics";

/** Weeks since a fixed epoch (a Monday), used as the rotation seed. */
export function getRotationWeekNumber(date: Date = new Date()): number {
  const epoch = new Date(Date.UTC(2024, 0, 1)); // Monday, Jan 1 2024
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((date.getTime() - epoch.getTime()) / msPerWeek);
}

/** Small seeded PRNG (mulberry32) so the same seed always shuffles the same way. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * This week's featured cosmetics - a deterministic, rotating subset of
 * non-VIP-exclusive items. Every player sees the same featured set during
 * the same calendar week; it changes automatically the following week.
 */
export function getWeeklyFeaturedRotation(count = 6, date: Date = new Date()): CosmeticItem[] {
  const pool = ALL_COSMETICS.filter((c) => !c.isVipExclusive);
  const week = getRotationWeekNumber(date);
  return seededShuffle(pool, week).slice(0, count);
}

/** Start-of-week (Sunday 00:00, matching the Shop's existing reset day) for the given date. */
export function getWeekRefreshWindow(date: Date = new Date()): { refreshTime: number; nextRefresh: number } {
  const now = new Date(date);
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);
  const next = new Date(start);
  next.setDate(start.getDate() + 7);
  return { refreshTime: start.getTime(), nextRefresh: next.getTime() };
}
