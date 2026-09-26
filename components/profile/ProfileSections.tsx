"use client";

import Link from "next/link";
import {
  Swords, Trophy, Target, TrendingUp, LockKeyhole, ChevronRight, Heart, Crown,
} from "lucide-react";
import type { PlayerStats } from "@/types";
import type { ProfileMatch } from "@/lib/profileHistory";
import type { ResolvedAchievement } from "@/lib/achievements";
import { RANKS } from "@/constants/ranks";
import { Pill, Meter, RankHex } from "@/components/arena";

/**
 * Profile, section by section — design/arena/screens/app/app-02-profile.jpg,
 * from the Profile board. The board's class names are kept as written
 * (.tile, .game, .wr, .ach, .hist, .res), so these read against
 * styles/arena-profile.css line for line.
 */

/** A figure that isn't known yet reads as a dash, never as a zero. */
export function metric(value: number | undefined | null) {
  return value === undefined || value === null || !Number.isFinite(value) ? "--" : String(value);
}

export function ProfileSkeleton() {
  return (
    <div className="profile-skeleton" aria-label="Loading profile" aria-busy="true">
      <div /><div /><div /><div />
    </div>
  );
}

/* ── Statistics ─────────────────────────────────────────────────────── */

export function ProfileStatsGrid({ stats }: { stats: PlayerStats | null }) {
  const matches = stats?.totalMatches;
  const wins = stats?.wins;
  const losses = stats?.losses;
  const rate = stats && Number.isFinite(matches) && matches
    ? `${Math.round(((wins ?? 0) / matches) * 100)}%`
    : "--";
  return (
    <div className="panel tick" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="ph"><h2>Statistics</h2><span className="lbl">All time</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
        <Tile icon={<Swords />} value={metric(matches)} label="Matches" />
        <Tile icon={<Trophy />} value={metric(wins)} label="Wins" />
        <Tile icon={<Target />} value={metric(losses)} label="Losses" tone="b" />
        <Tile icon={<TrendingUp />} value={rate} label="Win Rate" tone="b" />
      </div>
    </div>
  );
}

function Tile({ icon, value, label, tone }: { icon: React.ReactNode; value: string; label: string; tone?: "b" }) {
  return (
    <div className="tile">
      <span className={`ti ${tone ?? ""}`.trim()} aria-hidden="true">{icon}</span>
      <b>{value}</b>
      <span className="lbl">{label}</span>
    </div>
  );
}

/* ── Game Stats ─────────────────────────────────────────────────────── */

/** `.wr` draws a 96px ring on r=40, so the full circumference is 2πr. */
const CIRCUMFERENCE = 2 * Math.PI * 40;

function WinRateRing({ rate, label }: { rate: number | null; label: string }) {
  const shown = rate ?? 0;
  return (
    <div className="wr" role="img" aria-label={rate === null ? `${label} win rate unavailable` : `${label} win rate ${shown} per cent`}>
      <svg viewBox="0 0 96 96" aria-hidden="true">
        <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="8" />
        <circle
          cx="48" cy="48" r="40" fill="none" stroke="#C6FF33" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE.toFixed(1)}
          strokeDashoffset={(CIRCUMFERENCE * (1 - shown / 100)).toFixed(1)}
        />
      </svg>
      <b>{rate === null ? "--" : `${shown}%`}</b>
    </div>
  );
}

export function ProfileGameStats({ history }: { history: ProfileMatch[] | null }) {
  return (
    <div className="panel tick b" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="ph"><h2>Game Stats</h2><span className="lbl">Recent online matches</span></div>
      <div className="game-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px", flexGrow: 1 }}>
        {(["Mindi", "Gin Rummy"] as const).map((game) => {
          const records = history?.filter((match) => match.game === game);
          // A match whose result couldn't be read is not a loss. If any
          // record is unknown the rate is withheld rather than guessed.
          const known = records?.every((match) => match.result !== "Unavailable") ?? false;
          const wins = records?.filter((match) => match.result === "Win").length ?? 0;
          const rate = known && records && records.length ? Math.round((wins / records.length) * 100) : null;
          return (
            <div className={`game ${game === "Mindi" ? "m" : "g"}`} key={game}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
                <b className="disp" style={{ fontSize: "24px" }}>{game}</b>
                {game === "Mindi" && (
                  <span className="thaana" lang="dv" dir="rtl" style={{ fontSize: "14px" }}>މިންޑި</span>
                )}
              </div>
              <WinRateRing rate={rate} label={game} />
              <div className="nums" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: "auto" }}>
                <div><b>{metric(records?.length)}</b><span>Matches</span></div>
                <div><b>{known ? wins : "--"}</b><span>Wins</span></div>
              </div>
            </div>
          );
        })}
        {/* The board's third slot. It is a real placeholder for a third
            game, not decoration, so it stays and says so. */}
        <div
          className="game"
          style={{ alignItems: "center", justifyContent: "center", textAlign: "center", border: "1.5px dashed rgba(255,255,255,.18)" }}
        >
          <LockKeyhole aria-hidden="true" />
          <b className="disp" style={{ fontSize: "16px", color: "#BEBECA" }}>Next at the table</b>
          <Pill tone="dim">Coming soon</Pill>
        </div>
      </div>
    </div>
  );
}

/* ── Achievements ───────────────────────────────────────────────────── */

export function AchievementsPreview({ achievements }: { achievements: ResolvedAchievement[] }) {
  return (
    <div className="panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="ph">
        <h2>Achievements</h2>
        <Link className="link" href="/achievements/">View All<ChevronRight aria-hidden="true" /></Link>
      </div>
      {achievements.length === 0 ? (
        <p className="muted">Start playing to unlock achievements.</p>
      ) : (
        <div className="ach-grid">
          {achievements.slice(0, 5).map((achievement) => {
            const target = Math.max(1, achievement.target);
            const progress = Math.max(0, Math.min(target, achievement.displayProgress));
            const rank = achievement.category === "rank";
            return (
              <div className={`ach ${achievement.unlocked ? "done" : ""}`.trim()} key={achievement.id}>
                <span
                  className={`ai ${achievement.unlocked ? "" : "lockd"}`.trim()}
                  aria-hidden="true"
                  // The board gives the rank achievement a gold hex rather
                  // than the lime one, so the two read apart at a glance.
                  style={rank && achievement.unlocked
                    ? { background: "linear-gradient(160deg, #FFE58A, #E0B52E 55%, #9A7512)" }
                    : undefined}
                >
                  {rank ? <Crown /> : <Trophy />}
                </span>
                <h4>{achievement.title}</h4>
                <Meter value={progress / target} thin label={achievement.title} valueText={`${progress} of ${target}`} />
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <span className="muted2">{progress}/{target}</span>
                  {achievement.unlocked
                    ? <Pill tone="lime" className="ach-pill">Unlocked</Pill>
                    : <Pill tone="dim" className="ach-pill">{progress > 0 ? "In progress" : "Locked"}</Pill>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Milestones ─────────────────────────────────────────────────────── */

export function ProfileMilestones({ stats, history }: { stats: PlayerStats | null; history: ProfileMatch[] | null }) {
  const favourite = stats?.favoriteGame as string | undefined;
  const name = favourite === "mindi" ? "Mindi"
    : ["gin-rummy", "gin_rummy"].includes(favourite || "") ? "Gin Rummy"
    : favourite || null;
  const played = name && history ? history.filter((match) => match.game === name).length : null;

  const trophies = stats?.trophies ?? 0;
  const tiers = [RANKS.BRONZE, RANKS.SILVER, RANKS.GOLD, RANKS.PLATINUM];
  const highest = stats?.highestRank || stats?.currentRank || "Bronze";
  const index = tiers.findIndex((tier) => tier.name === highest);
  const floor = tiers[index]?.min ?? 0;
  const next = tiers[index + 1];
  const span = next ? next.min - floor : 0;
  const progress = next && span > 0 ? (trophies - floor) / span : 1;
  const remaining = next ? Math.max(0, next.min - trophies) : 0;

  return (
    <div className="panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div className="ph"><h2>Milestones</h2></div>

      <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,.035)" }}>
        <span className="tile" style={{ padding: 0, boxShadow: "none", background: "none" }}>
          <span className="ti" aria-hidden="true"><Heart /></span>
        </span>
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <span className="lbl">Favorite Game</span>
          <div className="disp" style={{ fontSize: "20px", marginTop: "6px" }}>
            {name || "None yet"}
          </div>
        </div>
        <span className="muted2">
          {played === null ? "Play a few matches" : `${played} ${played === 1 ? "match" : "matches"}`}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,.035)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <RankHex tier={highest} width={36} height={40}><Crown style={{ width: "18px", height: "18px" }} /></RankHex>
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <span className="lbl">Highest Rank</span>
            <div className="disp" style={{ fontSize: "20px", marginTop: "6px", color: "#E6C24A" }}>{highest}</div>
          </div>
          <span className="muted2">{next ? `${trophies} / ${next.min}` : `${trophies}`}</span>
        </div>
        <Meter
          value={progress}
          segmented
          label={next ? `Progress to ${next.name}` : "Highest rank reached"}
          valueText={next ? `${remaining} trophies to ${next.name}` : "Top tier"}
        />
        <span className="muted2">
          {next ? `${remaining} ${remaining === 1 ? "trophy" : "trophies"} to ${next.name}` : "You are at the top tier."}
        </span>
      </div>
    </div>
  );
}

/* ── Match History ──────────────────────────────────────────────────── */

/** The board's three mode pills: league blue, ranked outlined, casual dim. */
function modeTone(mode: string): "blue" | "line" | "dim" {
  const value = mode.toLowerCase();
  if (value.includes("league") || value.includes("weekend")) return "blue";
  if (value.includes("ranked")) return "line";
  return "dim";
}

export function ProfileHistory({ records }: { records: ProfileMatch[] }) {
  if (records.length === 0) {
    return (
      <section className="panel tick" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div className="ph" style={{ marginBottom: "6px" }}>
          <h2>Match History</h2><span className="lbl">Latest 50 online records</span>
        </div>
        <p className="muted">No online matches yet. Play one and it will show up here.</p>
      </section>
    );
  }
  return (
    <section className="panel tick" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <div className="ph" style={{ marginBottom: "6px" }}>
        <h2>Match History</h2><span className="lbl">Latest 50 online records</span>
      </div>
      <div className="hist head lbl" role="row">
        <span />
        <span role="columnheader">Game</span>
        <span role="columnheader">Mode</span>
        <span role="columnheader">Result</span>
        <span role="columnheader">Score</span>
        <span role="columnheader" style={{ textAlign: "right" }}>Date</span>
      </div>
      {records.map((match) => (
        <div className="hist" key={match.id} role="row">
          <span className={`gi ${match.game === "Mindi" ? "" : "g"}`.trim()} aria-hidden="true">
            {match.game === "Mindi" ? "M" : "G"}
          </span>
          <b style={{ fontSize: "15px" }}>{match.game}</b>
          <Pill tone={modeTone(match.mode)} className="justify-self-start">{match.mode}</Pill>
          {match.result === "Win" || match.result === "Loss" ? (
            <span className={`res ${match.result === "Win" ? "w" : "l"}`}>{match.result}</span>
          ) : (
            <span className="res l">{match.result === "Draw" ? "Draw" : "--"}</span>
          )}
          <span className="tnum" style={{ fontWeight: 600 }}>{match.score}</span>
          <span className="muted2" style={{ textAlign: "right" }}>
            {new Date(match.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </div>
      ))}
    </section>
  );
}
