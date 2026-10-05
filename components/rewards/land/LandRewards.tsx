"use client";

import DailyLoginCalendar from "@/components/rewards/DailyLoginCalendar";
import MissionsPanel from "@/components/missions/MissionsPanel";

/**
 * Daily Rewards and Missions on a phone - design/arena/boards/LRewards.dc.html
 * (+ LRewardsClaimed), design/arena/screens/landscape/landscape-13 and 13b.
 *
 * Daily Login across the top - seven tall day cells, today lit, Day 7 the
 * gift, the streak beside the heading and the cycle meter under them - then
 * Daily Missions and Weekly Missions in two columns. Claiming opens the
 * "Day n claimed!" dialog. /rewards and /missions are the same screen on a
 * phone (LANDSCAPE.md: Missions is part of Rewards).
 *
 * Both panels are the wide screen's own DailyLoginCalendar and
 * MissionsPanel drawn `land`: the claim, the countdown, the cycle and every
 * mission's progress are worked out in one place.
 */
export function LandRewards({ streak }: { streak: string }) {
  return (
    <div className="arena-land is-m is-land arena-lrewards">
      <div className="mpage">
        <DailyLoginCalendar land streak={streak} />
        <MissionsPanel land />
      </div>
    </div>
  );
}
