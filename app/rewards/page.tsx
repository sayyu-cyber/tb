"use client";

import { Flame } from "lucide-react";
import DailyLoginCalendar from "@/components/rewards/DailyLoginCalendar";
import MissionsPanel from "@/components/missions/MissionsPanel";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { usePhoneLayout } from "@/hooks/usePhoneLayout";
import { LandRewards } from "@/components/rewards/land/LandRewards";
import { Pill } from "@/components/arena";

/**
 * Daily Rewards — design/arena/screens/app/app-13-rewards-missions.jpg,
 * from the Rewards board.
 *
 * The board draws the login calendar and both mission panels on one page,
 * so that is what this route shows. /missions keeps its own route and
 * shows the same mission panels under its own heading, which APP_SCREENS.md
 * asks for: "In the app these stay two routes with the same look."
 */
export default function RewardsPage() {
  const { state } = useEconomy();
  const t = useTranslation();
  const phone = usePhoneLayout();
  const streak = t("rewards_streak").replace("{n}", String(state.dailyLogin.streak));

  // One composition at a time rather than two hidden behind CSS: the login
  // calendar owns the claim and its celebration, and a claim must not be
  // able to fire from a copy the player cannot see.
  if (phone) {
    return <LandRewards streak={streak} />;
  }

  return (
    <div className="arena-rewards ar-page" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="phead">
        <div>
          <span className="lbl dash" style={{ color: "#C6FF33" }}>
            Come back every day for premium rewards
          </span>
          <h1 className="disp chrome ar-h1">{t("page_dailyRewards")}</h1>
        </div>
        <Pill tone="lime" className="streak">
          <Flame aria-hidden="true" />
          {streak}
        </Pill>
      </div>
      <DailyLoginCalendar />
      <MissionsPanel />
    </div>
  );
}
