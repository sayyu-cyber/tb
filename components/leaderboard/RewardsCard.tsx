"use client";

import { Crown, Gift } from "lucide-react";
import { RANK_CONFIGS } from "@/data/cosmetics";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { getRankFromTrophies } from "@/constants/ranks";
import { CoinGem, RankHex } from "@/components/arena";

/**
 * Weekly Rewards — the Leaderboard board's right column
 * (design/arena/screens/app/app-07-leaderboard.jpg).
 *
 * IMPORTANT: Thaasbai pays weekly rewards by RANK TIER, not by leaderboard
 * placement. There is no placement-reward table anywhere in the project -
 * RANK_CONFIGS maps Bronze/Silver/Gold/Platinum to a `weeklyReward`, and
 * that is the only weekly payout that exists. So this card shows the real
 * tiers rather than inventing a 1st/2nd/3rd prize ladder, and says so.
 *
 * CODE ISSUE 8. The "You" marker was decided by `state.profile.rank`, which
 * nothing keeps current - it is written once at Bronze and never updated
 * (that is code issue 2, still open). So every player, at every rank, saw
 * Bronze highlighted and a 50-coin payout. The tier is now worked out from
 * the player's trophies with getRankFromTrophies, the same function the
 * game scores against, so the row marked "You" is the row you are actually
 * paid from.
 *
 * `trophies` is a prop rather than another context read: the Leaderboard
 * already has the player's live entry, and taking the figure from there
 * keeps this card and the board's own ranking on one number.
 *
 * Admin overrides (appConfig, surfaced through EconomyContext as
 * `rankRewardOverrides`) take precedence, exactly as the payout logic does.
 */
export function RewardsCard({ trophies }: { trophies: number | undefined }) {
  const { state } = useEconomy();
  const t = useTranslation();
  const overrides = state.rankRewardOverrides?.weeklyRewards;
  // Undefined trophies means we do not know yet - better to highlight
  // nothing than to highlight the wrong tier, which is the bug above.
  const myTier = trophies === undefined ? null : getRankFromTrophies(trophies);

  return (
    <section className="panel tick b" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <div className="ph">
        <h2>{t("leaderboard_weeklyRewards")}</h2>
        <Gift aria-hidden="true" style={{ width: "20px", height: "20px", color: "#00BCC8" }} />
      </div>
      <p className="muted2" style={{ margin: "0 0 8px" }}>{t("leaderboard_rewardsByTier")}</p>

      {RANK_CONFIGS.map((config) => {
        const coins = overrides?.[config.tier] ?? config.weeklyReward;
        const mine = myTier === config.tier;
        return (
          <div className={`rw ${mine ? "cur" : ""}`.trim()} key={config.tier}>
            <RankHex tier={config.tier} width={26} height={30}>
              <Crown style={{ width: "13px", height: "13px" }} />
            </RankHex>
            <b style={{ color: config.color }}>{config.tier}</b>
            {mine && <span className="pill lime rw-you">You</span>}
            <span className="amt"><CoinGem small />{coins.toLocaleString()}</span>
          </div>
        );
      })}
    </section>
  );
}
