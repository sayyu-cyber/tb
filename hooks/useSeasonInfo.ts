"use client";

import { useState, useEffect } from "react";
import { SeasonInfo } from "@/types";
import { getSeasonOverride } from "@/lib/admin";

export function useSeasonInfo() {
  const [season, setSeason] = useState<SeasonInfo | null>(null);

  useEffect(() => {
    let cancelled = false;

    const computeDefault = (): SeasonInfo => {
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      // One season per calendar month, numbered from the app's launch month
      // (Jan 2026) - this is a real, computed value now rather than a
      // hardcoded "Season 1" that would never change.
      const launch = new Date(2026, 0, 1);
      const seasonNumber =
        (now.getFullYear() - launch.getFullYear()) * 12 + (now.getMonth() - launch.getMonth()) + 1;
      return { seasonNumber: Math.max(1, seasonNumber), endDate: endOfMonth, name: `Season ${Math.max(1, seasonNumber)}` };
    };

    // The admin panel can force a specific season number/reset the start
    // date (lib/admin.ts's setSeasonOverride) - if that override exists,
    // it wins over the calendar-computed default. Falls back silently to
    // the computed value on any read error (e.g. offline).
    getSeasonOverride()
      .then((override) => {
        if (cancelled) return;
        if (override && override.seasonNumber) {
          const startedAt = new Date(override.startedAt);
          const endOfMonth = new Date(startedAt.getFullYear(), startedAt.getMonth() + 1, 0, 23, 59, 59);
          setSeason({ seasonNumber: override.seasonNumber, endDate: endOfMonth, name: `Season ${override.seasonNumber}` });
        } else {
          setSeason(computeDefault());
        }
      })
      .catch(() => {
        if (!cancelled) setSeason(computeDefault());
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return season;
}
