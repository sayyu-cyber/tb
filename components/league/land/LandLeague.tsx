"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowRight, BadgeCheck, Crown, Flame, Info, RefreshCw, Shield, Swords, Trophy } from "lucide-react";
import type { WeeklyStanding } from "@/lib/weekendLeague";
import { Avatar, CoinGem, RankLabel } from "@/components/arena";

/**
 * Weekend League on a phone - design/arena/boards/LLeague.dc.html,
 * design/arena/screens/landscape/landscape-09-weekend-league.jpg.
 *
 * The hero with the countdown and the qualify pill on the left; the Mindi
 * and Gin Rummy buttons over the Weekend Champion panel on the right. Then
 * How it works as four rule cards, and the standings in two columns with
 * your row lit. The page scrolls.
 *
 * The page works out the window, the countdown, qualification and the
 * standings (app/tournament/page.tsx) and passes them in, the same figures
 * the wide screen shows. Outside the window, or unqualified, the two game
 * buttons are disabled rather than hidden, as on the wide screen.
 */

export interface LandLeagueProps {
  live: boolean;
  title: string;
  lede: string;
  cells: { value: number; label: string }[];
  qualified: boolean;
  rank: string;
  notQualified: string;
  onMindi: () => void;
  onGin: () => void;
  rules: { Icon: LucideIcon; tone: string; title: string; body: string }[];
  howItWorks: string;
  standings: WeeklyStanding[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  myUid: string | undefined;
  noQualified: string;
  retryText: string;
}

const MEDAL = ["#FFC940", "#D2D6DA", "#E09A62"];

export function LandLeague(p: LandLeagueProps) {
  // Two columns, filled down the left first, as the board lists them.
  const half = Math.ceil(p.standings.length / 2);
  const columns = [p.standings.slice(0, half), p.standings.slice(half)];
  const note = (
    <p className="muted2" style={{ margin: "auto 4px 4px", display: "flex", alignItems: "center", gap: 8, lineHeight: 1.35 }}>
      <Info aria-hidden="true" style={{ flex: "none", width: 14, height: 14, color: "#00BCC8" }} />
      Silver rank and up only. Standings follow weekly trophies.
    </p>
  );

  return (
    <div className="arena-land is-m is-land arena-lleague">
      <div className="mpage">
        <div className="cols sideR2 stretch fit">
          <section className="leaguehero" aria-label="Weekend League status">
            <div className="word" aria-hidden="true">LEAGUE</div>
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
              <span className="flame" aria-hidden="true"><Flame /></span>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="lbl" style={{ color: "#8AF0F5" }}>Weekend League</span>
                {p.live ? <span className="pill lime live">Live</span> : <span className="pill line">Fri – Sat</span>}
              </span>
            </div>
            <h1 className="disp chrome" style={{ position: "relative", margin: "14px 0 0", fontSize: 38, lineHeight: 0.92 }}>
              {p.live ? <>Weekend League<br />is live</> : p.title}
            </h1>
            <p className="body" style={{ position: "relative", margin: "10px 0 0", fontSize: 13.5, maxWidth: 340 }}>{p.lede}</p>
            <div style={{ position: "relative", marginTop: "auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div className="cd" aria-label={p.live ? "Time left" : "Time until it opens"}>
                {p.cells.map(({ value, label }) => (
                  <div key={label}><b>{String(value).padStart(2, "0")}</b><span className="lbl" style={{ fontSize: 9.5 }}>{label}</span></div>
                ))}
              </div>
              {p.qualified
                ? <span className="pill lime" style={{ height: 32, padding: "0 12px" }}><BadgeCheck aria-hidden="true" />You qualify · {p.rank}</span>
                : <span className="pill line" style={{ height: 32, padding: "0 12px" }}><Shield aria-hidden="true" />{p.notQualified}</span>}
            </div>
          </section>

          <div className="stk">
            <button type="button" className="gbtn" style={{ marginBottom: 6 }} disabled={!p.live || !p.qualified} onClick={p.onMindi} data-flat>
              <Swords aria-hidden="true" />
              <span><b>Mindi</b><small>Double trophies · 4 players</small></span>
              <ArrowRight aria-hidden="true" style={{ marginLeft: "auto" }} />
            </button>
            <button type="button" className="gbtn b" style={{ marginBottom: 6 }} disabled={!p.live || !p.qualified} onClick={p.onGin} data-flat>
              <Swords aria-hidden="true" />
              <span><b>Gin Rummy</b><small>Double trophies · 2 players</small></span>
              <ArrowRight aria-hidden="true" style={{ marginLeft: "auto" }} />
            </button>
            <section className="panel tick b" aria-label="Weekend Champion"
              style={{ padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 8, flex: "1 1 0", minHeight: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span aria-hidden="true" style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 50, clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)", background: "linear-gradient(160deg, #FFE58A, #E0B52E 55%, #9A7512)", color: "#2A1F04" }}>
                  <Crown style={{ width: 21, height: 21 }} />
                </span>
                <div style={{ flex: "1 1 0", minWidth: 0 }}>
                  <span className="lbl" style={{ fontSize: 9.5 }}>Weekend Champion</span>
                  <div className="disp" style={{ fontSize: 17, lineHeight: 1.05, marginTop: 7 }}>Become Weekend Champion</div>
                </div>
              </div>
              <div className="divider" />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="muted2" style={{ fontSize: 12 }}>Achievement</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display), sans-serif", fontWeight: 700, fontSize: 18 }}>
                  <CoinGem small />3,000
                </span>
              </div>
            </section>
          </div>
        </div>

        <section aria-label="Rules" className="sec" style={{ gap: 10 }}>
          <div className="sech"><h2>{p.howItWorks}</h2></div>
          <div className="cols c4 stretch" style={{ gap: 8 }}>
            {p.rules.map(({ Icon, tone, title, body }) => (
              <div className="rule" key={title}>
                <span className={`ri ${tone}`.trim()} aria-hidden="true"><Icon /></span>
                <div><b>{title}</b><span className="d">{body}</span></div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel tick" aria-label="This week's standings" style={{ padding: "14px 12px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="ph" style={{ margin: "2px 4px 0" }}><h2>This Week&apos;s Standings</h2><span className="lbl">Weekly trophies</span></div>
          {p.loading ? (
            <p className="muted2" style={{ margin: 4 }}>Loading standings...</p>
          ) : p.error ? (
            <p className="muted2" style={{ margin: 4 }}>
              Standings could not be loaded.{" "}
              <button type="button" className="link" onClick={p.onRetry} data-flat><RefreshCw aria-hidden="true" />{p.retryText}</button>
            </p>
          ) : p.standings.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: 4 }}>
              <Trophy aria-hidden="true" style={{ width: 22, height: 22, color: "#3A3A46" }} />
              <p className="muted" style={{ margin: 0 }}>{p.noQualified}</p>
            </div>
          ) : (
            <div className="cols c2" style={{ gap: 12 }}>
              {columns.map((column, side) => (
                <div className="stk" style={{ gap: 3 }} key={side}>
                  {column.map((standing, i) => {
                    const index = side === 0 ? i : half + i;
                    const mine = standing.uid === p.myUid;
                    return (
                      <div className={`srow ${mine ? "me" : ""}`.trim()} key={standing.uid}>
                        <span className="pos" style={{ color: mine ? "#C6FF33" : MEDAL[index] }}>{index + 1}</span>
                        <span className="nm3">
                          <Avatar name={standing.displayName} seed={standing.uid} size={30} radius={10} style={{ fontSize: 13 }} />
                          <b>{standing.displayName}</b>
                          {mine
                            ? <span className="pill lime" style={{ height: 18, padding: "0 6px", fontSize: 9.5 }}>You</span>
                            : <RankLabel tier={standing.currentRank}>{""}</RankLabel>}
                        </span>
                        <span className="wt">{standing.weeklyTrophies.toLocaleString()}</span>
                      </div>
                    );
                  })}
                  {side === 1 && note}
                </div>
              ))}
            </div>
          )}
          {!p.loading && !p.error && p.standings.length === 0 && note}
        </section>
      </div>
    </div>
  );
}
