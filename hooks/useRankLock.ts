"use client";

import { useState, useEffect } from "react";
import { RANKED_DAYS, WEEKEND_LEAGUE_DAYS } from "@/constants/ranks";

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
    const checkLock = () => {
      const now = new Date();
      const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const hour = now.getHours();
      const minute = now.getMinutes();

      const isQualificationDay = RANKED_DAYS.includes(day);
      const isWeekendDay = WEEKEND_LEAGUE_DAYS.includes(day);

      // Lock from Thursday 23:59 until Sunday 00:00
      const isThursdayNight = day === 4 && (hour > 23 || (hour === 23 && minute >= 59));
      const isFriday = day === 5;
      const isSaturday = day === 6;
      const isSundayMorning = day === 0 && hour === 0 && minute < 5;

      const isLocked = isThursdayNight || isFriday || isSaturday || isSundayMorning;

      // Calculate next unlock
      let nextUnlock = new Date(now);
      if (isLocked) {
        nextUnlock.setDate(now.getDate() + ((7 - day) % 7));
        nextUnlock.setHours(0, 0, 0, 0);
        if (day === 0) nextUnlock.setDate(nextUnlock.getDate() + 7);
      }

      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      setStatus({
        isLocked,
        isWeekendLeague: isWeekendDay && !isLocked,
        isQualification: isQualificationDay && !isLocked,
        nextUnlockTime: isLocked ? nextUnlock.toLocaleDateString("en-US", { weekday: "long", hour: "2-digit", minute: "2-digit" }) : "",
        currentDay: days[day],
      });
    };

    checkLock();
    const interval = setInterval(checkLock, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return status;
}
