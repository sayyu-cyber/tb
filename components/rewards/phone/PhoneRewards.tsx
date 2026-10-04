"use client";

import { Flame } from "lucide-react";
import DailyLoginCalendar from "@/components/rewards/DailyLoginCalendar";
import MissionsPanel from "@/components/missions/MissionsPanel";

/**
 * Daily Rewards and Missions on a phone held upright —
 * design/arena/boards/MRewards.dc.html,
 * design/arena/screens/phone/phone-13-rewards.jpg.
 *
 * The wide screen puts the login calendar across the top and the two
 * mission panels side by side under it. The board keeps that order and
 * stacks all three: the title drops to 42px, the streak chip moves off the
 * header onto its own line under it, the seven login tiles go four to a row
 * with Day 7 spanning two, and the missions become one column.
 *
 * Both panels are the wide screen's own DailyLoginCalendar and
 * MissionsPanel drawn at the board's smaller numbers - the claim, the
 * cycle meter and every mission's progress are worked out in one place.
 */
export function PhoneRewards({ title, lede, streak = "", missionsOnly = false }: {
  title: string;
  /** The board's `.lbl dash` eyebrow over the title. */
  lede: string;
  /** "Streak: 6 days", already formatted and translated. */
  streak?: string;
  /** /missions shows the same two panels under its own heading. */
  missionsOnly?: boolean;
}) {
  return (
    <div className="arena-phone arena-mrewards mpage">
      <div className="mh">
        <span className="lbl dash" style={{ color: "#C6FF33" }}>{lede}</span>
        <h1 className="disp chrome" style={{ fontSize: 42 }}>{title}</h1>
      </div>

      {!missionsOnly && (
        <>
          <span className="pill lime" style={{ alignSelf: "flex-start", height: 34, padding: "0 13px", fontSize: 12 }}>
            <Flame aria-hidden="true" />{streak}
          </span>
          <DailyLoginCalendar phone />
        </>
      )}

      <MissionsPanel phone />
    </div>
  );
}
