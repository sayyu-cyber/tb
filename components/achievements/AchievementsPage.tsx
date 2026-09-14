// src/components/achievements/AchievementsPage.tsx
"use client";

import { useMemo, useState } from "react";
import { Grid2X2, Gamepad2, Crown, Layers, Star, Trophy } from "lucide-react";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import {
  ACHIEVEMENT_CATEGORIES,
  resolveAchievements,
  type AchievementCategoryId,
} from "@/lib/achievements";
import { AchievementRow } from "./AchievementRow";

/**
 * Achievements.
 *
 * Progress comes from lib/achievements' shared selector, which the Profile
 * preview also uses - so the two screens can never disagree. Nothing here
 * unlocks anything or touches coins; unlocking stays in EconomyContext.
 *
 * Two things the reference mockup shows that are deliberately NOT built:
 *
 *  - A "Claim Reward" button. Rewards are granted automatically on unlock,
 *    so a claim step would be a dead control.
 *  - The "All Games" filter. No achievement carries game metadata - every
 *    one of them ("Win 10 matches", "Collect 10 Card Backs") counts across
 *    both games - so the dropdown could only ever be decorative.
 */

const CATEGORY_ICONS = {
  all: Grid2X2,
  wins: Gamepad2,
  rank: Crown,
  collection: Layers,
  special: Star,
} as const;

export default function AchievementsPage() {
  const { state } = useEconomy();
  const t = useTranslation();
  const [category, setCategory] = useState<AchievementCategoryId>("all");

  const resolved = useMemo(
    () =>
      resolveAchievements(state.achievements, {
        matchesWon: state.profile.stats.matchesWon,
        highestRank: state.profile.stats.highestRank,
        weekendChampion: state.profile.stats.weekendChampion,
        collection: state.profile.collection,
      }),
    [state.achievements, state.profile.stats, state.profile.collection]
  );

  // "Completed" counts genuine completion, not reward state - there is no
  // separate claim step in this game, so the two would be identical anyway.
  const completed = resolved.filter((a) => a.complete).length;
  const total = resolved.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const visible = useMemo(
    () => (category === "all" ? resolved : resolved.filter((a) => a.category === category)),
    [resolved, category]
  );

  return (
    <div className="ach-page">
      <header className="ach-hero">
        <div className="ach-hero-copy">
          <span className="ach-eyebrow">THAASBAI</span>
          <h1>
            <span className="ach-hero-icon" aria-hidden="true">
              <Trophy size={26} />
            </span>
            {t("achievements_title")}
          </h1>
          <p>{t("ach_heroSubtitle")}</p>
        </div>
      </header>

      <section className="ach-overall" aria-label={t("ach_overallTitle")}>
        <span className="ach-overall-badge" aria-hidden="true">
          <Star size={30} />
        </span>

        <div className="ach-overall-body">
          <h2>{t("ach_overallTitle")}</h2>
          <p>{t("ach_overallSubtitle")}</p>
          <div
            className="ach-bar ach-bar-lg"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={completed}
            aria-label={t("ach_overallTitle")}
          >
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="ach-overall-count">
          <strong>
            {completed} / {total}
          </strong>
          <small>{t("ach_completedCaption")}</small>
        </div>
      </section>

      <div className="ach-tabs" role="tablist" aria-label={t("ach_categoryLabel")}>
        {ACHIEVEMENT_CATEGORIES.map((tab) => {
          const Icon = CATEGORY_ICONS[tab.id];
          const selected = tab.id === category;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setCategory(tab.id)}
              className="ach-tab"
            >
              <Icon size={15} aria-hidden="true" />
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="ach-empty">{t("ach_emptyCategory")}</p>
      ) : (
        <ul className="ach-list">
          {visible.map((achievement) => (
            <AchievementRow key={achievement.id} achievement={achievement} />
          ))}
        </ul>
      )}
    </div>
  );
}
