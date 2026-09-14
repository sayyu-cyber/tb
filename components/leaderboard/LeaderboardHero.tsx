"use client";

import { HelpCircle, RefreshCw, Trophy } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Page hero. Deliberately compact - the brief calls for a cinematic header
 * that still leaves the rankings above the fold, so this is a fixed-height
 * band rather than a full-bleed banner.
 *
 * The artwork is the same lobby table photo the Home, Shop and Clubs heroes
 * use (public/images/lobby-table.webp), so the page reads as part of the app
 * rather than a separately designed screen.
 */
export function LeaderboardHero({
  onRefresh,
  onHowItWorks,
  refreshing,
}: {
  onRefresh: () => void;
  onHowItWorks: () => void;
  refreshing: boolean;
}) {
  const t = useTranslation();

  return (
    <header className="lb-hero">
      <div className="lb-hero-copy">
        <span className="lb-eyebrow">THAASBAI</span>
        <h1>
          <span className="lb-hero-icon" aria-hidden="true">
            <Trophy size={26} />
          </span>
          {t("leaderboard_title")}
        </h1>
        <p>{t("leaderboard_heroSubtitle")}</p>
      </div>

      <div className="lb-hero-actions">
        <button type="button" className="lb-ghost-button" onClick={onHowItWorks}>
          <HelpCircle size={15} aria-hidden="true" />
          {t("leaderboard_howItWorks")}
        </button>
        <button
          type="button"
          className="lb-icon-button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label={t("leaderboard_refresh")}
          title={t("leaderboard_refresh")}
        >
          <RefreshCw size={16} className={refreshing ? "lb-spin" : undefined} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
