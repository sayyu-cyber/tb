"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Crown, Layers3, Spade } from "lucide-react";
import { GameButton } from "./GameButton";
import { PlayingCard, suitFromLetter } from "./PlayingCard";
import { MindiCutScene } from "./MindiCutScene";
import { CUT_TIMELINE, CutPhase, cutPhaseAt } from "./mindiCutTimeline";
import { FirstPlayerDraw, SeatIndex, rankLabel } from "@/lib/mindiEngine";

interface Props {
  draw: FirstPlayerDraw;
  names: Record<SeatIndex, string>;
  seats: SeatIndex[];
  viewer: SeatIndex;
  handSize: number;
  cardBacks?: Partial<Record<SeatIndex, string>>;
  tableSkin?: string;
  /**
   * Which game is opening. Both games cut the same way and share this whole
   * ceremony (the 3D scene already handles two seats as well as four - see
   * mindiCutAnimation), so only the wording changes.
   */
  game?: "mindi" | "gin";
  onDone: () => void;
}

const GAME_LABEL: Record<"mindi" | "gin", string> = { mindi: "MINDI", gin: "GIN RUMMY" };

/** useLayoutEffect on the client, useEffect during prerender (where it warns). */
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Presentation only: the engine/backend has already settled this public draw. */
export function MindiDealIntro({ draw, names, seats, viewer, handSize, cardBacks = {}, tableSkin, game = "mindi", onDone }: Props) {
  const reduced = useReducedMotion();
  const dialog = useRef<HTMLDialogElement>(null);
  const labels = useRef<Partial<Record<SeatIndex, HTMLLIElement | null>>>({});
  const started = useRef<number | null>(null);
  const finished = useRef(false);
  const doneCallback = useRef(onDone); doneCallback.current = onDone;
  const [phase, setPhase] = useState<CutPhase>(reduced ? "winner" : "preparing");
  const [webgl, setWebgl] = useState(false);
  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    doneCallback.current();
  }, []);
  const start = useCallback(() => { if (started.current === null) started.current = performance.now(); }, []);
  const elapsed = useCallback(() => started.current === null ? 0 : performance.now() - started.current, []);

  /**
   * Jumps the ceremony forward to the first frame of the deal.
   *
   * The deal itself is not skippable - skipping only hurries past the cut.
   * This works by moving the clock's ORIGIN back rather than by setting a
   * phase directly, because the 3D scene reads the same clock through
   * elapsed(); shifting the origin fast-forwards the animation and the phase
   * together, instead of leaving the scene mid-cut under a "Dealing" caption.
   */
  const skipToDeal = useCallback(() => {
    started.current = performance.now() - CUT_TIMELINE.dealing;
    setPhase("dealing");
  }, []);
  const ordered = [...seats].sort((a, b) => ((a - viewer + 4) % 4) - ((b - viewer + 4) % 4));

  // Opened in a LAYOUT effect, not a passive one: a <dialog> is display:none
  // until showModal runs, so doing this after paint leaves one frame of
  // whatever is behind it. Falls back to useEffect during prerender, where
  // useLayoutEffect would warn and there is no paint to beat anyway.
  useBeforePaint(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); previous?.focus({ preventScroll: true }); };
  }, []);

  useEffect(() => {
    if (reduced) {
      // Still passes through the deal, so the hand is never dealt off screen
      // even when the animation itself is suppressed.
      setPhase("winner");
      const toDeal = setTimeout(() => setPhase("dealing"), 900);
      const timer = setTimeout(finish, 1900);
      return () => { clearTimeout(toDeal); clearTimeout(timer); };
    }
    // A renderer import or unavailable GPU must never hold the game hostage.
    const fallback = setTimeout(start, 1200);
    const timer = setInterval(() => {
      if (started.current === null) return;
      const time = elapsed();
      setPhase(cutPhaseAt(time));
      if (time >= CUT_TIMELINE.end) finish();
    }, 80);
    return () => { clearTimeout(fallback); clearInterval(timer); };
  }, [reduced, elapsed, finish, start]);

  const dealing = phase === "dealing";
  const winning = phase === "winner" || dealing;
  const revealed = phase === "reveal" || winning;
  const sceneVisible = webgl && !reduced;
  const phaseIndex = phase === "preparing" || phase === "cut" || phase === "fan" ? 0 : phase === "draw" || phase === "reveal" ? 1 : phase === "winner" ? 2 : 3;

  return <dialog ref={dialog} className="mindi-intro mindi-cut" aria-labelledby="mindi-intro-title" aria-describedby="mindi-intro-description"
    data-phase={phase} data-three={sceneVisible}
    /* Escape hurries past the cut but cannot dismiss the deal. preventDefault
       always fires, so the dialog never closes itself out from under the
       ceremony. */
    onCancel={event => { event.preventDefault(); if (!dealing) skipToDeal(); }}>
    <header className="mindi-cut-heading">
      <span className="mindi-cut-emblem" aria-hidden="true"><Spade /></span>
      <div><p className="mindi-cut-eyebrow">{GAME_LABEL[game]} <span>/</span> THE OPENING DRAW</p>
        <h2 id="mindi-intro-title">{phase === "dealing" ? "Dealing the cards" : "Cutting for first play"}</h2>
        <p className="mindi-intro-sub" id="mindi-intro-description" aria-live="polite">
          {phase === "dealing" ? `${handSize} cards each. Let the game begin.` : winning
            ? `${names[draw.winner]} drew the highest card and plays first`
            : "One card each. Highest card leads."}
        </p>
      </div>
    </header>

    <div className="mindi-cut-stage">
      {!reduced && <MindiCutScene draw={draw} seats={ordered} viewer={viewer} backs={cardBacks} skin={tableSkin} elapsed={elapsed} onReady={start} onRenderer={setWebgl}
        label={(seat, x, y, visible) => {
          const element = labels.current[seat];
          if (element) {
            element.style.setProperty("--cut-label-x", `${x}%`);
            element.style.setProperty("--cut-label-y", `${y}%`);
            element.style.setProperty("--cut-label-opacity", visible ? "1" : "0");
          }
        }} />}
      <ul className="mindi-intro-draw" aria-label="Opening draw results">
        {ordered.map(seat => {
          const card = draw.cards[seat], winner = winning && seat === draw.winner;
          return <li key={seat} ref={element => { labels.current[seat] = element; }} data-seat={seat} data-winner={winner ? "true" : undefined}>
            <div className="mindi-cut-fallback-card" aria-hidden="true"><PlayingCard rank={revealed ? rankLabel(card.rank) : ""} suit={suitFromLetter(card.suit)} faceDown={!revealed} cardBackId={cardBacks[seat]} size="lg" /></div>
            <div className="mindi-cut-name"><strong title={names[seat]}>{names[seat]}</strong>{seat === viewer && <small>You</small>}</div>
            <span className="mindi-cut-result">{winner ? <><Crown size={14} aria-hidden="true" /> First to play</> : revealed ? `${rankLabel(card.rank)} of ${suitFromLetter(card.suit)}` : "Drawing a card"}</span>
            {winner && <span className="sr-only">{rankLabel(card.rank)} of {suitFromLetter(card.suit)}</span>}
          </li>;
        })}
      </ul>
    </div>

    <footer className="mindi-cut-footer">
      <ol className="mindi-cut-steps" aria-label="Opening sequence">
        {["Cut", "Reveal", "First player", "Deal"].map((text, index) => <li key={text} aria-current={index === phaseIndex ? "step" : undefined} data-complete={index < phaseIndex}><span>{index + 1}</span>{text}</li>)}
      </ol>
      {/* Kept mounted and disabled rather than removed, so the footer does not
          reflow the moment the deal starts. */}
      <GameButton onClick={skipToDeal} disabled={dealing}>
        <Layers3 size={18} aria-hidden="true" />{dealing ? "Dealing…" : "Skip to deal"}
      </GameButton>
    </footer>
  </dialog>;
}
