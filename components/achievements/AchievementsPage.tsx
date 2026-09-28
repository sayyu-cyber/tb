// src/components/achievements/AchievementsPage.tsx
"use client";

import { useMemo, useState } from "react";
import { Grid2X2, Swords, Crown, Layers, Sparkles, Info } from "lucide-react";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import {
  ACHIEVEMENT_CATEGORIES,
  resolveAchievements,
  type AchievementCategoryId,
} from "@/lib/achievements";
import { AchievementRow } from "./AchievementRow";
import { PhoneAchievements } from "./phone/PhoneAchievements";

/**
 * Achievements — design/arena/screens/app/app-08-achievements.jpg, from the
 * Achievements board.
 *
 * Progress comes from lib/achievements' shared selector, which the Profile
 * preview also uses - so the two screens can never disagree. Nothing here
 * unlocks anything or touches coins; unlocking stays in EconomyContext.
 *
 * Two things the board does NOT show, and for good reason:
 *
 *  - No "Claim Reward" button. Rewards are granted automatically on unlock,
 *    so a claim step would be a dead control. The board says so in as many
 *    words under the ring: "Rewards are granted automatically."
 *  - No game filter. No achievement carries game metadata - every one of
 *    them counts across both games - so a Mindi/Gin toggle could only ever
 *    be decorative.
 */

const CATEGORY_ICONS = {
  all: Grid2X2,
  wins: Swords,
  rank: Crown,
  collection: Layers,
  special: Sparkles,
} as const;

/** The ring is drawn on r=40, so the full circumference is 2πr. */
const CIRCUMFERENCE = 2 * Math.PI * 40;

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
  const ratio = total > 0 ? completed / total : 0;

  const counts = useMemo(() => {
    const byCategory = new Map<string, { done: number; all: number }>();
    for (const achievement of resolved) {
      const entry = byCategory.get(achievement.category) ?? { done: 0, all: 0 };
      entry.all += 1;
      if (achievement.complete) entry.done += 1;
      byCategory.set(achievement.category, entry);
    }
    return byCategory;
  }, [resolved]);

  const shown = category === "all" ? resolved : resolved.filter((a) => a.category === category);

  const chipList = ACHIEVEMENT_CATEGORIES.map(({ id, labelKey }) => {
    const tally = id === "all" ? { done: completed, all: total } : counts.get(id) ?? { done: 0, all: 0 };
    return {
      id,
      label: t(labelKey),
      Icon: CATEGORY_ICONS[id as keyof typeof CATEGORY_ICONS] ?? Grid2X2,
      done: tally.done,
      all: tally.all,
    };
  });

  return (
    <>
    <div className="portrait-view">
      <PhoneAchievements
        title={t("page_achievements")}
        completed={completed}
        total={total}
        categories={chipList}
        category={category}
        onCategory={(id) => setCategory(id as AchievementCategoryId)}
        shown={shown}
      />
    </div>
    <div className="landscape-view">
    <div className="arena-achievements ar-page ach-page">
      <aside className="ach-side">
        <div>
          <span className="lbl dash" style={{ color: "#C6FF33" }}>Milestones &amp; rewards</span>
          <h1 className="disp chrome ar-h1 ach-title">{t("page_achievements")}</h1>
          <p className="sub">Complete milestones, unlock rewards and show off your progress.</p>
        </div>

        <div className="panel tick ach-ring-panel">
          <div
            className="wr ach-ring"
            role="img"
            aria-label={`${completed} of ${total} achievements complete`}
          >
            <svg viewBox="0 0 96 96" aria-hidden="true">
              <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="7" />
              <circle
                cx="48" cy="48" r="40" fill="none" stroke="#C6FF33" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE.toFixed(1)}
                strokeDashoffset={(CIRCUMFERENCE * (1 - ratio)).toFixed(1)}
              />
            </svg>
            <b>
              {completed}
              <span className="muted2">of {total}</span>
            </b>
          </div>
          <b className="disp" style={{ fontSize: "20px" }}>Overall Progress</b>
          <span className="muted">Complete achievements to earn rewards</span>
          <div className="muted2" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Info aria-hidden="true" style={{ width: "15px", height: "15px" }} />
            Rewards are granted automatically.
          </div>
        </div>

        <div className="panel ach-cats" role="group" aria-label="Achievement categories">
          {ACHIEVEMENT_CATEGORIES.map(({ id, labelKey }) => {
            const Icon = CATEGORY_ICONS[id as keyof typeof CATEGORY_ICONS] ?? Grid2X2;
            const tally = id === "all"
              ? { done: completed, all: total }
              : counts.get(id) ?? { done: 0, all: 0 };
            return (
              <button
                key={id}
                type="button"
                className="cat"
                aria-pressed={category === id}
                onClick={() => setCategory(id as AchievementCategoryId)}
                data-flat
              >
                <Icon aria-hidden="true" />
                {t(labelKey)}
                <span className="c">{tally.done}/{tally.all}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="ach-grid">
        {shown.length === 0
          ? <p className="muted">Nothing in this category yet.</p>
          : shown.map((achievement) => (
            <AchievementRow key={achievement.id} achievement={achievement} />
          ))}
      </section>
    </div>
    </div>
    </>
  );
}
