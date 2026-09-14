"use client";

import { Check, Lock } from "lucide-react";
import { CoinIcon } from "@/components/ui/icons";
import { AchievementIcon } from "./AchievementIcon";
import { useTranslation } from "@/hooks/useTranslation";
import type { ResolvedAchievement } from "@/lib/achievements";

/**
 * One achievement.
 *
 * There is deliberately NO claim button. Rewards in this game are granted
 * automatically the moment an achievement unlocks (EconomyContext dispatches
 * UNLOCK_ACHIEVEMENT, which credits the coins in the same reducer pass), so
 * a "Claim Reward" CTA would be a dead control that implies a step which
 * does not exist. Unlocked achievements read "Unlocked" instead.
 *
 * State is never conveyed by colour alone - the lock and check icons carry
 * visible text labels alongside them.
 */
export function AchievementRow({ achievement }: { achievement: ResolvedAchievement }) {
  const t = useTranslation();
  const target = Math.max(1, achievement.target);
  const pct = Math.round((achievement.displayProgress / target) * 100);
  const earned = achievement.unlocked;

  return (
    <li className="ach-row" data-complete={achievement.complete ? "true" : undefined}>
      <AchievementIcon
        id={achievement.id}
        category={achievement.category}
        complete={achievement.complete}
      />

      <div className="ach-body">
        <h3>{achievement.title}</h3>
        <p>{achievement.description}</p>
      </div>

      <div className="ach-progress">
        <div
          className="ach-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={target}
          aria-valuenow={achievement.displayProgress}
          aria-label={`${achievement.title} ${t("ach_progressLabel")}`}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
        <span className="ach-count">
          {achievement.displayProgress.toLocaleString()} / {target.toLocaleString()}
        </span>
      </div>

      {/* A genuine 0-reward achievement (Table Master, Master Collector) is
          labelled as prestige rather than rendered as a coin chip reading 0,
          which reads as a bug. */}
      {achievement.reward > 0 ? (
        <div className="ach-reward" title={t("ach_rewardTooltip")}>
          <CoinIcon size={15} />
          <strong>{achievement.reward.toLocaleString()}</strong>
          <small>{t("ach_rewardCoins")}</small>
        </div>
      ) : (
        <div className="ach-reward ach-reward-none">
          <small>{t("ach_prestige")}</small>
        </div>
      )}

      <div className="ach-state" data-earned={earned ? "true" : undefined}>
        {earned ? (
          <>
            <Check size={14} aria-hidden="true" />
            {t("ach_unlocked")}
          </>
        ) : (
          <>
            <Lock size={13} aria-hidden="true" />
            {t("ach_locked")}
          </>
        )}
      </div>
    </li>
  );
}
