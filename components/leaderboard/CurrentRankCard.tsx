"use client";

import { Trophy } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { LeaderboardEntry } from "@/types";

/**
 * "Your Rank" panel.
 *
 * Shows the signed-in player's real position on the board currently being
 * viewed - never a stored or guessed figure. If they are not on the loaded
 * board at all, it says so plainly rather than inventing a placement, since
 * the query is capped at the top 50 and a player outside that genuinely has
 * no known position.
 *
 * The progress bar measures the gap to the player directly above, which is a
 * real, meaningful threshold. It is hidden for rank 1 (nothing to climb to)
 * and whenever the gap cannot be computed.
 */
export function CurrentRankCard({
  entry,
  above,
  signedIn,
}: {
  entry?: LeaderboardEntry;
  /** The player one place higher, used for the climb-to-next bar. */
  above?: LeaderboardEntry;
  signedIn: boolean;
}) {
  const t = useTranslation();

  if (!signedIn) return null;

  if (!entry) {
    return (
      <section className="lb-side-card">
        <h2>{t("leaderboard_yourRank")}</h2>
        <p className="lb-unranked">{t("leaderboard_unranked")}</p>
        <p className="lb-side-hint">{t("leaderboard_unrankedHint")}</p>
      </section>
    );
  }

  const gap = above ? Math.max(0, above.trophies - entry.trophies) : 0;
  const showBar = Boolean(above) && gap > 0 && above!.trophies > 0;
  const progress = showBar ? Math.min(100, Math.round((entry.trophies / above!.trophies) * 100)) : 0;

  return (
    <section className="lb-side-card">
      <h2>{t("leaderboard_yourRank")}</h2>

      <p className="lb-your-rank">#{entry.rank}</p>

      <p className="lb-your-trophies">
        <Trophy size={15} aria-hidden="true" />
        {entry.trophies.toLocaleString()} {t("leaderboard_trophies")}
      </p>

      {showBar && (
        <div className="lb-progress">
          <div
            className="lb-progress-track"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("leaderboard_climbLabel")}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="lb-side-hint">
            {t("leaderboard_gapToNext").replace("{n}", gap.toLocaleString())}
          </p>
        </div>
      )}

      {!showBar && <p className="lb-side-hint">{t("leaderboard_keepPlaying")}</p>}
    </section>
  );
}
