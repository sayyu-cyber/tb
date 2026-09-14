import { ALL_COSMETICS } from "@/data/cosmetics";
import type { Achievement } from "@/types/economy";

/**
 * Single source of truth for achievement progress.
 *
 * The stored `progress` field on each achievement is never written by
 * anything - `UNLOCK_ACHIEVEMENT` only flips `unlocked`, so every bar would
 * sit at zero until an achievement suddenly completes. The underlying facts
 * each achievement describes (wins, highest rank reached, cosmetics owned)
 * are all already tracked in EconomyContext state, so this derives the bar
 * from those instead of showing a number nothing maintains.
 *
 * This is a READ-ONLY projection. It never writes, never unlocks, and never
 * changes a target or a reward - unlocking stays exactly where it was, in
 * EconomyContext. So the page cannot grant anything or diverge from the
 * authoritative unlock rules.
 *
 * Both the Achievements page and the Profile preview run their list through
 * here, which is what keeps the two screens showing the same numbers.
 */

export interface ResolvedAchievement extends Achievement {
  /** Progress to render, derived from live state where a source exists and
   *  falling back to the stored value where one does not. */
  displayProgress: number;
  /** displayProgress has reached target. Note this can be true while
   *  `unlocked` is still false: only the four win achievements currently
   *  have unlock checks wired up (see EconomyContext), so the rest show as
   *  earned-but-not-granted until that is completed server-side. */
  complete: boolean;
}

/** Ranks in ascending order, for "reach X for the first time" checks. */
const RANK_ORDER = ["Bronze", "Silver", "Gold", "Platinum"];

function reachedRank(highestRank: string | undefined, tier: string): boolean {
  const reached = RANK_ORDER.indexOf(highestRank ?? "Bronze");
  const needed = RANK_ORDER.indexOf(tier);
  return needed >= 0 && reached >= needed;
}

/** Shape this needs from EconomyContext, kept narrow so the helper can be
 *  called from anywhere without dragging the whole state type along. */
export interface AchievementSources {
  matchesWon: number;
  highestRank?: string;
  weekendChampion?: boolean;
  collection: {
    cardBacks: string[];
    tableThemes: string[];
    profileFrames: string[];
    emotes: string[];
    victoryAnimations: string[];
    stickers: string[];
    banners: string[];
  };
}

/** Distinct cosmetics owned across every category - de-duplicated, because
 *  the same id must never be counted twice toward Master Collector. */
function ownedCosmeticCount(collection: AchievementSources["collection"]): number {
  const owned = new Set<string>([
    ...collection.cardBacks,
    ...collection.tableThemes,
    ...collection.profileFrames,
    ...collection.emotes,
    ...collection.victoryAnimations,
    ...collection.stickers,
    ...collection.banners,
  ]);
  // Only count ids that are real catalogue entries, so a stale or renamed id
  // left in a player's document cannot inflate the total past 100%.
  const catalogue = new Set(ALL_COSMETICS.map((item) => item.id));
  let count = 0;
  owned.forEach((id) => {
    if (catalogue.has(id)) count += 1;
  });
  return count;
}

function deriveProgress(achievement: Achievement, sources: AchievementSources): number {
  switch (achievement.id) {
    case "ach_first_win":
    case "ach_10_wins":
    case "ach_50_wins":
    case "ach_100_wins":
      return sources.matchesWon;

    case "ach_first_gold":
      return reachedRank(sources.highestRank, "Gold") ? 1 : 0;
    case "ach_first_platinum":
      return reachedRank(sources.highestRank, "Platinum") ? 1 : 0;

    // No tournament result is recorded anywhere yet, so this stays at its
    // real value of 0 rather than being inferred from trophies.
    case "ach_weekend_champ":
      return sources.weekendChampion ? 1 : 0;

    case "ach_10_cardbacks":
      return sources.collection.cardBacks.length;
    case "ach_all_tables":
      return sources.collection.tableThemes.length;
    case "ach_100_collection":
      return ownedCosmeticCount(sources.collection);

    default:
      // Unknown id: trust whatever was stored rather than inventing a number.
      return achievement.progress;
  }
}

export function resolveAchievements(
  achievements: Achievement[],
  sources: AchievementSources
): ResolvedAchievement[] {
  return achievements.map((achievement) => {
    const target = Math.max(1, achievement.target);
    const raw = deriveProgress(achievement, sources);
    // An unlocked achievement always reads as full, even if the underlying
    // stat later drops (trophies can fall, so a rank can be lost).
    const displayProgress = achievement.unlocked ? target : Math.max(0, Math.min(target, raw));
    return {
      ...achievement,
      displayProgress,
      complete: achievement.unlocked || displayProgress >= target,
    };
  });
}

/** Category tabs, mapped to the `category` values the definitions already
 *  carry (data/cosmetics.ts). No category is invented here. */
export const ACHIEVEMENT_CATEGORIES = [
  { id: "all", labelKey: "ach_catAll" },
  { id: "wins", labelKey: "ach_catGameplay" },
  { id: "rank", labelKey: "ach_catRanks" },
  { id: "collection", labelKey: "ach_catCollections" },
  { id: "special", labelKey: "ach_catSpecial" },
] as const;

export type AchievementCategoryId = (typeof ACHIEVEMENT_CATEGORIES)[number]["id"];
