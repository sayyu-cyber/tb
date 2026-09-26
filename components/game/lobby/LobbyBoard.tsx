"use client";

import { useEffect, useRef, useState } from "react";
import { CrownGlyph } from "@/components/arena";
import { LobbyLeagueCard, LobbyRankCard, LobbyModes, type LobbyModesProps } from "./LobbyPanels";
import { LOBBY_GAMES, type LobbyGameId } from "./lobbyGames";

/**
 * The Play lobby — design/arena/boards/Lobby.dc.html, at its own size.
 *
 * This is the board's 1440x900 canvas with every element at the exact
 * coordinate the artboard gives it, scaled to the shell's available width.
 * The unused header strip is cropped because the app supplies its own.
 * Same approach as the Mindi and Gin tables, and for the
 * same reason: the lobby is a 3D scene, not a layout. The floor, the
 * podium, the LED ring and the two deck boxes are one perspective built
 * from a single rotateX/scale over a stack of translateZ'd aprons, and the
 * three panels are placed against that picture - at x=48, x=48 again 578px
 * lower, and x=1062. Those numbers only mean anything together. A fluid
 * grid could keep the panels legible but not keep the composition, which
 * is what the board actually is.
 *
 * The only thing omitted is the board's own header row (logo, nav, coin
 * chip, avatar). The shell already carries all four.
 *
 * The board's markup has inline colours as well as CSS ones, and
 * scripts/port-board.mjs only rewrites stylesheets. The two violets that
 * appear inline - the apron edge #3B1C78 and the felt lip #7D39EB - are
 * mapped here by hand to the same blues the generated sheet uses.
 */

/** The ten stacked aprons that give the podium its depth, board order. */
const APRONS: [number, string][] = [
  [-50, "#030305"], [-44, "#07070B"], [-38, "#0B0B11"], [-32, "#0F0E16"],
  [-26, "#13121C"], [-20, "#171621"], [-14, "#1A1924"],
  [-11, "#063A40"], [-9, "#00BCC8"], [-7, "#1E1D28"],
];

/** Drifting specks: left, top, delay, and whether it is a blue one. */
const MOTES: [number, number, number, boolean][] = [
  [430, 640, 0, false], [980, 600, 1.4, true], [900, 720, 2.8, false], [520, 760, 4.1, true],
];

/** The board's own diamond, for the Gin Rummy crest. */
function DiamondGlyph() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path fill="currentColor" d="M50 2C58 18 70 34 86 50C70 66 58 82 50 98C42 82 30 66 14 50C30 34 42 18 50 2Z" />
    </svg>
  );
}

export interface LobbyBoardProps extends Omit<LobbyModesProps, "game"> {
  game: LobbyGameId;
  onPickGame: (id: LobbyGameId) => void;
  /** The chosen game's entry, for the modes panel. */
  entry: LobbyModesProps["game"];
}

export function LobbyBoard({ game, onPickGame, entry, ...modes }: LobbyBoardProps) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () => {
      const box = element.getBoundingClientRect();
      if (!box.width) return;
      setScale(box.width / 1440);
    };
    measure();
    // Measure the frame so the sidebar is excluded from the board's width.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const mindi = game === "mindi";

  return (
    <div className="arena-lobby lob-frame" ref={frame}>
      {/* The room reaches the edges of the frame; the board is scaled
          inside it. Without this the backdrop would stop at the canvas and
          leave a visible box on a window that is not 16:10. */}
      <div className="bg" />

      <div className="ar lob-board" style={{ transform: `translateX(-50%) scale(${scale}) translateY(-90px)` }}>
        <div className="beam" style={{ left: "260px", top: "-40px", transform: "rotate(-14deg)" }} />
        <div className="beam" style={{ left: "660px", top: "-40px", transform: "rotate(14deg)" }} />

        <div className="stage" aria-hidden="true">
          <div className="floor" />
          <div className="table">
            {APRONS.map(([z, colour]) => (
              <div className="apron" key={z} style={{ transform: `translateZ(${z}px)`, background: colour }} />
            ))}
            <div className="felt pod" />
            <div className="rail" />
            <svg className="leds" viewBox="0 0 1200 740">
              <defs>
                <filter id="lobby-led-glow" x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur stdDeviation="6" />
                </filter>
              </defs>
              <ellipse cx="600" cy="370" rx="591" ry="361" fill="none" stroke="#FFFFFF" strokeOpacity=".16" strokeWidth="1.5" />
              <ellipse
                cx="600" cy="370" rx="565" ry="335" fill="none" stroke="#6FE9F0" strokeOpacity=".75"
                strokeWidth="4" strokeLinecap="round" strokeDasharray="2 22" className="chase" data-ar-loop
              />
              <ellipse cx="600" cy="370" rx="533" ry="303" fill="none" stroke="#C6FF33" strokeWidth="11" strokeOpacity=".7" filter="url(#lobby-led-glow)" />
              <ellipse cx="600" cy="370" rx="533" ry="303" fill="none" stroke="#DFFF85" strokeWidth="3.5" />
            </svg>
          </div>
        </div>

        {MOTES.map(([left, top, delay, blue]) => (
          <i
            className={blue ? "mote v" : "mote"}
            key={`${left}-${top}`}
            style={{ left: `${left}px`, top: `${top}px`, animationDelay: `${delay}s` }}
            data-ar-loop
            aria-hidden="true"
          />
        ))}

        <div className="glow" style={{ left: "472px", top: "606px", width: "260px", opacity: mindi ? 1 : 0 }} aria-hidden="true" />
        <div className="glow" style={{ left: "708px", top: "606px", width: "260px", opacity: mindi ? 0 : 1 }} aria-hidden="true" />
        <div className="shadow" style={{ left: "488px", top: "628px", width: "230px" }} aria-hidden="true" />
        <div className="shadow" style={{ left: "722px", top: "628px", width: "230px" }} aria-hidden="true" />

        {LOBBY_GAMES.map((deck) => {
          const chosen = deck.id === game;
          const isMindi = deck.id === "mindi";
          return (
            <button
              type="button"
              key={deck.id}
              className={`deck ${isMindi ? "vio" : "blk"} ${chosen ? "on" : "off"}`}
              style={{
                left: isMindi ? "514px" : "750px",
                top: "402px",
                ["--ry" as string]: isMindi ? "-16deg" : "16deg",
                ["--ry2" as string]: isMindi ? "-8deg" : "8deg",
              }}
              aria-pressed={chosen}
              aria-label={`${deck.name}, ${deck.meta}`}
              onClick={() => onPickGame(deck.id)}
              data-ar-loop
              data-flat
            >
              <span className="box">
                <span className="fc lside" />
                <span className="fc top" />
                <span className="fc side" />
                <span className="fc front">
                  <span className={isMindi ? "crest" : "crest lime"}>
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

      {/* Chrome, pinned to the frame rather than scaled with the scene.
          The board places these three against a 1440-wide picture; on a
          real window that is the picture's business, not theirs - they are
          controls, and controls belong in the corners they were drawn in:
          the league top-left, your rank bottom-left, and the modes panel
          down the right-hand edge, floor to ceiling, up against the nav.
          The podium keeps scaling behind them, and its LED ring tucks
          under them exactly as it does on the board. */}
      <div className="lob-title-block">
        <span className="lbl dash">Pick a game</span>
        <h1 className="disp chrome lob-title">Choose your table</h1>
      </div>
      <LobbyLeagueCard window={modes.leagueWindow} className="lob-pin lob-pin-tl" />
      <LobbyRankCard className="lob-pin lob-pin-bl" />
      <LobbyModes {...modes} game={entry} className="lob-pin lob-pin-r" />
    </div>
  );
}
