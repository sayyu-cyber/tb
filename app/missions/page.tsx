"use client";

import MissionsPanel from "@/components/missions/MissionsPanel";
import { useTranslation } from "@/hooks/useTranslation";
import { usePhonePortrait } from "@/hooks/usePhonePortrait";
import { PhoneRewards } from "@/components/rewards/phone/PhoneRewards";

/**
 * Missions — design/arena/screens/app/app-13-rewards-missions.jpg.
 *
 * The board has no Missions board of its own; it draws both panels inside
 * Daily Rewards. This route renders the same panels under its own heading,
 * so the two routes are one object rather than two drawings of it.
 */
export default function MissionsPage() {
  const t = useTranslation();
  const phone = usePhonePortrait();

  // Same arrangement as Daily Rewards held upright, minus the login
  // calendar and the streak chip, which belong to that route.
  if (phone) {
    return <PhoneRewards title={t("page_missions")} lede="Daily and weekly goals" missionsOnly />;
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
