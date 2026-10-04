"use client";

import { useState, useEffect } from "react";
import { RANKED_DAYS } from "@/constants/ranks";
import { formatLeagueBoundary, getLeagueDay, getLeagueWindow } from "@/lib/competitionTime";

interface RankLockStatus {
  isLocked: boolean;
  isWeekendLeague: boolean;
  isQualification: boolean;
  nextUnlockTime: string;
  currentDay: string;
}

export function useRankLock(): RankLockStatus {
  const [status, setStatus] = useState<RankLockStatus>({
    isLocked: false,
    isWeekendLeague: false,
    isQualification: false,
    nextUnlockTime: "",
    currentDay: "",
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      const now = new Date();
      const day = getLeagueDay(now);
      const { live, boundary } = getLeagueWindow(now);
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      setStatus({
        isLocked: live,
        isWeekendLeague: live,
        isQualification: RANKED_DAYS.includes(day) && !live,
        nextUnlockTime: live ? formatLeagueBoundary(boundary) : "",
        currentDay: days[day],
      });
      timer = setTimeout(refresh, 60_000 - Date.now() % 60_000);
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return status;
}
