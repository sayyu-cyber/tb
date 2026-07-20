"use client";

import { useState, useEffect } from "react";
import { SeasonInfo } from "@/types";

export function useSeasonInfo() {
  const [season, setSeason] = useState<SeasonInfo | null>(null);

  useEffect(() => {
    // Calculate end of current month
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    setSeason({
      seasonNumber: 1,
      endDate: endOfMonth,
      name: "Season 1",
    });
  }, []);

  return season;
}
