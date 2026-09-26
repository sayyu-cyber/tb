"use client";

import { Trophy } from "lucide-react";
import type { LeaderboardEntry } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";
import { getRankFromTrophies } from "@/constants/ranks";
import { RankLabel, Meter } from "@/components/arena";

/**
 * Your Rank — the Leaderboard board's top-right panel
 * (design/arena/screens/app/app-07-leaderboard.jpg).
 *
 * The big placement, your tier, your trophies, and how far the player above
 * is. The meter measures the gap to the next place, not to a tier, because
 * that is what the line under it says.
 */
export function CurrentRankCard({
  entry, above, signedIn,
}: {
  entry: LeaderboardEntry | undefined;
  above: LeaderboardEntry | undefined;
  signedIn: boolean;
}) {
  const t = useTranslation();

  if (!signedIn || !entry) {
    return (
      <section className="panel tick lb-rank" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <span className="lbl dash" style={{ position: "relative" }}>{t("leaderboard_yourRank")}</span>
        <p className="muted" style={{ position: "relative", margin: 0 }}>
          {signedIn
            ? "Play a ranked match this week and you will appear here."
            : "Sign in to see where you stand."}
        </p>
      </section>
    );
  }

  const tier = entry.currentRank || getRankFromTrophies(entry.trophies);
  const gap = above ? Math.max(0, above.trophies - entry.trophies) : 0;
  // The bar measures progress towards the player above. At the top there is
  // no one above, so it reads full rather than empty.
  const progress = !above ? 1
    : above.trophies > 0 ? entry.trophies / above.trophies
    : 1;

  return (
    <section className="panel tick lb-rank" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", overflow: "hidden" }}>
      <div className="lb-rank-glow" aria-hidden="true" />
      <span className="lbl dash" style={{ position: "relative" }}>{t("leaderboard_yourRank")}</span>
      <div style={{ position: "relative", display: "flex", alignItems: "baseline", gap: "14px", flexWrap: "wrap" }}>
        <b className="disp lb-rank-number">#{entry.rank}</b>
        <RankLabel tier={tier} />
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-display), sans-serif", fontWeight: 700, fontSize: "20px" }}>
        <Trophy aria-hidden="true" style={{ width: "20px", height: "20px", color: "#C6FF33" }} />
        {entry.trophies} {entry.trophies === 1 ? "Trophy" : "Trophies"}
      </div>
      <Meter
        value={progress}
        label={above ? `Progress to place ${above.rank}` : "Top of the board"}
        valueText={above ? `${gap} trophies behind ${above.username}` : "First place"}
        className="lb-rank-meter"
      />
      <span className="muted" style={{ position: "relative" }}>
        {above
          ? <><b style={{ color: "#fff" }}>{gap} {gap === 1 ? "trophy" : "trophies"}</b> to the next place.</>
          : <>You are top of the board.</>}
      </span>
    </section>
  );
}
