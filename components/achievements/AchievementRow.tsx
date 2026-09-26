"use client";

import { Trophy, Crown, Layers, Sparkles, CheckCircle2, Lock, Gem, Flame, Swords } from "lucide-react";
import type { ResolvedAchievement } from "@/lib/achievements";
import { Meter, CoinGem } from "@/components/arena";

/**
 * One achievement — the Achievements board's `.arow`
 * (design/arena/screens/app/app-08-achievements.jpg).
 *
 * A hexagon in the category's metal, the title and description, a progress
 * meter with its count, and the reward with Unlocked or Locked beneath it.
 * An achievement not yet earned has its hexagon greyed, which is the
 * board's `.aic.off`.
 */

/** The board's four metals, one per category. */
const TONE: Record<string, string> = {
  wins: "gp",        // lime
  rank: "rk",        // silver
  collection: "co",  // blue
  special: "sp",     // gold
};

/** The icon inside the hexagon, from the achievement's own id. */
function iconFor(achievement: ResolvedAchievement) {
  const id = achievement.id;
  if (id.includes("platinum")) return Gem;
  if (id.includes("gold") || achievement.category === "rank") return Crown;
  if (id.includes("cardbacks") || id.includes("tables")) return Layers;
  if (id.includes("collection")) return Sparkles;
  if (id.includes("weekend")) return Flame;
  if (id.includes("wins")) return Trophy;
  return Swords;
}

export function AchievementRow({ achievement }: { achievement: ResolvedAchievement }) {
  const target = Math.max(1, achievement.target);
  const progress = Math.max(0, Math.min(target, achievement.displayProgress));
  const done = achievement.complete;
  const Icon = iconFor(achievement);
  const tone = TONE[achievement.category] ?? "gp";
  // An achievement with no coin reward pays Prestige - the board's word for
  // "this one is for the badge". It is not written as "0 coins", which
  // would read as a reward that failed to load.
  const coins = achievement.reward > 0;

  return (
    <article className={`arow ${done ? "done" : ""}`.trim()}>
      <span className={`aic ${tone} ${done ? "" : "off"}`.replace(/\s+/g, " ").trim()} aria-hidden="true">
        <Icon />
      </span>
      <div style={{ minWidth: 0 }}>
        <h3>{achievement.title}</h3>
        <p>{achievement.description}</p>
        <div className="prog">
          <Meter
            value={progress / target}
            tone={done ? "lime" : "blue"}
            thin
            label={achievement.title}
            valueText={`${progress} of ${target}`}
          />
          <span>{progress} / {target}</span>
        </div>
      </div>
      <div className="rwd">
        <span className="amt">
          {coins ? <><CoinGem small />{achievement.reward.toLocaleString()}</> : "Prestige"}
        </span>
        <span className={`state ${done ? "on" : ""}`.trim()}>
          {done ? <CheckCircle2 aria-hidden="true" /> : <Lock aria-hidden="true" />}
          {done ? "Unlocked" : "Locked"}
        </span>
      </div>
    </article>
  );
}
