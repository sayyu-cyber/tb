"use client";

import { Check, Gift, Gamepad2, Trophy, Swords, Gem, Target, Users, Smile } from "lucide-react";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { ALL_COSMETICS } from "@/data/cosmetics";
import type { DailyMission, WeeklyMission } from "@/types/economy";
import { Pill, Meter, CoinGem } from "@/components/arena";

/**
 * Daily and weekly missions — the lower half of
 * design/arena/screens/app/app-13-rewards-missions.jpg.
 *
 * Two panels side by side: daily on the lime-ticked panel, weekly on the
 * blue one. Each row is the board's `.mis` - an icon that turns lime when
 * done, the title and description, a progress meter with its count, and the
 * reward on the right with any cosmetic named under it.
 *
 * The board draws the cosmetic rewards ("+ Nice Move sticker", "+ Platinum
 * Shield frame"), and the data carries them as ids, so they are looked up
 * rather than written down.
 */

const NAMES: Record<string, string> = Object.fromEntries(ALL_COSMETICS.map((item) => [item.id, item.name]));

/** The board's icon per mission kind; a completed row swaps it for a tick. */
function MissionIcon({ mission, done }: { mission: DailyMission | WeeklyMission; done: boolean }) {
  if (done) return <Check />;
  const id = mission.templateId;
  if (id.includes("win")) return <Trophy />;
  if (id.includes("play_20") || id.includes("matches")) return <Swords />;
  if (id.includes("reach")) return <Gem />;
  if (id.includes("champ")) return <Target />;
  if (id.includes("invite")) return <Users />;
  if (id.includes("emote")) return <Smile />;
  return <Gamepad2 />;
}

function MissionRow({ mission, tone }: { mission: DailyMission | WeeklyMission; tone: "lime" | "blue" }) {
  const done = mission.completed;
  const target = Math.max(1, mission.target);
  const progress = Math.max(0, Math.min(target, mission.progress));
  const cosmeticId = (mission as WeeklyMission).rewardCosmeticId;
  const cosmetic = cosmeticId ? NAMES[cosmeticId] : undefined;
  const suffix = cosmeticId?.startsWith("st_") ? "sticker"
    : cosmeticId?.startsWith("pf_") ? "frame"
    : cosmeticId?.startsWith("bn_") ? "banner"
    : "";

  return (
    <div className={`mis ${done ? "done" : ""}`.trim()}>
      <span className="mi" aria-hidden="true"><MissionIcon mission={mission} done={done} /></span>
      <div style={{ minWidth: 0 }}>
        <h3>{mission.title}</h3>
        <p>{mission.description}</p>
        <div className="pr">
          <Meter
            value={progress / target}
            // A finished mission reads lime; one still running reads blue,
            // which is the board's own rule for "in progress".
            tone={done ? "lime" : tone}
            thin
            label={mission.title}
            valueText={`${progress} of ${target}`}
          />
          <span className="tnum">{progress} / {target}</span>
        </div>
      </div>
      <div className="rw">
        <b><CoinGem small />{mission.reward.toLocaleString()}</b>
        {cosmetic && <small>+ {cosmetic}{suffix ? ` ${suffix}` : ""}</small>}
      </div>
    </div>
  );
}

export default function MissionsPanel() {
  const { state } = useEconomy();
  const { missions } = state;
  const t = useTranslation();

  const dailyCompleted = missions.daily.filter((mission) => mission.completed).length;
  const weeklyCompleted = missions.weekly.filter((mission) => mission.completed).length;

  return (
    <section className="mission-row">
      <div className="panel tick" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div className="ph">
          <div>
            <h2>{t("missions_dailyTitle")}</h2>
            <p className="muted2" style={{ margin: "6px 0 0" }}>{t("missions_dailyReset")}</p>
          </div>
          <Pill tone="line">{dailyCompleted}/{missions.daily.length} completed</Pill>
        </div>
        {missions.daily.map((mission) => (
          <MissionRow key={mission.id} mission={mission} tone="blue" />
        ))}
        <div className="all-bonus">
          <Gift aria-hidden="true" />
          <span style={{ flexGrow: 1, fontSize: "14px", fontWeight: 600 }}>Complete all daily missions</span>
          <b style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-display), sans-serif", fontSize: "16px" }}>
            <CoinGem small />+{missions.dailyAllBonus} bonus
          </b>
        </div>
      </div>

      <div className="panel tick b" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div className="ph">
          <div>
            <h2>{t("missions_weeklyTitle")}</h2>
            <p className="muted2" style={{ margin: "6px 0 0" }}>{t("missions_weeklyReset")}</p>
          </div>
          <Pill tone="line">{weeklyCompleted}/{missions.weekly.length} completed</Pill>
        </div>
        {missions.weekly.map((mission) => (
          <MissionRow key={mission.id} mission={mission} tone="blue" />
        ))}
      </div>
    </section>
  );
}
