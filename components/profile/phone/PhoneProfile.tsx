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
 * Profile on a phone held upright — design/arena/boards/MProfile.dc.html,
 * design/arena/screens/phone/phone-02-profile.jpg.
 *
 * The same seven sections as the wide screen: the tabs become a scrolling
 * `.chips` row (MOBILE.md "Tabs" - five labels will not fit as equal
 * segments), the player card stacks its avatar beside the name instead of
 * spreading across the banner, Statistics and Game Stats become 2x2 grids,
 * Achievements becomes an `.hs` side-scroller, and Match History's six-column
 * table becomes a row per match with the result and the score stacked on the
 * right. Nothing is dropped.
 *
 * The page owns every figure and passes it in, so the wide screen and this
 * one read one profile, one history and one achievement list between them.
 */

const TIERS = [RANKS.BRONZE, RANKS.SILVER, RANKS.GOLD, RANKS.PLATINUM];
const CIRCUMFERENCE = 2 * Math.PI * 40;

export interface PhoneProfileProps {
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

export function PhoneProfile(p: PhoneProfileProps) {
  return (
    <div className="arena-mprofile mpage">
      <div className="mh">
        <span className="lbl dash" style={{ color: "#C6FF33" }}>Your stats &amp; achievements</span>
        <h1 className="disp chrome">Profile</h1>
      </div>

      {/* Five labels will not fit as equal segments, so the board uses the
          scrolling chip row - MOBILE.md "Tabs". Achievements and Settings
          are separate routes in the app, so those two are links: same tray,
          and middle-click still works. */}
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

      <section className="banner" aria-label="Player card">
        <div className="word" aria-hidden="true">{p.tier}</div>
        <button
          type="button"
          className="ibtn"
          aria-label="Edit Profile"
          onClick={p.onEdit}
          style={{ position: "absolute", right: 14, top: 14, width: 40, height: 40, background: "rgba(0,0,0,.5)" }}
          data-flat
        >
          <Pencil aria-hidden="true" />
        </button>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 20 }}>
          <div className="bigav">
            {p.name.charAt(0).toUpperCase()}
            <span className="rkpin">
              <RankHex tier={p.tier} width={34} height={38} label={`${p.tier} rank`}>
                <Crown style={{ width: 17, height: 17 }} />
              </RankHex>
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, minWidth: 0 }}>
            <h2 className="disp" style={{ margin: 0, fontSize: 36 }}>{p.name}</h2>
            <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <RankLabel tier={p.tier} />
              {p.admin && <span className="pill line">Admin</span>}
            </span>
            {p.maskedEmail && <span className="muted" style={{ fontSize: 12.5 }}>{p.maskedEmail}</span>}
          </div>
        </div>
        <div style={{ position: "relative", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 16px" }}>
          {p.stats?.playerCode && (
            <span className="idchip">
              <span>ID</span>{p.stats.playerCode}
              <button type="button" aria-label="Copy player ID" onClick={p.onCopyId} data-flat>
                <Copy aria-hidden="true" />
              </button>
            </span>
          )}
          <span className="meta"><Trophy aria-hidden="true" />{metric(p.stats?.trophies)} trophies</span>
          {p.memberSince && Number.isFinite(p.memberSince.getTime()) && (
            <span className="meta">
              <CalendarDays aria-hidden="true" />
              Member since {p.memberSince.toLocaleDateString(undefined, { month: "short", year: "numeric" })}
            </span>
          )}
        </div>
      </section>

      {p.tab !== "history" && (
        <>
          <Statistics stats={p.stats} />
          <GameStats history={p.history} />
        </>
      )}

      {p.tab === "overview" && (
        <>
          <Achievements achievements={p.achievements} />
          <Milestones stats={p.stats} history={p.history} tier={p.tier} />
        </>
      )}

      <History records={p.history} />
    </div>
  );
}

/* ── Statistics ─────────────────────────────────────────────────────── */

function Statistics({ stats }: { stats: PlayerStats | null }) {
  const matches = stats?.totalMatches;
  const wins = stats?.wins;
  const losses = stats?.losses;
  const rate = stats && Number.isFinite(matches) && matches
    ? `${Math.round(((wins ?? 0) / matches) * 100)}%`
    : "--";
  return (
    <section className="panel tick" aria-label="Statistics" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="ph"><h2>Statistics</h2><span className="lbl">All time</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <Tile icon={<Swords />} value={metric(matches)} label="Matches" />
        <Tile icon={<Trophy />} value={metric(wins)} label="Wins" />
        <Tile icon={<Target />} value={metric(losses)} label="Losses" tone="b" />
        <Tile icon={<TrendingUp />} value={rate} label="Win Rate" tone="b" />
      </div>
    </section>
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

function GameStats({ history }: { history: ProfileMatch[] | null }) {
  return (
    <section className="panel tick b" aria-label="Game Stats" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="ph"><h2>Game Stats</h2><span className="lbl">Recent online</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        {(["Mindi", "Gin Rummy"] as const).map((game) => {
          const records = history?.filter((match) => match.game === game);
          // A match whose result couldn't be read is not a loss. If any
          // record is unknown the rate is withheld rather than guessed.
          const known = records?.every((match) => match.result !== "Unavailable") ?? false;
          const wins = records?.filter((match) => match.result === "Win").length ?? 0;
          const rate = known && records && records.length ? Math.round((wins / records.length) * 100) : null;
          return (
            <div className={`game ${game === "Mindi" ? "mi" : "gi"}`} key={game}>
              {game === "Mindi" ? (
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
                  <b className="disp" style={{ fontSize: 20 }}>Mindi</b>
                  <span className="thaana" lang="dv" dir="rtl" style={{ fontSize: 13 }}>މިންޑި</span>
                </div>
              ) : (
                <b className="disp" style={{ fontSize: 20, whiteSpace: "nowrap" }}>Gin Rummy</b>
              )}
              <WinRateRing rate={rate} label={game} />
              <div className="nums">
                <div><b>{metric(records?.length)}</b><span>Matches</span></div>
                <div><b>{known ? wins : "--"}</b><span>Wins</span></div>
              </div>
            </div>
          );
        })}
      </div>
      {/* The board's third slot, a full-width row here. It is a real
          placeholder for a third game, not decoration, so it says so. */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, border: "1.5px dashed rgba(255,255,255,.18)" }}>
        <LockKeyhole aria-hidden="true" style={{ flex: "none", width: 22, height: 22, color: "#6A6A78" }} />
        <b className="disp" style={{ fontSize: 14, color: "#BEBECA" }}>Next at the table</b>
        <span className="pill dim" style={{ marginLeft: "auto" }}>Coming soon</span>
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
          // The board gives the rank achievement a gold hex rather than the
          // lime one, so the two read apart at a glance.
          const isRank = item.category === "rank";
          return (
            <div className={`ach ${item.unlocked ? "done" : ""}`.trim()} key={item.id}>
              <span
                className={`ai ${item.unlocked ? "" : "lockd"}`.trim()}
                aria-hidden="true"
                style={isRank && item.unlocked ? { background: "linear-gradient(160deg, #FFE58A, #E0B52E 55%, #9A7512)" } : undefined}
              >
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
    <section className="panel" aria-label="Milestones" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="ph"><h2>Milestones</h2></div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 12, borderRadius: 12, background: "rgba(255,255,255,.035)" }}>
        <span className="tile" style={{ padding: 0, boxShadow: "none", background: "none" }}>
          <span className="ti" aria-hidden="true"><Heart /></span>
        </span>
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <span className="lbl">Favorite Game</span>
          <div className="disp" style={{ fontSize: 19, marginTop: 6 }}>{name || "None yet"}</div>
        </div>
        <span className="muted2">{played === null ? "Play a few matches" : `${played} ${played === 1 ? "match" : "matches"}`}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12, borderRadius: 12, background: "rgba(255,255,255,.035)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <RankHex tier={highest} width={34} height={38}><Crown style={{ width: 16, height: 16 }} /></RankHex>
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <span className="lbl">Highest Rank</span>
            <div className="disp" style={{ fontSize: 19, marginTop: 6, color: "#E6C24A" }}>{highest}</div>
          </div>
          <span className="muted2">{next ? `${trophies} / ${next.min}` : `${trophies}`}</span>
        </div>
        <div className="meter seg" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
             aria-label={next ? `Progress to ${next.name}` : "Highest rank reached"}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <span className="muted2">
          {next ? `${remaining} ${remaining === 1 ? "trophy" : "trophies"} to ${next.name}` : "You are at the top tier."}
        </span>
      </div>
    </section>
  );
}

/* ── Match History ──────────────────────────────────────────────────── */

function History({ records }: { records: ProfileMatch[] | null }) {
  return (
    <section className="panel tick" aria-label="Match History" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="ph" style={{ marginBottom: 6 }}>
        <h2>Match History</h2><span className="lbl">Latest 50</span>
      </div>
      {records === null ? (
        <p className="muted">Loading your matches…</p>
      ) : records.length === 0 ? (
        <p className="muted">No online matches yet. Play one and it will show up here.</p>
      ) : records.map((match) => (
        <div className="hrow" key={match.id}>
          <span className={`gi ${match.game === "Mindi" ? "" : "g"}`.trim()} aria-hidden="true">
            {match.game === "Mindi" ? "M" : "G"}
          </span>
          <div className="tx">
            <b>{match.game}</b>
            <span className="muted2">
              {match.mode} · {new Date(match.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
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
