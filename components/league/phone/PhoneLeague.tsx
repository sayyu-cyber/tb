"use client";

import { ArrowRight, BadgeCheck, Crown, Flame, RefreshCw, Shield, Swords, Trophy } from "lucide-react";
import type { WeeklyStanding } from "@/lib/weekendLeague";
import { Avatar, RankLabel, CoinGem } from "@/components/arena";

/**
 * Weekend League on a phone held upright —
 * design/arena/boards/MLeague.dc.html,
 * design/arena/screens/phone/phone-09-weekend-league.jpg.
 *
 * The wide screen puts the hero, the two game buttons, the rules and the
 * champion card down the left with the standings beside them. The board
 * stacks all five in that order, the title drops to 40px, the countdown
 * shows hours and minutes rather than days, and the rules go two-up.
 * Nothing is dropped.
 *
 * Every class is the board's own and the same one the wide screen uses -
 * `.leaguehero`, `.cd`, `.gbtn`, `.rule`, `.srow` - so the two are the same
 * picture at two sizes rather than two designs.
 */
export function PhoneLeague({
  live, title, lede, cells, qualified, rank, notQualified,
  onMindi, onGin, rules, standings, loading, error, onRetry, myUid, noQualified, retryText,
}: {
  live: boolean;
  title: string;
  lede: string;
  cells: { value: number; label: string }[];
  qualified: boolean;
  rank: string;
  notQualified: string;
  onMindi: () => void;
  onGin: () => void;
  rules: { Icon: React.ComponentType; tone: string; title: string; body: string }[];
  standings: WeeklyStanding[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  myUid: string | undefined;
  noQualified: string;
  retryText: string;
}) {
  return (
    <div className="arena-mleague mpage">
      <section className="leaguehero" aria-label="Weekend League status">
        <div className="word" aria-hidden="true">LEAGUE</div>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14 }}>
          <span className="flame" aria-hidden="true"><Flame /></span>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="lbl" style={{ color: "#8AF0F5" }}>Weekend League</span>
            {live ? <span className="pill lime live">Live</span> : <span className="pill line">Fri – Sat</span>}
          </span>
        </div>
        <h1 className="disp chrome" style={{ position: "relative", margin: "16px 0 0", fontSize: 40, lineHeight: 0.92 }}>
          {title}
        </h1>
        <p className="body" style={{ position: "relative", margin: "12px 0 18px" }}>{lede}</p>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div className="cd" aria-label={live ? "Time left" : "Time until it opens"}>
            {cells.map(({ value, label }) => (
              <div key={label}>
                <b>{String(value).padStart(2, "0")}</b>
                <span className="lbl" style={{ fontSize: 9.5 }}>{label}</span>
              </div>
            ))}
          </div>
          {qualified ? (
            <span className="pill lime" style={{ height: 32, padding: "0 12px" }}>
              <BadgeCheck aria-hidden="true" />You qualify · {rank}
            </span>
          ) : (
            <span className="pill line" style={{ height: 32, padding: "0 12px" }}>
              <Shield aria-hidden="true" />{notQualified}
            </span>
          )}
        </div>
      </section>

      {/* Both buttons stay when the window is shut or the player does not
          qualify - disabled rather than hidden, so what is coming is still
          visible. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <button type="button" className="gbtn" disabled={!live || !qualified} onClick={onMindi} data-flat>
          <Swords aria-hidden="true" />
          <span><b>Mindi</b><small>Double trophies · 4 players</small></span>
          <ArrowRight aria-hidden="true" style={{ marginLeft: "auto" }} />
        </button>
        <button type="button" className="gbtn b" disabled={!live || !qualified} onClick={onGin} data-flat>
          <Swords aria-hidden="true" />
          <span><b>Gin Rummy</b><small>Double trophies · 2 players</small></span>
          <ArrowRight aria-hidden="true" style={{ marginLeft: "auto" }} />
        </button>
      </div>

      <section className="panel" aria-label="League rules"
        style={{ padding: 12, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginTop: 6 }}>
        {rules.map(({ Icon, tone, title: heading, body }) => (
          <div className="rule" key={heading}>
            <span className={`ri ${tone}`.trim()} aria-hidden="true"><Icon /></span>
            <div><b>{heading}</b><span>{body}</span></div>
          </div>
        ))}
      </section>

      <section className="panel tick b" aria-label="Weekend Champion" style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <span
          aria-hidden="true"
          style={{
            flex: "none", display: "flex", alignItems: "center", justifyContent: "center",
            width: 48, height: 54, clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)",
            background: "linear-gradient(160deg, #FFE58A, #E0B52E 55%, #9A7512)", color: "#2A1F04",
          }}
        >
          <Crown style={{ width: 22, height: 22 }} />
        </span>
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          <span className="lbl">Weekend Champion</span>
          <div className="disp" style={{ fontSize: 17, lineHeight: 1.05, marginTop: 6 }}>Become Weekend Champion</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "var(--font-display), sans-serif", fontWeight: 700, fontSize: 17 }}>
            <CoinGem small />3,000
          </span>
          <span className="muted2" style={{ fontSize: 11 }}>Achievement</span>
        </div>
      </section>

      <section className="panel tick" aria-label="This week's standings"
        style={{ padding: "14px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
        <div className="ph" style={{ margin: "2px 4px 8px" }}><h2>This Week&apos;s Standings</h2></div>

        {loading ? (
          <p className="muted2">Loading standings...</p>
        ) : error ? (
          <p className="muted2">
            Standings could not be loaded.{" "}
            <button type="button" className="link" onClick={onRetry} data-flat>
              <RefreshCw aria-hidden="true" />{retryText}
            </button>
          </p>
        ) : standings.length === 0 ? (
          <div className="league-empty">
            <Trophy aria-hidden="true" />
            <p className="muted">{noQualified}</p>
          </div>
        ) : standings.map((standing, index) => {
          const mine = standing.uid === myUid;
          const medal = index === 0 ? "#FFC940" : index === 1 ? "#D2D6DA" : index === 2 ? "#E09A62" : undefined;
          return (
            <div className={`srow ${mine ? "me" : ""}`.trim()} key={standing.uid}>
              <span className="pos" style={{ color: mine ? "#C6FF33" : medal }}>{index + 1}</span>
              <span className="nm3">
                <Avatar name={standing.displayName} seed={standing.uid} size={32} radius={8} />
                <b>{standing.displayName}</b>
                {mine
                  ? <span className="pill lime srow-you" style={{ height: 18, padding: "0 6px", fontSize: 9.5 }}>You</span>
                  : <RankLabel tier={standing.currentRank}>{""}</RankLabel>}
              </span>
              <span className="wt">{standing.weeklyTrophies.toLocaleString()}</span>
            </div>
          );
        })}

        <p className="muted2" style={{ margin: "10px 4px 2px" }}>
          Silver rank and up only. Standings follow weekly trophies.
        </p>
      </section>
    </div>
  );
}
