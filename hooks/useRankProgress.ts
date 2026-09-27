"use client";

import { useAuth } from "@/contexts/AuthContext";
import { getRankFromTrophies, RANKS } from "@/constants/ranks";

const TIERS = [RANKS.BRONZE, RANKS.SILVER, RANKS.GOLD, RANKS.PLATINUM];

/**
 * Where the player stands on the trophy ladder, for the rank strip the Play
 * lobby draws at both sizes — design/arena/boards/Lobby.dc.html (desktop)
 * and MPlay.dc.html (portrait phone).
 *
 * Both boards print a Gold player at 58 trophies with "17 to Platinum". The
 * two screens need the same four numbers from the real account, so the
 * arithmetic lives here once rather than in each of them, where it could
 * quietly drift apart.
 */
export interface RankProgress {
  name: string;
  tier: string;
  trophies: number;
  /** The bottom of the current tier, e.g. Gold 50. */
  floor: number;
  /** The next tier's floor, or null at the top. */
  ceiling: number | null;
  /** The next tier's name, or null at the top. */
  nextTier: string | null;
  /** Trophies still needed for the next tier. */
  remaining: number;
  /** 0-100 through the current tier. */
  pct: number;
}

export function useRankProgress(): RankProgress {
  const { user, playerStats } = useAuth();
  const trophies = playerStats?.trophies ?? 0;
  const tier = getRankFromTrophies(trophies);

  const index = TIERS.findIndex((rank) => rank.name === tier);
  const floor = TIERS[index]?.min ?? 0;
  const next = TIERS[index + 1] ?? null;
  const span = next ? next.min - floor : 0;
  const progress = next && span > 0 ? Math.min(1, Math.max(0, (trophies - floor) / span)) : 1;

  return {
    name: user?.displayName || "Player",
    tier,
    trophies,
    floor,
    ceiling: next ? next.min : null,
    nextTier: next ? next.name : null,
    remaining: next ? Math.max(0, next.min - trophies) : 0,
    pct: Math.round(progress * 100),
  };
}
