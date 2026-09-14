"use client";

import { BarChart3, CalendarDays, Clock, Trophy, Users } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { LeaderboardPeriod } from "@/types";

/**
 * Ranking-period tabs.
 *
 * Weekly, All Time and Friends are all backed by real stored data
 * (`weeklyTrophies`, `trophies`, and the signed-in player's friend list).
 * Monthly is rendered DISABLED rather than omitted: nothing in
 * `players/{uid}` tracks a monthly figure, and deriving one from the weekly
 * or lifetime counters would be a made-up ranking. Showing it greyed with a
 * "coming soon" title is honest about the roadmap without faking a board.
 */

const TABS: { id: LeaderboardPeriod | "monthly"; labelKey: string; icon: typeof BarChart3; enabled: boolean }[] = [
  { id: "weekly", labelKey: "leaderboard_tabWeekly", icon: BarChart3, enabled: true },
  { id: "monthly", labelKey: "leaderboard_tabMonthly", icon: CalendarDays, enabled: false },
  { id: "allTime", labelKey: "leaderboard_tabAllTime", icon: Trophy, enabled: true },
  { id: "friends", labelKey: "leaderboard_tabFriends", icon: Users, enabled: true },
];

/** "2d 4h" / "6h 12m" / "Under a minute" - never a hardcoded guess. */
function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "";
  const minutes = Math.floor(msRemaining / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export function LeaderboardTabs({
  active,
  onChange,
  nextResetAt,
  showReset,
}: {
  active: LeaderboardPeriod;
  onChange: (period: LeaderboardPeriod) => void;
  nextResetAt: number;
  /** Reset copy only belongs on the weekly board. */
  showReset: boolean;
}) {
  const t = useTranslation();
  const countdown = formatCountdown(nextResetAt - Date.now());

  return (
    <div className="lb-tabrow">
      <div className="lb-tabs" role="tablist" aria-label={t("leaderboard_periodLabel")}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const selected = tab.enabled && tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={!tab.enabled}
              title={tab.enabled ? undefined : t("leaderboard_comingSoon")}
              onClick={() => tab.enabled && onChange(tab.id as LeaderboardPeriod)}
              className="lb-tab"
            >
              <Icon size={15} aria-hidden="true" />
              {t(tab.labelKey)}
              {!tab.enabled && <span className="lb-soon">{t("leaderboard_comingSoon")}</span>}
            </button>
          );
        })}
      </div>

      {showReset && (
        <p className="lb-reset">
          <Clock size={14} aria-hidden="true" />
          {countdown
            ? t("leaderboard_resetsIn").replace("{time}", countdown)
            : t("leaderboard_resetsMonday")}
        </p>
      )}
    </div>
  );
}
