"use client";

import Link from "next/link";
import {
  CalendarDays, Clock3, Copy, Crown, Grid2X2, Heart, LockKeyhole, Medal, Pencil,
  Settings, Swords, Target, Trophy, TrendingUp, ChevronRight,
} from "lucide-react";
import { RANKS } from "@/constants/ranks";
import type { PlayerStats } from "@/types";
import type { ProfileMatch } from "@/lib/profileHistory";
import type { ResolvedAchievement } from "@/lib/achievements";
import { RankHex, RankLabel } from "@/components/arena";
import { metric } from "../ProfileSections";

/**
 * Profile on a phone - design/arena/boards/LProfile.dc.html,
 * design/arena/screens/landscape/landscape-02-profile.jpg.
 *
 * Section chips across the top. Then the player card on the left (312px)
 * beside Statistics, four across, and Game Stats - Mindi and Gin Rummy, each
 * a win-rate ring with its numbers. Below: Achievements as a side scroller,
 * then Milestones with the "Next at the table" slot beside Match History.
 * The page scrolls; the rail and the top bar stay.
 *
 * The page owns every figure and passes it in (the same props the wide
 * screen reads), so the two can never disagree about one player.
 */

const TIERS = [RANKS.BRONZE, RANKS.SILVER, RANKS.GOLD, RANKS.PLATINUM];
const CIRCUMFERENCE = 2 * Math.PI * 40;

export interface LandProfileProps {
  name: string;
  tier: string;
  stats: PlayerStats | null;
  /** Null while loading, [] when there are none. */
  history: ProfileMatch[] | null;
  achievements: ResolvedAchievement[];
  /** The board masks the address: first letter, then dots. */
  maskedEmail: string | null;
  memberSince: Date | null;
  admin: boolean;
  tab: "overview" | "stats" | "history";
  onTab: (next: "overview" | "stats" | "history") => void;
  onEdit: () => void;
  onCopyId: () => void;
}

export function LandProfile(p: LandProfileProps) {
  const card = (
    <section className="banner" aria-label="Player card" style={{ justifyContent: "space-between" }}>
      <div className="word" aria-hidden="true">{p.tier.toUpperCase()}</div>
      <button type="button" className="ibtn" aria-label="Edit Profile" onClick={p.onEdit}
        style={{ position: "absolute", right: 12, top: 12, width: 36, height: 36, background: "rgba(0,0,0,.5)" }}>
        <Pencil aria-hidden="true" />
      </button>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 22 }}>
        <div className="bigav">
          {p.name.charAt(0).toUpperCase()}
          <span className="rkpin">
            <RankHex tier={p.tier} width={30} height={34} label={`${p.tier} rank`}><Crown style={{ width: 15, height: 15 }} /></RankHex>
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <h2 className="disp" style={{ margin: 0, fontSize: 30 }}>{p.name}</h2>
          <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <RankLabel tier={p.tier} style={{ fontSize: 11 }} markStyle={{ width: 12, height: 14 }} />
            {p.admin && <span className="pill line">Admin</span>}
          </span>
          {p.maskedEmail && <span className="muted" style={{ fontSize: 12 }}>{p.maskedEmail}</span>}
        </div>
      </div>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 9 }}>
        {p.stats?.playerCode && (
          <span className="idchip">
            <span>ID</span>{p.stats.playerCode}
            <button type="button" aria-label="Copy player ID" onClick={p.onCopyId} data-flat><Copy aria-hidden="true" /></button>
          </span>
        )}
        <span className="pmeta"><Trophy aria-hidden="true" />{metric(p.stats?.trophies)} trophies</span>
        {p.memberSince && Number.isFinite(p.memberSince.getTime()) && (
          <span className="pmeta">
            <CalendarDays aria-hidden="true" />
            Member since {p.memberSince.toLocaleDateString(undefined, { month: "short", year: "numeric" })}
          </span>
        )}
      </div>
    </section>
  );

  return (
    <div className="arena-land is-m is-land arena-lprofile">
      <div className="mpage">
        {/* Five labels will not fit as equal segments, so the board uses the
            chip row. Achievements and Settings are separate routes in the
            app, so those two are links: same row, and middle-click works. */}
        <div className="chips" role="tablist" aria-label="Profile sections">
          <button type="button" aria-pressed={p.tab === "overview"} onClick={() => p.onTab("overview")} data-flat>
            <Grid2X2 aria-hidden="true" />Overview
          </button>
          <button type="button" aria-pressed={p.tab === "stats"} onClick={() => p.onTab("stats")} data-flat>
            <Trophy aria-hidden="true" />Game Stats
          </button>
          <Link href="/achievements/"><Medal aria-hidden="true" />Achievements</Link>
          <button type="button" aria-pressed={p.tab === "history"} onClick={() => p.onTab("history")} data-flat>
            <Clock3 aria-hidden="true" />History
          </button>
          <Link href="/settings/"><Settings aria-hidden="true" />Settings</Link>
        </div>

        {p.tab === "history" ? (
          <div className="cols sideL2 stretch">
            {card}
            <History records={p.history} />
          </div>
        ) : (
          <div className="cols sideL2 stretch">
            {card}
            <div className="stk">
              <Statistics stats={p.stats} />
              <GameStats history={p.history} />
            </div>
          </div>
        )}

        {p.tab === "overview" && (
          <>
            <Achievements achievements={p.achievements} />
            <div className="cols c2 stretch">
              <div className="stk">
                <Milestones stats={p.stats} history={p.history} tier={p.tier} />
                {/* The board's slot for a third game. It is a real
                    placeholder, not decoration, so it says so. */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 14, border: "1.5px dashed rgba(255,255,255,.18)" }}>
                  <LockKeyhole aria-hidden="true" style={{ flex: "none", width: 20, height: 20, color: "#6A6A78" }} />
                  <b className="disp" style={{ fontSize: 13, color: "#BEBECA" }}>Next at the table</b>
                  <span className="pill dim" style={{ marginLeft: "auto" }}>Coming soon</span>
                </div>
              </div>
              {/* Overview keeps to the latest five, as the board draws it;
                  the History chip lists them all. */}
              <History records={p.history ? p.history.slice(0, 5) : null} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Statistics ─────────────────────────────────────────────────────── */

function Statistics({ stats }: { stats: PlayerStats | null }) {
  const matches = stats?.totalMatches;
  const wins = stats?.wins;
  const losses = stats?.losses;
  const rate = stats && Number.isFinite(matches) && matches ? `${Math.round(((wins ?? 0) / matches) * 100)}%` : "--";
  return (
    <section className="panel tick" aria-label="Statistics" style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="ph"><h2>Statistics</h2><span className="lbl">All time</span></div>
      <div className="cols c4" style={{ gap: 8 }}>
        <div className="lstat"><Swords aria-hidden="true" /><b style={{ fontSize: 22 }}>{metric(matches)}</b><span>Matches</span></div>
        <div className="lstat"><Trophy aria-hidden="true" /><b style={{ fontSize: 22 }}>{metric(wins)}</b><span>Wins</span></div>
        <div className="lstat"><Target aria-hidden="true" style={{ color: "#00BCC8" }} /><b style={{ fontSize: 22 }}>{metric(losses)}</b><span>Losses</span></div>
        <div className="lstat"><TrendingUp aria-hidden="true" style={{ color: "#00BCC8" }} /><b style={{ fontSize: 22 }}>{rate}</b><span>Win rate</span></div>
      </div>
    </section>
  );
}

/* ── Game Stats ─────────────────────────────────────────────────────── */

function WinRateRing({ rate, label }: { rate: number | null; label: string }) {
  const shown = rate ?? 0;
  return (
    <div className="wr" role="img" aria-label={rate === null ? `${label} win rate unavailable` : `${label} win rate ${shown} per cent`}>
      <svg viewBox="0 0 96 96" aria-hidden="true">
        <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="8" />
        <circle cx="48" cy="48" r="40" fill="none" stroke="#C6FF33" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE.toFixed(1)} strokeDashoffset={(CIRCUMFERENCE * (1 - shown / 100)).toFixed(1)} />
      </svg>
      <b>{rate === null ? "--" : `${shown}%`}</b>
    </div>
  );
}

function GameStats({ history }: { history: ProfileMatch[] | null }) {
  return (
    <section className="panel tick b" aria-label="Game Stats" style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 10, flex: "1 1 0" }}>
      <div className="ph"><h2>Game Stats</h2><span className="lbl">Recent online</span></div>
      <div className="cols c2 stretch" style={{ gap: 8, flex: "1 1 0" }}>
        {(["Mindi", "Gin Rummy"] as const).map((game) => {
          const records = history?.filter((match) => match.game === game);
          const known = records?.every((match) => match.result !== "Unavailable") ?? false;
          const wins = records?.filter((match) => match.result === "Win").length ?? 0;
          const rate = known && records && records.length ? Math.round((wins / records.length) * 100) : null;
          return (
            <div className={`game ${game === "Mindi" ? "mi" : "gi"}`} key={game} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
                <b className="disp" style={{ fontSize: 17, whiteSpace: "nowrap" }}>{game}</b>
                <WinRateRing rate={rate} label={game} />
              </div>
              <div className="nums" style={{ marginLeft: "auto" }}>
                <div><b>{metric(records?.length)}</b><span>Matches</span></div>
                <div><b>{known ? wins : "--"}</b><span>Wins</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Achievements ───────────────────────────────────────────────────── */

function Achievements({ achievements }: { achievements: ResolvedAchievement[] }) {
  if (achievements.length === 0) return null;
  return (
    <section className="sec" aria-label="Achievements">
      <div className="sech">
        <h2>Achievements</h2>
        <Link className="link" href="/achievements/">View All<ChevronRight aria-hidden="true" /></Link>
      </div>
      <div className="hs">
        {achievements.slice(0, 5).map((item) => {
          const target = Math.max(1, item.target);
          const progress = Math.max(0, Math.min(target, item.displayProgress));
          const pct = Math.round((progress / target) * 100);
          const isRank = item.category === "rank";
          return (
            <div className={`ach ${item.unlocked ? "done" : ""}`.trim()} key={item.id}>
              <span className={`ai ${item.unlocked ? "" : "lockd"}`.trim()} aria-hidden="true"
                style={isRank && item.unlocked ? { background: "linear-gradient(160deg, #FFE58A, #E0B52E 55%, #9A7512)" } : undefined}>
                {isRank ? <Crown /> : <Trophy />}
              </span>
              <h4>{item.title}</h4>
              <div className="meter thin" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
                aria-label={item.title} aria-valuetext={`${progress} of ${target}`}>
                <i style={{ width: `${pct}%` }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="muted2">{progress}/{target}</span>
                <span className={`pill ${item.unlocked ? "lime" : "dim"}`} style={{ height: 20 }}>
                  {item.unlocked ? "Unlocked" : progress > 0 ? "In progress" : "Locked"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Milestones ─────────────────────────────────────────────────────── */

function Milestones({ stats, history, tier }: { stats: PlayerStats | null; history: ProfileMatch[] | null; tier: string }) {
  const favourite = stats?.favoriteGame as string | undefined;
  const name = favourite === "mindi" ? "Mindi"
    : ["gin-rummy", "gin_rummy"].includes(favourite || "") ? "Gin Rummy"
    : favourite || null;
  const played = name && history ? history.filter((match) => match.game === name).length : null;

  const trophies = stats?.trophies ?? 0;
  const highest = stats?.highestRank || stats?.currentRank || tier;
  const index = TIERS.findIndex((entry) => entry.name === highest);
  const floor = TIERS[index]?.min ?? 0;
  const next = TIERS[index + 1];
  const span = next ? next.min - floor : 0;
  const progress = next && span > 0 ? Math.min(1, Math.max(0, (trophies - floor) / span)) : 1;
  const remaining = next ? Math.max(0, next.min - trophies) : 0;
  const pct = Math.round(progress * 100);

  return (
    <section className="panel" aria-label="Milestones" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="ph"><h2>Milestones</h2></div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, borderRadius: 12, background: "rgba(255,255,255,.035)" }}>
        <span className="lstat" aria-hidden="true" style={{ padding: 0, boxShadow: "none", width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 10, background: "rgba(198,255,51,.12)" }}>
          <Heart />
        </span>
        <div style={{ flexGrow: 1 }}>
          <span className="lbl">Favorite Game</span>
          <div className="disp" style={{ fontSize: 18, marginTop: 6 }}>{name || "None yet"}</div>
        </div>
        <span className="muted2">{played === null ? "Play a few matches" : `${played} ${played === 1 ? "match" : "matches"}`}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, padding: 10, borderRadius: 12, background: "rgba(255,255,255,.035)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <RankHex tier={highest} width={30} height={34}><Crown style={{ width: 15, height: 15 }} /></RankHex>
          <div style={{ flexGrow: 1 }}>
            <span className="lbl">Highest Rank</span>
            <div className="disp" style={{ fontSize: 18, marginTop: 6, color: "#E6C24A" }}>{highest}</div>
          </div>
          <span className="muted2">{next ? `${trophies} / ${next.min}` : `${trophies}`}</span>
        </div>
        <div className="meter seg" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
          aria-label={next ? `Progress to ${next.name}` : "Highest rank reached"}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <span className="muted2">{next ? `${remaining} ${remaining === 1 ? "trophy" : "trophies"} to ${next.name}` : "You are at the top tier."}</span>
      </div>
    </section>
  );
}

/* ── Match History ──────────────────────────────────────────────────── */

function History({ records }: { records: ProfileMatch[] | null }) {
  return (
    <section className="panel tick" aria-label="Match History" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 7 }}>
      <div className="ph" style={{ marginBottom: 4 }}><h2>Match History</h2><span className="lbl">Latest 50</span></div>
      {records === null ? (
        <p className="muted" style={{ margin: 0 }}>Loading your matches…</p>
      ) : records.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>No online matches yet. Play one and it will show up here.</p>
      ) : records.map((match) => (
        <div className="hrow" key={match.id}>
          <span className={`gi ${match.game === "Mindi" ? "" : "g"}`.trim()} aria-hidden="true">{match.game === "Mindi" ? "M" : "G"}</span>
          <div className="tx">
            <b>{match.game}</b>
            <span className="muted2">{match.mode} · {new Date(match.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          </div>
          <div className="rt">
            {match.result === "Win" || match.result === "Loss"
              ? <span className={`res ${match.result === "Win" ? "w" : "l"}`}>{match.result}</span>
              : <span className="res l">{match.result === "Draw" ? "Draw" : "--"}</span>}
            <span className="muted2 tnum" style={{ color: "#E4E4EA" }}>{match.score}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
