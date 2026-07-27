"use client";

import { useState, useEffect } from "react";
import { SeasonInfo } from "@/types";

export function useSeasonInfo() {
  const [season, setSeason] = useState<SeasonInfo | null>(null);

  useEffect(() => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // One season per calendar month, numbered from the app's launch month
    // (Jan 2026) - this is a real, computed value now rather than a
    // hardcoded "Season 1" that would never change.
    const launch = new Date(2026, 0, 1);
    const seasonNumber =
      (now.getFullYear() - launch.getFullYear()) * 12 + (now.getMonth() - launch.getMonth()) + 1;

    setSeason({
      seasonNumber: Math.max(1, seasonNumber),
      endDate: endOfMonth,
      name: `Season ${Math.max(1, seasonNumber)}`,
    });
  }, []);

  return season;
}
