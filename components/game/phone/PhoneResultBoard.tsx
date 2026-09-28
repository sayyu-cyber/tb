"use client";

import Link from "next/link";
import { ArenaStage } from "../ArenaStage";
import { ArenaSprite, Icon } from "../ArenaSprite";
import { ArenaFace } from "../ArenaCard";
import type { TenCapture } from "@/lib/mindiEngine";

/**
 * The end of a Mindi hand, on a phone held sideways —
 * design/arena/boards/PResult.dc.html,
 * design/arena/screens/phone/phone-land-04-result.jpg.
 *
 * An 844x390 composition of the same hand-over screen: the headline and the
 * four Tens down the left, the four numbers as a 2x2 grid top-right, and the
 * two buttons bottom-right. The table is pushed back behind the same veil and
 * turning rays.
 *
 * One thing the desktop screen has that this board does not draw, and it is
 * the board's own decision: the five-cell "how other endings read" legend. At
 * 390px tall there is nowhere to put five cells of explanation next to four
 * cards and four panels, and MOBILE.md does not ask for it. Everything that
 * says what THIS hand was worth is here.
 *
 * MindiResultScreen owns the arithmetic, the copy and the replay; this is its
 * sideways picture only.
 */

/** The board's four card tilts, in its order. */
const TILTS: { rot: string; ty: string; delay: string }[] = [
  { rot: "-7deg", ty: "6px", delay: ".1s" },
  { rot: "-2deg", ty: "0px", delay: ".22s" },
  { rot: "2deg", ty: "0px", delay: ".34s" },
  { rot: "7deg", ty: "6px", delay: ".46s" },
];

/** The board's aprons, front to back. */
const APRONS: [number, string][] = [
  [-40, "#07070B"], [-30, "#0F1116"], [-20, "#14161C"], [-11, "#063A40"], [-8, "#00BCC8"],
];

export interface PhoneResultBoardProps {
  /** "Mindi · Ranked duo · Hand over" - the kicker's second half. */
  modeLabel: string;
  weekend: boolean;
  headline: string;
  subtitle: string;
  /** The Tens in the order they were taken, at most four. */
  tens: TenCapture[];
  /** Which team the viewer is on, so "us" and "them" are theirs. */
  mine: (ten: TenCapture) => boolean;
  /** The tag under each card: "Us"/"Them", or "You"/"Them" in the 1v1 room. */
  tagFor: (ten: TenCapture) => string;
  tensLine: string;
  tricksLine: string;
  trophyChange: number;
  /** 0-100 through the current tier. */
  barW: number;
  trophyLine: string;
  coins: number;
  coinLine: string;
  onReplay: () => void;
  onPlayAgain?: () => void;
  playAgainHref: string;
}

export function PhoneResultBoard(p: PhoneResultBoardProps) {
  return (
    <ArenaStage width={844} height={390} className="arena-presult">
      <div className="ar" style={{ position: "relative", width: 844, height: 390, overflow: "hidden", background: "#000" }}>
        <ArenaSprite />
        <div className="bg" />

        <div className="stage" aria-hidden="true">
          <div className="table">
            {APRONS.map(([z, colour]) => (
              <div key={z} className="apron" style={{ transform: `translateZ(${z}px)`, background: colour }} />
            ))}
            <div className="felt" />
            <div className="rail" />
            <svg className="leds" viewBox="0 0 1200 740">
              <ellipse cx="600" cy="370" rx="533" ry="303" fill="none" stroke="#C6FF33" strokeWidth="7" />
            </svg>
          </div>
        </div>
        <div className="veil" />
        <div className="rays" aria-hidden="true" data-ar-loop />
        <div className="beam" style={{ left: "20px", transform: "rotate(-18deg)" }} />
        <div className="beam" style={{ left: "520px", transform: "rotate(18deg)" }} />
        <i className="mote" style={{ left: "120px", top: "330px", animationDelay: "0s" }} data-ar-loop aria-hidden="true" />
        <i className="mote b" style={{ left: "760px", top: "300px", animationDelay: "1.4s" }} data-ar-loop aria-hidden="true" />
        <i className="mote" style={{ left: "700px", top: "200px", animationDelay: "2.8s" }} data-ar-loop aria-hidden="true" />
        <i className="mote b" style={{ left: "180px", top: "180px", animationDelay: "4.1s" }} data-ar-loop aria-hidden="true" />

        {/* Left: the headline and the four Tens. */}
        <div style={{ position: "absolute", left: 44, top: 14, width: 400, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="up" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {p.weekend && <span className="chip live" style={{ height: 22, padding: "0 8px", fontSize: 10 }}><i data-ar-loop />Weekend League</span>}
            <span className="lbl" style={{ fontSize: 9.5, letterSpacing: ".14em" }}>Mindi · {p.modeLabel} · Hand over</span>
          </div>
          <h1 className="disp" style={{ margin: "2px 0 0", fontSize: 40, filter: "drop-shadow(0 0 24px rgba(198,255,51,.18))" }}>
            <span className="stamp chrome">{p.headline}</span>
          </h1>
          <p className="up body" style={{ margin: 0, fontSize: 13, animationDelay: "1.1s" }}>{p.subtitle}</p>
        </div>

        {/* A hand that ended on a forfeit never played its Tens out, so the
            row is left out rather than filled with blanks. */}
        {p.tens.length > 0 && (
          <div style={{ position: "absolute", left: 44, top: 138, width: 390, display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 14 }}>
            {p.tens.map((ten, i) => {
              const tilt = TILTS[i] ?? TILTS[TILTS.length - 1];
              const ours = p.mine(ten);
              return (
                <div key={ten.suit} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                  <div
                    className={`big ${ours ? "us" : "them"}`}
                    style={{ ["--rot" as string]: tilt.rot, ["--ty" as string]: tilt.ty, animationDelay: tilt.delay }}
                  >
                    <ArenaFace rank="10" suit={ten.suit} ten />
                  </div>
                  <span className={`who2 ${ours ? "us" : "them"} up`} style={{ animationDelay: `${0.5 + i * 0.1}s` }}>
                    {p.tagFor(ten)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Right: what the hand was worth. */}
        <div
          className="up"
          style={{ position: "absolute", right: 44, top: 18, width: 344, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, animationDelay: "1.2s" }}
        >
          <div className="hud stat2" style={{ position: "relative" }}>
            <span className="lbl dash">Tens</span>
            <span className="v">{p.tensLine}</span>
            <span className="s">Tens decide the hand</span>
          </div>
          <div className="hud stat2" style={{ position: "relative" }}>
            <span className="lbl dash">Tricks</span>
            <span className="v">{p.tricksLine}</span>
            <span className="s">Only counts at 2 Tens each</span>
          </div>
          <div className="hud stat2" style={{ position: "relative" }}>
            <span className="lbl dash">Trophies</span>
            <span className="v" style={{ color: p.trophyChange > 0 ? "#C6FF33" : p.trophyChange < 0 ? "#FF6B80" : "#fff" }}>
              {p.trophyChange === 0 ? "—" : `${p.trophyChange > 0 ? "+" : ""}${p.trophyChange}`}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="xp" role="progressbar" aria-valuenow={p.barW} aria-valuemin={0} aria-valuemax={100} aria-label="Rank progress">
                <i style={{ width: `${p.barW}%` }} />
              </div>
              <span className="s">{p.trophyLine}</span>
            </div>
          </div>
          <div className="hud b stat2" style={{ position: "relative" }}>
            <span className="lbl dash">Coins</span>
            <span className="v">+{p.coins}</span>
            <span className="s">{p.coinLine}</span>
          </div>
        </div>

        <div
          className="up"
          style={{ position: "absolute", right: 44, bottom: 18, width: 344, display: "flex", flexDirection: "column", gap: 8, animationDelay: "1.4s" }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)", gap: 10 }}>
            {p.onPlayAgain ? (
              <button type="button" className="ar-btn" onClick={p.onPlayAgain} data-flat>
                <Icon name="i-go" />Play again
              </button>
            ) : (
              <Link className="ar-btn" href={p.playAgainHref} data-flat>
                <Icon name="i-go" />Play again
              </Link>
            )}
            <Link className="ar-btn ghost" href="/play" data-flat>
              <Icon name="i-home" />Lobby
            </Link>
          </div>
          <button type="button" className="quiet" style={{ alignSelf: "center" }} onClick={p.onReplay} data-flat>
            <Icon name="i-replay" />Replay the reveal
          </button>
        </div>
      </div>
    </ArenaStage>
  );
}
