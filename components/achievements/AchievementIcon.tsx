"use client";

import {
  Award,
  Crown,
  Gem,
  Layers,
  Medal,
  Spade,
  Sparkles,
  Swords,
  Trophy,
  type LucideIcon,
} from "lucide-react";

/**
 * Per-achievement emblem.
 *
 * The definitions in data/cosmetics.ts carry an emoji in their `icon` field
 * ("🏆", "🥉", "💎"…). Emoji render differently on every platform and the
 * brief rules them out as final UI, so this maps each achievement id to a
 * real icon from the library the rest of the app already uses. The stored
 * `icon` field is left untouched - nothing else is migrated, and any screen
 * still reading it keeps working.
 *
 * Tone follows the achievement's category so a rank milestone does not look
 * identical to a collection one, which was one of the specific complaints.
 */

const ICONS: Record<string, LucideIcon> = {
  ach_first_win: Crown,
  ach_10_wins: Swords,
  ach_50_wins: Trophy,
  ach_100_wins: Award,
  ach_first_gold: Medal,
  ach_first_platinum: Gem,
  ach_weekend_champ: Sparkles,
  ach_10_cardbacks: Layers,
  ach_all_tables: Spade,
  ach_100_collection: Gem,
};

/** Category → visual tone. Gold is reserved for progress and completion, so
 *  rank sits on silver and collections on teal to stay distinguishable. */
const TONE: Record<string, string> = {
  wins: "ach-tone-gold",
  rank: "ach-tone-silver",
  collection: "ach-tone-teal",
  special: "ach-tone-violet",
};

export function AchievementIcon({
  id,
  category,
  complete,
}: {
  id: string;
  category: string;
  complete: boolean;
}) {
  const Icon = ICONS[id] ?? Trophy;
  return (
    <span
      className={`ach-icon ${TONE[category] ?? "ach-tone-gold"}`}
      data-complete={complete ? "true" : undefined}
      aria-hidden="true"
    >
      <Icon size={24} />
    </span>
  );
}
