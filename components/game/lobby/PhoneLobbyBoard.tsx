"use client";

import Link from "next/link";
import { ArenaStage } from "../ArenaStage";
import { ArenaSprite, Icon } from "../ArenaSprite";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { formatCoins } from "@/lib/wallet";
import { useTranslation } from "@/hooks/useTranslation";
import { useRankProgress } from "@/hooks/useRankProgress";
import { TROPHY_WIN, TROPHY_LOSS } from "@/constants/ranks";
import { formatLeagueBoundary, type LeagueWindow } from "@/lib/weekendLeague";
import { LOBBY_GAMES, type LobbyGame, type LobbyGameId, type LobbyMode } from "./lobbyGames";

/**
 * The Play lobby on a phone held sideways — design/arena/boards/PLobby.dc.html,
 * design/arena/screens/phone/phone-land-01-lobby.jpg and
 * phone-land-01b-lobby-gin-finding.jpg.
 *
 * An 844x390 composition. The podium keeps the middle, with the two decks at
 * 0.56 scale over a table at `rotateX(60deg) scale(.36)`; the Weekend League
 * and your rank stack down the left as two 204px cards, and the modes become
 * a 2x2 grid in a 256px card down the right with PLAY under it. The board
 * writes the game's name over the table as a 128px outline word.
 *
 * Same state as the other two lobby compositions - the page owns the game,
 * the mode and the search, so turning the phone changes the picture and
 * nothing else. See app/(main)/play/page.tsx.
 */

/** The board's aprons, front to back. */
const APRONS: [number, string][] = [
  [-50, "#030305"], [-40, "#07070B"], [-30, "#0B0B11"], [-20, "#0F1116"],
  [-14, "#14161C"], [-11, "#063A40"], [-9, "#00BCC8"], [-7, "#1C1E26"],
];

/** The board's own diamond, for the Gin Rummy crest. */
function DiamondGlyph() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path fill="currentColor" d="M50 2C58 18 70 34 86 50C70 66 58 82 50 98C42 82 30 66 14 50C30 34 42 18 50 2Z" />
    </svg>
  );
}

export interface PhoneLobbyBoardProps {
  game: LobbyGameId;
  onPickGame: (id: LobbyGameId) => void;
  entry: LobbyGame;
  mode: LobbyMode;
  onMode: (id: string) => void;
  finding: boolean;
  matchFound: boolean;
  onGo: () => void;
  leagueWindow: LeagueWindow;
  error: string | null;
}

export function PhoneLobbyBoard({
  game, onPickGame, entry, mode, onMode, finding, matchFound, onGo, leagueWindow, error,
}: PhoneLobbyBoardProps) {
  const { isGuest } = useAuth();
  const { state: economy } = useEconomy();
  const t = useTranslation();
  const rank = useRankProgress();
  const mindi = game === "mindi";
  const locked = Boolean(mode.account) && isGuest;
  const queues = mode.href === null;
  const boundary = formatLeagueBoundary(leagueWindow.boundary);
  const win = TROPHY_WIN * 2;
  const loss = Math.abs(TROPHY_LOSS) * 2;

  let detail: string = mode.detail;
  if (locked) {
    detail = mode.id === "room" ? t("gamesel_signInPrivateRooms")
      : mode.id === "online" ? t("gamesel_signInCasualOnline")
      : t("gamesel_signInRanked");
  } else if (finding) {
    detail = matchFound ? t("rankedq_starting").replace("{label}", entry.name) : t("rotate_tapAgainToStop");
  } else if (mode.x2) {
    detail = `${mode.detail} · ${t("lobby_doubleTrophiesUntil").replace("{when}", boundary)}`;
  }

  return (
    <ArenaStage width={844} height={390} className="arena-plobby">
      <div className="ar" style={{ position: "relative", width: 844, height: 390, overflow: "hidden", background: "#000" }}>
        <ArenaSprite />
        <div className="bg" />
        <div className="bigword" aria-hidden="true">{mindi ? "MINDI" : "GIN"}</div>
        <div className="beam" style={{ left: "250px", transform: "rotate(-14deg)" }} aria-hidden="true" />
        <div className="beam" style={{ left: "300px", transform: "rotate(14deg)" }} aria-hidden="true" />

        <div className="stage" aria-hidden="true">
          <div className="floor" />
          <div className="table">
            {APRONS.map(([z, colour]) => (
              <div key={z} className="apron" style={{ transform: `translateZ(${z}px)`, background: colour }} />
            ))}
            <div className="felt pod" />
            <div className="rail" />
            <svg className="leds" viewBox="0 0 1200 740">
              <defs>
                <filter id="plobby-led-glow" x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur stdDeviation="9" />
                </filter>
              </defs>
              <ellipse cx="600" cy="370" rx="565" ry="335" fill="none" stroke="#6FE9F0" strokeOpacity=".75" strokeWidth="7" strokeLinecap="round" strokeDasharray="3 30" className="chase" data-ar-loop />
              <ellipse cx="600" cy="370" rx="533" ry="303" fill="none" stroke="#C6FF33" strokeWidth="18" strokeOpacity=".7" filter="url(#plobby-led-glow)" />
              <ellipse cx="600" cy="370" rx="533" ry="303" fill="none" stroke="#DFFF85" strokeWidth="6" />
            </svg>
          </div>
        </div>

        <i className="mote" style={{ left: "300px", top: "330px", animationDelay: "0s" }} data-ar-loop aria-hidden="true" />
        <i className="mote b" style={{ left: "520px", top: "300px", animationDelay: "1.4s" }} data-ar-loop aria-hidden="true" />
        <i className="mote" style={{ left: "470px", top: "350px", animationDelay: "2.8s" }} data-ar-loop aria-hidden="true" />

        <div className="glow" style={{ left: mindi ? "279px" : "411px", top: "318px", width: "146px" }} aria-hidden="true" />
        <div className="shadow" style={{ left: "290px", top: "330px", width: "124px" }} aria-hidden="true" />
        <div className="shadow" style={{ left: "422px", top: "330px", width: "124px" }} aria-hidden="true" />

        <div style={{ position: "absolute", left: 248, width: 292, top: 58, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
          <span className="lbl dash" style={{ fontSize: 9.5 }}>{t("lobby_pickAGame")}</span>
          <h1 className="disp chrome" style={{ margin: 0, fontSize: 26 }}>{t("lobby_chooseYourTable")}</h1>
        </div>

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
                      {isMindi ? <Icon name="i-crown" /> : <DiamondGlyph />}
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

        {/* Left: back, the league, your rank. */}
        <Link href="/home" className="ibtn" aria-label={t("nav_home")} style={{ position: "absolute", left: 44, top: 10 }} data-flat>
          <Icon name="i-back" />
        </Link>

        <section
          className="hud b card2"
          aria-label={t("page_weekendLeague")}
          style={{ left: 44, top: 64, width: 204, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}
        >
          <div
            aria-hidden="true"
            style={{ position: "absolute", right: -30, top: -30, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(0,188,200,.45), rgba(0,188,200,0))" }}
          />
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="lbl" style={{ fontSize: 9, letterSpacing: ".16em", color: "#9FF2F7" }}>{t("page_weekendLeague")}</span>
            {leagueWindow.live
              ? <span className="chip live" style={{ height: 20, padding: "0 7px", fontSize: 9.5 }}><i data-ar-loop />{t("common_live")}</span>
              : <span className="chip mono" style={{ height: 20, padding: "0 7px", fontSize: 9.5 }}>Fri – Sat</span>}
          </div>
          <h2 className="disp" style={{ position: "relative", margin: 0, fontSize: 22 }}>{t("lobby_doubleTrophies")}</h2>
          <p className="body" style={{ position: "relative", margin: 0, fontSize: 11.5, lineHeight: 1.4 }}>
            {t("lobby_leagueLine").replace("{win}", String(win)).replace("{base}", String(TROPHY_WIN)).replace("{loss}", String(loss))}
          </p>
          <Link
            className="ar-btn blue sm"
            href="/tournament"
            style={{ position: "relative", height: 34, padding: "0 10px", fontSize: 11, boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 4px 0 #00727A" }}
            data-flat
          >
            {t("lobby_enter")}
            <Icon name="i-arrow" />
          </Link>
        </section>

        <section
          className="hud card2"
          aria-label={t("lobby_yourRank")}
          style={{ left: 44, top: 282, width: 204, display: "flex", flexDirection: "column", gap: 8 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div className="av" aria-hidden="true" style={{ width: 30, height: 30, borderRadius: 8, fontSize: 13 }}>
              {rank.name.charAt(0).toUpperCase()}
            </div>
            <b className="disp" style={{ fontSize: 13, letterSpacing: ".03em" }}>{rank.name}</b>
            <span className="muted2" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              <span className="rkh" aria-hidden="true"><Icon name="i-crown" /></span>
              {rank.tier} · {rank.trophies.toLocaleString()}
            </span>
          </div>
          <div className="xp" role="progressbar" aria-valuenow={rank.pct} aria-valuemin={0} aria-valuemax={100}
               aria-label={rank.nextTier ? t("lobby_progressTo").replace("{tier}", rank.nextTier) : t("lobby_topTier")}>
            <i style={{ width: `${rank.pct}%` }} />
          </div>
          <div className="lbl" style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 8.5, letterSpacing: ".12em" }}>{rank.tier} {rank.floor}</span>
            <span style={{ fontSize: 8.5, letterSpacing: ".12em", color: "#C6FF33" }}>
              {rank.nextTier ? `${rank.remaining} ${t("lobby_toTier").replace("{tier}", rank.nextTier)}` : t("lobby_topTier")}
            </span>
          </div>
        </section>

        {/* Right: coins, the modes grid, PLAY. */}
        <span
          className="coinchip"
          aria-label={`${formatCoins(economy.economy.coins)} ${t("common_coins")}`}
          style={{ position: "absolute", right: 44, top: 10 }}
        >
          <i className="gem" aria-hidden="true" />{formatCoins(economy.economy.coins)}
        </span>

        <section
          className="hud card2"
          aria-label={t("lobby_gameModes")}
          style={{ right: 44, top: 64, width: 256, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, padding: "0 2px" }}>
            <h2 className="disp" style={{ margin: 0, fontSize: 22 }}>{entry.name}</h2>
            <span className="lbl" style={{ fontSize: 8.5, letterSpacing: ".12em" }}>{entry.cap}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 5 }}>
            {entry.modes.map((item) => (
              <button
                type="button"
                key={item.id}
                className="mode"
                aria-pressed={item.id === mode.id}
                onClick={() => onMode(item.id)}
                data-flat
              >
                <b>{item.name}</b>
                {item.x2 && <span className="x2">&times;2</span>}
              </button>
            ))}
          </div>
          <p className="muted" aria-live="polite" style={{ margin: "2px 2px 0", fontSize: 11.5, lineHeight: 1.35, minHeight: 31 }}>
            {error ?? detail}
          </p>
          {locked ? (
            <Link className="ar-btn" href="/login" style={{ width: "100%", marginTop: 2 }} data-flat>
              <Icon name="i-go" />{t("login_signIn")}
            </Link>
          ) : queues ? (
            <button
              type="button"
              className={`ar-btn ${finding ? "busy" : ""}`.trim()}
              style={{ width: "100%", marginTop: 2 }}
              onClick={onGo}
              data-flat
            >
              {finding ? <i className="spin" aria-hidden="true" data-ar-loop /> : <Icon name="i-go" />}
              {finding ? (matchFound ? t("rankedq_matchFound") : t("rotate_findingTableShort")) : t("lobby_playGame").replace("{game}", entry.name)}
            </button>
          ) : (
            <Link className="ar-btn" href={mode.href ?? "/play"} style={{ width: "100%", marginTop: 2 }} data-flat>
              <Icon name="i-go" />{t("lobby_playGame").replace("{game}", entry.name)}
            </Link>
          )}
        </section>
      </div>
    </ArenaStage>
  );
}
