"use client";

import { Coins } from "lucide-react";
import { RANK_CONFIGS } from "@/data/cosmetics";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Weekly rewards panel.
 *
 * IMPORTANT: Thaasbai pays weekly rewards by RANK TIER, not by leaderboard
 * placement. There is no placement-reward table anywhere in the project -
 * `RANK_CONFIGS` (data/cosmetics.ts) maps Bronze/Silver/Gold/Platinum to a
 * `weeklyReward`, and that is the only weekly payout that exists. So this
 * card shows the real tiers rather than inventing a 1st/2nd/3rd prize
 * ladder, and is labelled accordingly so it cannot be misread as a podium
 * prize.
 *
 * Admin overrides (appConfig, surfaced through EconomyContext as
 * `rankRewardOverrides`) take precedence, exactly as the payout logic does.
 */
export function RewardsCard() {
  const { state } = useEconomy();
  const t = useTranslation();
  const overrides = state.rankRewardOverrides?.weeklyRewards;

  return (
    <section className="lb-side-card">
      <h2>{t("leaderboard_weeklyRewards")}</h2>
      <p className="lb-side-hint">{t("leaderboard_rewardsByTier")}</p>

      <ul className="lb-reward-list">
        {RANK_CONFIGS.map((config) => {
          const coins = overrides?.[config.tier] ?? config.weeklyReward;
          const isYours = state.profile.rank === config.tier;
          return (
            <li key={config.tier} data-yours={isYours ? "true" : undefined}>
              <span className="lb-reward-tier">
                <span className="lb-reward-dot" style={{ backgroundColor: config.color }} aria-hidden="true" />
                {config.tier}
              </span>
              <span className="lb-reward-coins">
                <Coins size={13} aria-hidden="true" />
                {coins.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
