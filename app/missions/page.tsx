"use client";

import MissionsPanel from "@/components/missions/MissionsPanel";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { usePhoneLayout } from "@/hooks/usePhoneLayout";
import { LandRewards } from "@/components/rewards/land/LandRewards";

/**
 * Missions — design/arena/screens/app/app-13-rewards-missions.jpg.
 *
 * The board has no Missions board of its own; it draws both panels inside
 * Daily Rewards. This route renders the same panels under its own heading,
 * so the two routes are one object rather than two drawings of it.
 */
export default function MissionsPage() {
  const t = useTranslation();
  const { state } = useEconomy();
  const phone = usePhoneLayout();

  // On a phone Missions is part of Rewards (LANDSCAPE.md, LRewards): the
  // same screen, login calendar and all.
  if (phone) {
    return <LandRewards streak={t("rewards_streak").replace("{n}", String(state.dailyLogin.streak))} />;
  }

  return (
    <div className="arena-rewards ar-page" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="phead">
        <div>
          <span className="lbl dash" style={{ color: "#C6FF33" }}>
            Daily and weekly goals, and what they pay.
          </span>
          <h1 className="disp chrome ar-h1">{t("page_missions")}</h1>
        </div>
      </div>
      <MissionsPanel />
    </div>
  );
}
