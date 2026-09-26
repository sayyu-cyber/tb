"use client";

import { useEffect, useState } from "react";
import { BarChart3, Trophy, Users, Clock } from "lucide-react";
import type { LeaderboardPeriod } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";
import { Pill } from "@/components/arena";

/**
 * The period tabs and the reset countdown — the Leaderboard board's row
 * under the heading (design/arena/screens/app/app-07-leaderboard.jpg).
 *
 * Monthly is drawn disabled with a "Coming soon" chip, which is honest:
 * useLeaderboard has no monthly window. It stays disabled rather than being
 * given a board that would quietly show the weekly one.
 */
const TABS = [
  { id: "weekly" as const, label: "Weekly", Icon: BarChart3 },
  { id: "allTime" as const, label: "All Time", Icon: Trophy },
  { id: "friends" as const, label: "Friends", Icon: Users },
];

/** "1d 14h", "14h 20m", "20m" - the board's form, to the sensible unit. */
function until(timestamp: number) {
  const ms = timestamp - Date.now();
  if (ms <= 0) return "soon";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function LeaderboardTabs({
  active, onChange, nextResetAt, showReset,
}: {
  active: LeaderboardPeriod;
  onChange: (period: LeaderboardPeriod) => void;
  nextResetAt: number;
  showReset: boolean;
}) {
  const t = useTranslation();
  const [, tick] = useState(0);
  // The countdown has to age, or it reads "1d 14h" all evening.
  useEffect(() => {
    const timer = setInterval(() => tick(value => value + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="lb-tabrow">
      <div className="tabs" role="group" aria-label={t("leaderboard_periodLabel")}>
        <button type="button" aria-pressed={active === "weekly"} onClick={() => onChange("weekly")} data-flat>
          <BarChart3 aria-hidden="true" />Weekly
        </button>
        <button type="button" disabled title="Monthly boards are not available yet" data-flat>
          Monthly<span className="soon">Coming soon</span>
        </button>
        {TABS.slice(1).map(({ id, label, Icon }) => (
          <button key={id} type="button" aria-pressed={active === id} onClick={() => onChange(id)} data-flat>
            <Icon aria-hidden="true" />{label}
          </button>
        ))}
      </div>
      {showReset && nextResetAt > 0 && (
        <Pill tone="line" className="lb-reset">
          <Clock aria-hidden="true" />Resets in {until(nextResetAt)}
        </Pill>
      )}
    </div>
  );
}
