"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { getRankFromTrophies, RANKS, TROPHY_WIN, TROPHY_LOSS } from "@/constants/ranks";
import { formatLeagueBoundary, type LeagueWindow } from "@/lib/weekendLeague";
import { RankHex, CrownGlyph } from "@/components/arena";
import type { LobbyGame, LobbyMode } from "./lobbyGames";

/**
 * The three HUD panels around the podium —
 * design/arena/screens/lobby-01-mindi.jpg, from
 * design/arena/boards/Lobby.dc.html.
 *
 * The board fixes them at left:48/top:122, left:48/top:700 and
 * left:1062/top:122 of its artboard, and LobbyBoard passes exactly those
 * as `style` - `.hud` is already position:absolute in the generated sheet,
 * so each one lands where it was drawn.
 *
 * Everything else - padding, gaps, type sizes, the corner bloom - is
 * written inline because that is where the board writes it too, so the two
 * can be compared line by line. The classes (.hud, .lbl, .chip, .mode,
 * .xp, .av, .ar-btn, .spin) come from styles/arena-lobby.css, generated
 * from the board by scripts/port-board.mjs.
 */

/* ── Weekend League ─────────────────────────────────────────────────── */

/**
 * The board draws the league live and says "It ends Saturday at midnight".
 * Both halves are worked out from lib/weekendLeague's window here, so the
 * panel is still true on a Tuesday: the chip reads Fri – Sat and the
 * sentence says when it opens rather than when it ends.
 *
 * The trophy figures are the app's own (constants/ranks), doubled the way
 * lib/trophyUpdates doubles them in the league pool - not the board's
 * printed 10 and 4, which would go stale the moment either constant moved.
 */
export function LobbyLeagueCard({ window: leagueWindow, style }: { window: LeagueWindow; style?: CSSProperties }) {
  const t = useTranslation();
  const win = TROPHY_WIN * 2;
  const loss = Math.abs(TROPHY_LOSS) * 2;
  const boundary = formatLeagueBoundary(leagueWindow.boundary);

  return (
    <section
      className="hud v lob-league"
      aria-label={t("page_weekendLeague")}
      style={{ ...style, padding: "24px 26px 26px", display: "flex", flexDirection: "column", gap: "14px", overflow: "hidden" }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute", right: "-40px", top: "-40px", width: "180px", height: "180px", borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(0,188,200,.45), rgba(0,188,200,0))",
        }}
      />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span className="lbl dash" style={{ color: "#9FF2F7" }}>{t("page_weekendLeague")}</span>
        {leagueWindow.live
          ? <span className="chip live"><i data-ar-loop />Live now</span>
          : <span className="chip mono">Fri – Sat</span>}
      </div>
      <h2 className="disp" style={{ position: "relative", margin: 0, fontSize: "38px" }}>Double<br />trophies</h2>
      <p className="body" style={{ position: "relative", margin: 0, fontSize: "14.5px" }}>
        Every ranked win this weekend is worth {win} trophies instead of {TROPHY_WIN}, and a loss
        costs {loss}. It {leagueWindow.live ? "ends" : "opens"} {boundary}.
      </p>
      <div style={{ position: "relative" }}>
        <Link className="ar-btn blue sm" href="/tournament" data-flat>
          Enter the league
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

/* ── Your rank ──────────────────────────────────────────────────────── */

const TIERS = [RANKS.BRONZE, RANKS.SILVER, RANKS.GOLD, RANKS.PLATINUM];

/**
 * The board's rank strip: avatar, name, tier hexagon, and the bar to the
 * next tier.
 *
 * The board hard-codes a gold hexagon because its sample player is Gold.
 * This uses the shared RankHex, which takes the tier's own metal - so a
 * Bronze player sees bronze rather than everyone being painted Gold.
 */
export function LobbyRankCard({ style }: { style?: CSSProperties }) {
  const { user, playerStats } = useAuth();
  const trophies = playerStats?.trophies ?? 0;
  const tier = getRankFromTrophies(trophies);
  const name = user?.displayName || "Player";

  const index = TIERS.findIndex((rank) => rank.name === tier);
  const floor = TIERS[index]?.min ?? 0;
  const next = TIERS[index + 1];
  const span = next ? next.min - floor : 0;
  const progress = next && span > 0 ? Math.min(1, Math.max(0, (trophies - floor) / span)) : 1;
  const remaining = next ? Math.max(0, next.min - trophies) : 0;
  const pct = Math.round(progress * 100);

  return (
    <section
      className="hud lob-rank"
      aria-label="Your rank"
      style={{ ...style, padding: "20px 24px 22px", display: "flex", flexDirection: "column", gap: "16px" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div className="av" aria-hidden="true">{name.charAt(0).toUpperCase()}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "7px", flexGrow: 1, minWidth: 0 }}>
          <b className="disp" style={{ fontSize: "19px", letterSpacing: ".02em" }}>{name}</b>
          <span className="muted" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <RankHex tier={tier} width={30} height={34}><CrownGlyph size={15} /></RankHex>
            {tier} · {trophies.toLocaleString()} {trophies === 1 ? "trophy" : "trophies"}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
        <div
          className="xp"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={next ? `Progress to ${next.name}` : "Highest rank reached"}
          aria-valuetext={next ? `${remaining} to ${next.name}` : "Top tier"}
        >
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="lbl lob-scale" style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
          <span>{tier} {floor}</span>
          <span style={{ color: "#C6FF33" }}>{next ? `${remaining} to ${next.name}` : "Top tier"}</span>
          <span>{next ? next.min : ""}</span>
        </div>
      </div>
    </section>
  );
}

/* ── Game modes and the CTA ─────────────────────────────────────────── */

export interface LobbyModesProps {
  game: LobbyGame;
  mode: LobbyMode;
  onMode: (id: string) => void;
  /** True while the Casual Online queue is running. */
  finding: boolean;
  /** A table formed; the navigation to it is already in flight. */
  matchFound: boolean;
  onGo: () => void;
  leagueWindow: LeagueWindow;
  /** Surfaced under the CTA rather than swallowed. */
  error: string | null;
  /** The board position its caller places it at. */
  style?: CSSProperties;
}

export function LobbyModes({ game, mode, onMode, finding, matchFound, onGo, leagueWindow, error, style }: LobbyModesProps) {
  const { isGuest } = useAuth();
  const t = useTranslation();
  const locked = Boolean(mode.account) && isGuest;
  const boundary = formatLeagueBoundary(leagueWindow.boundary);

  // The board's note is the mode's name, plus a league line for a x2 mode.
  // That line is dated from the real window rather than the board's printed
  // "until Saturday midnight", and a guest is told what the mode needs.
  let note: string = mode.name;
  if (locked) {
    note = mode.id === "room" ? t("gamesel_signInPrivateRooms")
      : mode.id === "online" ? t("gamesel_signInCasualOnline")
      : t("gamesel_signInRanked");
  } else if (mode.x2) {
    note = `${mode.name} · double trophies ${leagueWindow.live ? "until" : "from"} ${boundary}`;
  }

  return (
    <section
      className="hud lob-modes"
      aria-label="Game modes"
      style={{ ...style, padding: "22px 20px", display: "flex", flexDirection: "column", gap: "14px" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "9px", padding: "0 4px" }}>
        <span className="lbl dash">{game.cap}</span>
        <h2 className="disp" style={{ margin: 0, fontSize: "38px" }}>{game.name}</h2>
        <p className="body" style={{ margin: 0, fontSize: "14px", lineHeight: 1.45 }}>{game.line}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        {game.modes.map((entry) => (
          <button
            type="button"
            key={entry.id}
            className="mode"
            aria-pressed={entry.id === mode.id}
            onClick={() => onMode(entry.id)}
            data-flat
          >
            <span className="ic" aria-hidden="true"><entry.Icon /></span>
            <span className="tx"><b>{entry.name}</b><span>{entry.detail}</span></span>
            {entry.x2 && <span className="x2">&times;2</span>}
          </button>
        ))}
      </div>

      <div style={{ marginTop: "auto", paddingTop: "8px" }}>
        {/* Casual Online queues here, as the board does; every other mode
            has a screen of its own, so it is a link. */}
        {locked ? (
          <Link className="ar-btn" href="/login" style={{ width: "100%" }} data-flat>
            <Play aria-hidden="true" />
            Sign in
          </Link>
        ) : mode.href ? (
          <Link className="ar-btn" href={mode.href} style={{ width: "100%" }} data-flat>
            <Play aria-hidden="true" />
            Play {game.name}
          </Link>
        ) : (
          <button
            type="button"
            className={`ar-btn ${finding ? "busy" : ""}`.trim()}
            style={{ width: "100%" }}
            onClick={onGo}
            data-flat
          >
            {finding ? <i className="spin" aria-hidden="true" data-ar-loop /> : <Play aria-hidden="true" />}
            {finding ? (matchFound ? t("rankedq_matchFound") : "Finding a table") : `Play ${game.name}`}
          </button>
        )}
        <p className="muted" aria-live="polite" style={{ margin: "14px 0 0", textAlign: "center", fontSize: "12.5px" }}>
          {finding
            ? (matchFound ? t("rankedq_starting").replace("{label}", game.name) : "Tap again to stop looking")
            : note}
        </p>
        {error && (
          <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: "12.5px", fontWeight: 600, color: "#FF6B80" }}>
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
