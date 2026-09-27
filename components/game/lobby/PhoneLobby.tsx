"use client";

import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useRankProgress } from "@/hooks/useRankProgress";
import { TROPHY_WIN, TROPHY_LOSS } from "@/constants/ranks";
import { formatLeagueBoundary, type LeagueWindow } from "@/lib/weekendLeague";
import { CrownGlyph } from "@/components/arena";
import { LOBBY_GAMES, type LobbyGame, type LobbyGameId, type LobbyMode } from "./lobbyGames";

/**
 * The Play lobby on a phone held upright — design/arena/boards/MPlay.dc.html,
 * design/arena/screens/phone/phone-09-play.jpg.
 *
 * The same lobby as the desktop board, recomposed for 390px: the two decks
 * on a 292px podium at the top, the chosen game's modes under it, the
 * Weekend League and your rank as two short cards, and PLAY docked above the
 * tab bar. Nothing is dropped.
 *
 * The podium is the board's own 3D scene at the board's own numbers - a
 * rotateX(60deg) scale(.3) table over seven translateZ'd aprons, with the
 * decks group scaled .62 over it. The lime bloom under the chosen deck
 * slides on a .4s curve, which is why picking a game reads as a physical
 * turn rather than a class swap.
 *
 * One departure from the board, and it is the desktop lobby's departure too:
 * the board's Play button always opens the rotate sheet, but Ranked and
 * Private Room have real screens of their own in this app (a party, a rank
 * lock, a room code), so for those the button is a link. Casual Online
 * queues in place - it is the one mode whose whole screen is a queue - and
 * Vs AI and Pass & Play wait for the phone to turn. See PlayPage.
 */

/** The podium's aprons, front to back, in the board's order. */
const APRONS: [number, string][] = [
  [-50, "#030305"], [-38, "#0B0B11"], [-26, "#0F1116"], [-14, "#14161C"],
  [-11, "#063A40"], [-9, "#00BCC8"], [-7, "#1C1E26"],
];

/** The board's own diamond, for the Gin Rummy crest. */
function DiamondGlyph() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path fill="currentColor" d="M50 2C58 18 70 34 86 50C70 66 58 82 50 98C42 82 30 66 14 50C30 34 42 18 50 2Z" />
    </svg>
  );
}

export interface PhoneLobbyProps {
  game: LobbyGameId;
  onPickGame: (id: LobbyGameId) => void;
  entry: LobbyGame;
  mode: LobbyMode;
  onMode: (id: string) => void;
  /** True once Play has been tapped: queueing, or waiting for the turn. */
  finding: boolean;
  /** A table formed; the navigation to it is already in flight. */
  matchFound: boolean;
  /** Tapping PLAY: start looking, or tap again to stop. */
  onGo: () => void;
  leagueWindow: LeagueWindow;
  error: string | null;
}

export function PhoneLobby({
  game, onPickGame, entry, mode, onMode, finding, matchFound, onGo, leagueWindow, error,
}: PhoneLobbyProps) {
  const { isGuest } = useAuth();
  const t = useTranslation();
  const rank = useRankProgress();
  const mindi = game === "mindi";
  const locked = Boolean(mode.account) && isGuest;
  /** Vs AI and Pass & Play: nothing to queue for, so they wait for the turn. */
  const local = mode.id === "ai" || mode.id === "pass";
  /** Casual Online queues here; Ranked and Private Room are links. */
  const queues = mode.href === null;
  const boundary = formatLeagueBoundary(leagueWindow.boundary);
  const win = TROPHY_WIN * 2;
  const loss = Math.abs(TROPHY_LOSS) * 2;

  let note: string = mode.name;
  if (locked) {
    note = mode.id === "room" ? t("gamesel_signInPrivateRooms")
      : mode.id === "online" ? t("gamesel_signInCasualOnline")
      : t("gamesel_signInRanked");
  } else if (finding) {
    note = local ? t("rotate_turnToStart") : t("rotate_tapAgainToStop");
  } else if (mode.x2) {
    note = `${mode.name} · ${t("lobby_doubleTrophiesUntil").replace("{when}", boundary)}`;
  }

  return (
    <div className="arena-mplay">
      <div className="mpage">
        <div className="mh">
          <span className="lbl dash" style={{ color: "#C6FF33" }}>{t("lobby_pickAGame")}</span>
          <h1 className="disp chrome" style={{ fontSize: "42px" }}>{t("lobby_chooseYourTable")}</h1>
        </div>

        <section className="pod" aria-label={t("nav_play")}>
          <div className="beam" style={{ left: "20px", transform: "rotate(-14deg)" }} aria-hidden="true" />
          <div className="beam" style={{ left: "140px", transform: "rotate(14deg)" }} aria-hidden="true" />

          <div className="stage" aria-hidden="true">
            <div className="floor" />
            <div className="table">
              {APRONS.map(([z, colour]) => (
                <div className="apron" key={z} style={{ transform: `translateZ(${z}px)`, background: colour }} />
              ))}
              <div className="felt pod2" />
              <div className="rail" />
              <svg className="leds" viewBox="0 0 1200 740">
                <defs>
                  <filter id="mplay-led-glow" x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur stdDeviation="10" />
                  </filter>
                </defs>
                <ellipse
                  cx="600" cy="370" rx="565" ry="335" fill="none" stroke="#6FE9F0" strokeOpacity=".75"
                  strokeWidth="8" strokeLinecap="round" strokeDasharray="3 32" className="chase" data-ar-loop
                />
                <ellipse cx="600" cy="370" rx="533" ry="303" fill="none" stroke="#C6FF33" strokeWidth="20" strokeOpacity=".7" filter="url(#mplay-led-glow)" />
                <ellipse cx="600" cy="370" rx="533" ry="303" fill="none" stroke="#DFFF85" strokeWidth="7" />
              </svg>
            </div>
          </div>

          <i className="mote" style={{ left: "60px", top: "240px", animationDelay: "0s" }} data-ar-loop aria-hidden="true" />
          <i className="mote b" style={{ left: "300px", top: "220px", animationDelay: "1.6s" }} data-ar-loop aria-hidden="true" />
          {/* One bloom that slides between the decks, as the board has it -
              its .4s transition is what makes picking a game feel physical. */}
          <div className="glow" style={{ left: mindi ? "50px" : "196px" }} aria-hidden="true" />
          <div className="shadow" style={{ left: "67px" }} aria-hidden="true" />
          <div className="shadow" style={{ left: "213px" }} aria-hidden="true" />

          <div className="decks">
            {LOBBY_GAMES.map((deck) => {
              const isMindi = deck.id === "mindi";
              const chosen = deck.id === game;
              return (
                <button
                  type="button"
                  key={deck.id}
                  className={`deck ${isMindi ? "blu" : "blk"} ${chosen ? "on" : "off"}`}
                  style={{
                    left: isMindi ? 0 : "236px",
                    ["--ry" as string]: isMindi ? "-16deg" : "16deg",
                    ["--ry2" as string]: isMindi ? "-8deg" : "8deg",
                  }}
                  aria-pressed={chosen}
                  aria-label={`${deck.name}, ${deck.meta}`}
                  onClick={() => onPickGame(deck.id)}
                  data-flat
                >
                  <span className="box">
                    <span className="fc lside" />
                    <span className="fc top" />
                    <span className="fc side" />
                    <span className="fc front">
                      <span className={isMindi ? "crest2" : "crest2 lime"}>
                        {isMindi ? <CrownGlyph /> : <DiamondGlyph />}
                      </span>
                      <span className="deckname">
                        <b>
                          {deck.deckLines.map((line, index) => (
                            <span key={line}>{index > 0 && <br />}{line}</span>
                          ))}
                        </b>
                        <span lang="dv" dir="rtl">{deck.thaana}</span>
                      </span>
                      <span className="deckmeta">{deck.meta}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section
          className="panel tick"
          aria-label={t("lobby_gameModes")}
          style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span className="lbl dash">{entry.cap}</span>
            <h2 className="disp" style={{ margin: 0, fontSize: "30px" }}>{entry.name}</h2>
            <p className="body" style={{ margin: 0, fontSize: "13.5px", lineHeight: 1.45 }}>{entry.line}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            {entry.modes.map((item) => (
              <button
                type="button"
                key={item.id}
                className="mode"
                aria-pressed={item.id === mode.id}
                onClick={() => onMode(item.id)}
                data-flat
              >
                <span className="ic" aria-hidden="true"><item.Icon /></span>
                <span className="tx"><b>{item.name}</b><span>{item.detail}</span></span>
                {item.x2 && <span className="x2">&times;2</span>}
              </button>
            ))}
          </div>
        </section>

        <section
          className="hud b"
          aria-label={t("page_weekendLeague")}
          style={{ position: "relative", padding: "14px 16px", display: "flex", alignItems: "center", gap: "14px", overflow: "hidden" }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute", right: "-30px", top: "-40px", width: "140px", height: "140px", borderRadius: "50%",
              background: "radial-gradient(closest-side, rgba(0,188,200,.45), rgba(0,188,200,0))",
            }}
          />
          <div style={{ position: "relative", flex: "1 1 0", display: "flex", flexDirection: "column", gap: "7px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="lbl" style={{ fontSize: "9.5px", letterSpacing: ".16em", color: "#9FF2F7" }}>
                {t("page_weekendLeague")}
              </span>
              {leagueWindow.live
                ? <span className="chip live" style={{ height: "20px", padding: "0 7px", fontSize: "9.5px" }}><i data-ar-loop />{t("common_live")}</span>
                : <span className="chip mono" style={{ height: "20px", padding: "0 7px", fontSize: "9.5px" }}>Fri – Sat</span>}
            </span>
            <b className="disp" style={{ fontSize: "20px" }}>{t("lobby_doubleTrophies")}</b>
            <span className="muted2" style={{ lineHeight: 1.35 }}>
              {t("lobby_leagueLine")
                .replace("{win}", String(win))
                .replace("{base}", String(TROPHY_WIN))
                .replace("{loss}", String(loss))}
            </span>
          </div>
          <Link
            className="ar-btn blue sm"
            href="/tournament"
            style={{
              position: "relative", flex: "none", height: "40px", padding: "0 12px", fontSize: "11.5px",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 4px 0 #00727A",
            }}
            data-flat
          >
            {t("lobby_enter")}
            <ArrowRight aria-hidden="true" />
          </Link>
        </section>

        <section
          className="hud"
          aria-label={t("lobby_yourRank")}
          style={{ position: "relative", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="av" aria-hidden="true" style={{ width: "34px", height: "34px", borderRadius: "9px", fontSize: "15px" }}>
              {rank.name.charAt(0).toUpperCase()}
            </div>
            <b className="disp" style={{ fontSize: "15px", letterSpacing: ".03em" }}>{rank.name}</b>
            <span className="muted2" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "7px" }}>
              <span className="rkh" aria-hidden="true"><CrownGlyph size={14} /></span>
              {rank.tier} · {rank.trophies.toLocaleString()} {rank.trophies === 1 ? t("common_trophy") : t("common_trophies")}
            </span>
          </div>
          <div
            className="xp"
            role="progressbar"
            aria-valuenow={rank.pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={rank.nextTier ? t("lobby_progressTo").replace("{tier}", rank.nextTier) : t("lobby_topTier")}
          >
            <i style={{ width: `${rank.pct}%` }} />
          </div>
          <div className="lbl" style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "9.5px" }}>{rank.tier} {rank.floor}</span>
            <span style={{ fontSize: "9.5px", color: "#C6FF33" }}>
              {rank.nextTier ? `${rank.remaining} ${t("lobby_toTier").replace("{tier}", rank.nextTier)}` : t("lobby_topTier")}
            </span>
            <span style={{ fontSize: "9.5px" }}>{rank.ceiling ?? ""}</span>
          </div>
        </section>

        <div style={{ height: "114px" }} aria-hidden="true" />
      </div>

      <div className="dock">
        {locked ? (
          <Link className="ar-btn full" href="/login" style={{ height: "56px", fontSize: "16px" }} data-flat>
            <Play aria-hidden="true" />
            {t("login_signIn")}
          </Link>
        ) : !queues && !local ? (
          <Link className="ar-btn full" href={mode.href ?? "/play"} style={{ height: "56px", fontSize: "16px" }} data-flat>
            <Play aria-hidden="true" />
            {t("lobby_playGame").replace("{game}", entry.name)}
          </Link>
        ) : (
          <button
            type="button"
            className={`ar-btn full ${finding ? "busy" : ""}`.trim()}
            style={{ height: "56px", fontSize: "16px" }}
            onClick={onGo}
            data-flat
          >
            {finding
              ? (local ? null : <i className="spin" aria-hidden="true" data-ar-loop />)
              : <Play aria-hidden="true" />}
            {finding
              ? (local ? t("rotate_tableReadyShort")
                : matchFound ? t("rankedq_matchFound") : t("rotate_findingTableShort"))
              : t("lobby_playGame").replace("{game}", entry.name)}
          </button>
        )}
        <p className="muted" aria-live="polite" style={{ margin: "10px 0 0", textAlign: "center", fontSize: "12px" }}>
          {finding && matchFound ? t("rankedq_starting").replace("{label}", entry.name) : note}
        </p>
        {error && (
          <p style={{ margin: "8px 0 0", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#FF6B80" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
