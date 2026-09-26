"use client";

import { useEffect, useRef, useState } from "react";
import { CrownGlyph } from "@/components/arena";
import { LOBBY_GAMES, type LobbyGameId } from "./lobbyGames";

/**
 * The lit podium and the two deck boxes —
 * design/arena/screens/lobby-01-mindi.jpg and lobby-02-gin-finding.jpg,
 * from design/arena/boards/Lobby.dc.html.
 *
 * Everything in here is at the board's own pixel positions on its 1440x900
 * canvas, because that is the only way a 3D scene keeps its composition:
 * the floor, the table, the LED ring and the two boxes are one perspective
 * built from `rotateX(60deg) scale(.66)` and a stack of translateZ'd
 * aprons. Reflowing those numbers individually would take the scene apart.
 *
 * So the canvas stays 1440x900 and the whole thing is scaled by one factor
 * to fit the space the shell leaves (the same trick as
 * components/game/ArenaStage, which cannot be reused directly because it is
 * `position: fixed` over the whole viewport and this sits inside a page
 * that still has a sidebar, a top bar and two columns of panels).
 *
 * The panels around it are NOT in here - they are ordinary flow layout in
 * LobbyPanels, so they stay readable at any width.
 *
 * The board's markup has inline colours as well as CSS ones, and
 * scripts/port-board.mjs only rewrites stylesheets. The two violets that
 * appear inline - the apron edge #3B1C78 and the felt lip #7D39EB - are
 * mapped here by hand to the same blues the script uses (#063A40 and
 * #00BCC8), so the scene matches the generated sheet.
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

export function LobbyPodium({ game, onPick }: { game: LobbyGameId; onPick: (id: LobbyGameId) => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () => {
      const box = element.getBoundingClientRect();
      if (!box.width || !box.height) return;
      setScale(Math.min(box.width / 1440, box.height / 900));
    };
    measure();
    // The frame rather than the window, so opening the sidebar re-measures.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const mindi = game === "mindi";

  return (
    <div className="lob-scene" ref={frame}>
      {/* The board's backdrop, on the scene rather than inside the canvas:
          its gradients are the room the podium stands in, so they should
          fill the page at any size instead of being scaled with the table. */}
      <div className="bg" />
      <div className="lob-canvas" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
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

        {LOBBY_GAMES.map((entry) => {
          const chosen = entry.id === game;
          const isMindi = entry.id === "mindi";
          return (
            <button
              type="button"
              key={entry.id}
              className={`deck ${isMindi ? "vio" : "blk"} ${chosen ? "on" : "off"}`}
              style={{
                left: isMindi ? "514px" : "750px",
                top: "402px",
                ["--ry" as string]: isMindi ? "-16deg" : "16deg",
                ["--ry2" as string]: isMindi ? "-8deg" : "8deg",
              }}
              aria-pressed={chosen}
              aria-label={`${entry.name}, ${entry.meta}`}
              onClick={() => onPick(entry.id)}
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
                      {entry.deckLines.map((line, index) => (
                        <span key={line}>{index > 0 && <br />}{line}</span>
                      ))}
                    </b>
                    <span lang="dv" dir="rtl">{entry.thaana}</span>
                  </span>
                  <span className="deckmeta">{entry.meta}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
