"use client";

import { HelpCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

/** The Leaderboard board's page header. */
export function LeaderboardHero({
  onRefresh, onHowItWorks, refreshing,
}: {
  onRefresh: () => void;
  onHowItWorks: () => void;
  refreshing: boolean;
}) {
  const t = useTranslation();
  return (
    <div className="phead">
      <div>
        <span className="lbl dash" style={{ color: "#C6FF33" }}>Compete, climb the ranks and earn rewards.</span>
        <h1 className="disp chrome ar-h1">{t("page_leaderboard")}</h1>
      </div>
      <div style={{ display: "flex", gap: "12px" }}>
        <button type="button" className="ar-btn ghost sm" onClick={onHowItWorks}>
          <HelpCircle aria-hidden="true" />How it works?
        </button>
        <button type="button" className="ibtn" aria-label="Refresh leaderboard" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
