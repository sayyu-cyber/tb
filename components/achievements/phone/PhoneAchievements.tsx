"use client";

import { Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ResolvedAchievement } from "@/lib/achievements";
import { AchievementRow } from "../AchievementRow";

/**
 * Achievements on a phone held upright —
 * design/arena/boards/MAchievements.dc.html,
 * design/arena/screens/phone/phone-08-achievements.jpg.
 *
 * The wide screen puts the ring, the categories and the copy in a left rail
 * with the list beside it. The board stacks them: the title, the ring panel
 * turned on its side so the 104px ring sits beside "Overall Progress", the
 * five categories as a scrolling `.chips` row with their tallies, then the
 * list. The title drops to 41px, which MOBILE.md allows for the long page
 * names.
 *
 * Every row is the wide screen's own AchievementRow - the board draws it
 * with the same `.arow`, `.aic`, `.prog` and `.rwd` at both sizes - so what
 * an achievement says it is worth is worked out once.
 */
const CIRCUMFERENCE = 2 * Math.PI * 40;

export function PhoneAchievements({
  title, completed, total, categories, category, onCategory, shown,
}: {
  title: string;
  completed: number;
  total: number;
  categories: { id: string; label: string; Icon: LucideIcon; done: number; all: number }[];
  category: string;
  onCategory: (id: string) => void;
  shown: ResolvedAchievement[];
}) {
  const ratio = total > 0 ? completed / total : 0;

  return (
    <div className="arena-machievements mpage">
      <div className="mh">
        <span className="lbl dash" style={{ color: "#C6FF33" }}>Milestones &amp; rewards</span>
        <h1 className="disp chrome" style={{ fontSize: 41 }}>{title}</h1>
        <p className="sub">Complete milestones, unlock rewards and show off your progress.</p>
      </div>

      <section className="panel tick" aria-label="Overall progress" style={{ padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
        <div
          className="wr"
          role="img"
          aria-label={`${completed} of ${total} achievements complete`}
          style={{ flex: "none", width: 104, height: 104 }}
        >
          <svg viewBox="0 0 96 96" aria-hidden="true" style={{ width: 104, height: 104 }}>
            <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="7" />
            <circle
              cx="48" cy="48" r="40" fill="none" stroke="#C6FF33" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE.toFixed(1)}
              strokeDashoffset={(CIRCUMFERENCE * (1 - ratio)).toFixed(1)}
            />
          </svg>
          <b style={{ flexDirection: "column", fontSize: 30 }}>
            {completed}
            <span className="muted2" style={{ fontSize: 11, marginTop: 2 }}>of {total}</span>
          </b>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <b className="disp" style={{ fontSize: 19 }}>Overall Progress</b>
          <span className="muted">Complete achievements to earn rewards</span>
          <span className="muted2" style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Info aria-hidden="true" style={{ flex: "none", width: 14, height: 14, color: "#00BCC8" }} />
            Rewards are granted automatically.
          </span>
        </div>
      </section>

      <div className="chips" role="group" aria-label="Achievement categories">
        {categories.map(({ id, label, Icon, done, all }) => (
          <button key={id} type="button" aria-pressed={category === id} onClick={() => onCategory(id)} data-flat>
            <Icon aria-hidden="true" />
            {label}
            <span className="ct">{done}/{all}</span>
          </button>
        ))}
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {shown.length === 0
          ? <p className="muted">Nothing in this category yet.</p>
          : shown.map((achievement) => <AchievementRow key={achievement.id} achievement={achievement} />)}
      </section>
    </div>
  );
}
