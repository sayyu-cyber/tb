"use client";

import type { LucideIcon } from "lucide-react";
import { BadgeCheck, Crown, Flame, Gem, Grid2X2, Info, Layers, Lock, Medal, Swords, Trophy } from "lucide-react";
import type { ResolvedAchievement } from "@/lib/achievements";
import { CoinGem } from "@/components/arena";

/**
 * Achievements on a phone - design/arena/boards/LAchievements.dc.html (+
 * LAchievementsRanks), design/arena/screens/landscape/landscape-08 and 08b.
 *
 * The progress ring and its copy, with two tiles beside it: the coins the
 * finished achievements paid and what the rest would still pay - both
 * summed from the achievements themselves, never typed in. Then the
 * category chips with their counts, and the achievements two to a row.
 *
 * Progress comes from lib/achievements' shared selector through the page,
 * the same rows the wide screen and the Profile preview read. Rewards are
 * granted on unlock, so there is no claim button, as the board says.
 */

const CIRCUMFERENCE = 2 * Math.PI * 40;

/** The board's four metals, one per category. */
const TONE: Record<string, string> = { wins: "gp", rank: "rk", collection: "co", special: "sp" };

/** The board's emblem for each achievement. */
function iconFor(achievement: ResolvedAchievement): LucideIcon {
  const id = achievement.id;
  if (id.includes("platinum")) return Gem;
  if (id.includes("gold") || achievement.category === "rank") return Crown;
  if (id.includes("weekend")) return Flame;
  if (id.includes("cardbacks")) return Layers;
  if (id.includes("tables")) return Grid2X2;
  if (id.includes("collection")) return Medal;
  if (id.includes("win")) return Trophy;
  return Swords;
}

export interface LandAchievementsProps {
  completed: number;
  total: number;
  /** Coins the completed achievements paid, and what the rest would. */
  earned: number;
  toEarn: number;
  categories: { id: string; label: string; Icon: LucideIcon; done: number; all: number }[];
  category: string;
  onCategory: (id: string) => void;
  shown: ResolvedAchievement[];
}

export function LandAchievements(p: LandAchievementsProps) {
  const ratio = p.total > 0 ? p.completed / p.total : 0;
  return (
    <div className="arena-land is-m is-land arena-lachievements">
      <div className="mpage">
        <section className="panel tick ahero" aria-label="Overall progress">
          <div className="glow" aria-hidden="true" />
          <div className="wr" role="img" aria-label={`${p.completed} of ${p.total} achievements complete`}
            style={{ position: "relative", flex: "none", width: 104, height: 104 }}>
            <svg viewBox="0 0 96 96" aria-hidden="true" style={{ width: 104, height: 104 }}>
              <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="7" />
              <circle cx="48" cy="48" r="40" fill="none" stroke="#C6FF33" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE.toFixed(1)} strokeDashoffset={(CIRCUMFERENCE * (1 - ratio)).toFixed(1)} />
            </svg>
            <b style={{ flexDirection: "column", fontSize: 30 }}>
              {p.completed}<span className="muted2" style={{ fontSize: 11, marginTop: 2 }}>of {p.total}</span>
            </b>
          </div>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>
            <b className="disp" style={{ fontSize: 21 }}>Overall Progress</b>
            <span className="muted" style={{ fontSize: 12.5 }}>Complete achievements to earn rewards</span>
            <p className="body" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.4 }}>Complete milestones, unlock rewards and show off your progress.</p>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }} className="muted2">
              <Info aria-hidden="true" style={{ flex: "none", width: 14, height: 14, color: "#00BCC8" }} />Rewards are granted automatically.
            </span>
          </div>
          <div className="cols c2 stretch" style={{ position: "relative", gap: 8 }}>
            <div className="lstat" style={{ gap: 9, justifyContent: "space-between" }}>
              <CoinGem small />
              <b>{p.earned.toLocaleString("en-US")}</b><span>Coins earned</span>
            </div>
            <div className="lstat" style={{ gap: 9, justifyContent: "space-between" }}>
              <Lock aria-hidden="true" />
              <b>{p.toEarn.toLocaleString("en-US")}</b><span>Still to earn</span>
            </div>
          </div>
        </section>

        <div className="chips" role="group" aria-label="Achievement categories">
          {p.categories.map(({ id, label, Icon, done, all }) => (
            <button type="button" key={id} aria-pressed={p.category === id} onClick={() => p.onCategory(id)} data-flat>
              <Icon aria-hidden="true" />{label}<span className="cn">{done}/{all}</span>
            </button>
          ))}
        </div>

        <section className="cols c2 stretch" aria-label="Achievements">
          {p.shown.length === 0
            ? <p className="muted" style={{ margin: 0 }}>Nothing in this category yet.</p>
            : p.shown.map((achievement) => <Row key={achievement.id} achievement={achievement} />)}
        </section>
      </div>
    </div>
  );
}

function Row({ achievement }: { achievement: ResolvedAchievement }) {
  const target = Math.max(1, achievement.target);
  const progress = Math.max(0, Math.min(target, achievement.displayProgress));
  const done = achievement.complete;
  const pct = Math.round((progress / target) * 100);
  const Icon = iconFor(achievement);
  // An achievement with no coin reward pays Prestige - the board's word for
  // "this one is for the badge", never "0 coins".
  const coins = achievement.reward > 0;
  return (
    <article className={`arow ${done ? "done" : ""}`.trim()}>
      <span className={`aic ${TONE[achievement.category] ?? "gp"} ${done || progress > 0 ? "" : "off"}`.replace(/\s+/g, " ").trim()} aria-hidden="true">
        <Icon aria-hidden="true" />
      </span>
      <div><h3>{achievement.title}</h3><p>{achievement.description}</p></div>
      <div className="rwd">
        <span className="amt">{coins && <CoinGem small />}<span>{coins ? achievement.reward.toLocaleString("en-US") : "Prestige"}</span></span>
        <span className={`state ${done ? "on" : "off"}`}>{done ? <BadgeCheck aria-hidden="true" /> : <Lock aria-hidden="true" />}{done ? "Unlocked" : "Locked"}</span>
      </div>
      <div className="prog">
        <div className={`meter thin ${done ? "" : "b"}`.trim()} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
          aria-label={achievement.title} aria-valuetext={`${progress} of ${target}`}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <span>{progress} / {target}</span>
      </div>
    </article>
  );
}
