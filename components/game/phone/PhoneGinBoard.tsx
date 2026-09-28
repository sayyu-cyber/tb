"use client";

import { ArenaStage } from "../ArenaStage";
import { ArenaSprite, Suit, Icon } from "../ArenaSprite";
import { cardId, rankLabel, type Card } from "@/lib/ginRummyEngine";
import type { ArenaSeatData } from "../GameArena";

/**
 * The Gin Rummy table on a phone held sideways —
 * design/arena/boards/PGin.dc.html,
 * design/arena/screens/phone/phone-land-03-gin.jpg and
 * phone-land-03b-gin-discard-selected.jpg.
 *
 * An 844x390 composition. The board keeps everything the desktop table has
 * and moves it: the meld reading and the deadwood become one 44px bar
 * top-left, the clock and whose turn it is become another top-right, the
 * opponent's ten backs shrink to a 24px fan under their chip, the stock and
 * discard sit on the felt in their dashed wells, and the hand runs across the
 * middle with a bracket over each meld. Your chip and the discard button take
 * the bottom corners.
 *
 * It holds no state. GinRummyTable owns the hand, the selection, the sort,
 * the rule book and the leave confirm, and renders this instead of its own
 * board when the phone is sideways - so tap-to-pick, tap-again-to-discard and
 * the 15-second clock are one implementation, not two.
 */

/** The board's aprons, front to back. */
const APRONS: [number, string][] = [
  [-60, "#030305"], [-50, "#07070B"], [-40, "#0B0B11"], [-30, "#0F1116"],
  [-20, "#14161C"], [-14, "#063A40"], [-10, "#00BCC8"], [-7, "#1C1E26"],
];

/** The five card-thicknesses the board stacks under the stock. */
const STOCK_LAYERS = [-4.4, -2.4, -0.4, 1.6, 3.6];

const SUIT_NAMES: Record<string, string> = { S: "spades", H: "hearts", D: "diamonds", C: "clubs" };

export interface PhoneGinGroup {
  /** The cards' ids, in the order they sit in the hand. */
  ids: string[];
  /** "Run 3", "Set 4", "DW 10" - the board's short forms. */
  label: string;
  deadwood: boolean;
}

export interface PhoneGinBoardProps {
  /** The hand in display order. */
  hand: Card[];
  /** Consecutive runs of that hand, one bracket each. */
  groups: PhoneGinGroup[];
  selected: Card | null;
  phase: "draw" | "discard";
  myTurn: boolean;
  name: string;
  opponent: ArenaSeatData;
  stock: number;
  discard: Card | null;
  /** Seconds left on this turn, and what the clock started from. */
  secondsLeft: number | null;
  turnSeconds: number;
  /** The meld reading top-left: "Ready · 4 · 3 · 3" or "Not out · 3 · 3". */
  reading: { title: string; big: string; ready: boolean };
  deadwoodValue: number;
  /**
   * The one line the board prints mid-table: what picking this card would
   * leave, or whose turn it is. Short, because `.hint` is nowrap.
   */
  hint: string;
  /** The action button's words: "Discard & win", "Discard 5", "Pick a card". */
  actionLabel: string;
  /** The id of the card just drawn, which the board tags "New". */
  drawnId: string | null;
  busy: boolean;
  onDraw: (source: "stock" | "discard") => void;
  onActivate: (card: Card) => void;
  onDiscard: () => void;
  onLeave: () => void;
  onMenu: () => void;
  /** True when the picked discard would go out - the board's "go" button. */
  selectedWins: boolean;
}

export function PhoneGinBoard(p: PhoneGinBoardProps) {
  const canDraw = p.myTurn && p.phase === "draw" && !p.busy;
  const canDiscard = p.myTurn && p.phase === "discard" && !!p.selected && !p.busy;
  const readColor = p.reading.ready ? "#C6FF33" : "#BEBECA";

  /**
   * The hand's arc, the board's own algorithm: 30px per card, 10px between
   * groups, cards 58 wide, centred on 422, with a shallow 0.55x
   * offset-squared drop and 1.3 degrees of rotation per step. Laying it out
   * from the groups rather than the cards is what makes the brackets line up
   * with the melds without measuring the DOM.
   */
  const step = 30, gap = 10, cardW = 58, top = 296;
  const position = new Map<string, { x: number; k: number }>();
  const spans: { a: number; b: number; group: PhoneGinGroup }[] = [];
  let x = -step - gap;
  let k = 0;
  for (const group of p.groups) {
    x += gap;
    const a = x + step;
    for (const id of group.ids) { x += step; position.set(id, { x, k: k++ }); }
    spans.push({ a, b: x + cardW, group });
  }
  const total = x + cardW;
  const left0 = 422 - total / 2;
  const offsetOf = (index: number) => index - (k - 1) / 2;
  const yAt = (offset: number) => Math.round(top + offset * offset * 0.55);

  const clockOff = p.secondsLeft === null
    ? 0
    : 88 * (1 - Math.max(0, Math.min(1, p.secondsLeft / p.turnSeconds)));

  const backs = Math.min(Math.max(p.opponent.cardCount, 0), 10);
  const angles = backs > 1 ? Array.from({ length: backs }, (_, i) => -22.5 + (45 / (backs - 1)) * i) : [0];

  return (
    <ArenaStage width={844} height={390} className="arena-pgin">
      <div className="ar" style={{ position: "relative", width: 844, height: 390, overflow: "hidden", background: "#000" }}>
        <ArenaSprite />
        <div className="bg" />

        <div className="stage" aria-hidden="true">
          <div className="floor" />
          <div className="table">
            {APRONS.map(([z, colour]) => (
              <div key={z} className="apron" style={{ transform: `translateZ(${z}px)`, background: colour }} />
            ))}
            <div className="felt gin" />
            <div className="spot" style={{ left: 430, top: 286 }} />
            <div className="spot" style={{ left: 646, top: 286 }} />
            <div className="printed" style={{ left: 392, top: 470 }}>Stock · {p.stock}</div>
            <div className="printed" style={{ left: 608, top: 470 }}>Discard</div>
            <div className="rail" />
            <svg className="leds" viewBox="0 0 1200 740">
              <defs>
                <filter id="pgin-led-glow" x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur stdDeviation="8" />
                </filter>
              </defs>
              <ellipse cx="600" cy="370" rx="565" ry="335" fill="none" stroke="#C6FF33" strokeOpacity=".65" strokeWidth="7" strokeLinecap="round" strokeDasharray="3 27" className="chase" data-ar-loop />
              <ellipse cx="600" cy="370" rx="533" ry="303" fill="none" stroke="#00BCC8" strokeWidth="16" strokeOpacity=".8" filter="url(#pgin-led-glow)" />
              <ellipse cx="600" cy="370" rx="533" ry="303" fill="none" stroke="#9FF2F7" strokeWidth="5" />
            </svg>
            {/* The stock's thickness. Only as many layers as there are cards
                to justify them, so an almost-empty stock looks almost empty. */}
            {STOCK_LAYERS.slice(0, Math.max(0, Math.min(5, p.stock - 1))).map((z) => (
              <div key={z} className="layer" style={{ left: 438, top: 294, transform: `translateZ(${z}px)` }} />
            ))}
          </div>
        </div>

        {/* The two piles, on top of the stage so they can be tapped. The
            board draws them as scenery; here they are how you draw. */}
        {/* pointer-events off on the layer, back on for the two piles, so
            this second 3D context places them without covering the hand. */}
        <div className="stage" style={{ pointerEvents: "none" }}>
          <div className="table">
            {p.stock > 0 && (
              <button
                type="button"
                className="tc"
                style={{ left: 438, top: 294, ["--z" as string]: "5.6px", ["--rot" as string]: "0deg", padding: 0, border: 0, background: "none", cursor: canDraw ? "pointer" : "default", pointerEvents: "auto" }}
                aria-label={`Draw from the stock, ${p.stock} left`}
                disabled={!canDraw}
                onClick={() => p.onDraw("stock")}
                data-flat
              >
                <div className="back"><i><Icon name="i-crown" /></i></div>
              </button>
            )}
            <div className="tc" style={{ left: 654, top: 294, ["--z" as string]: "-4.2px", ["--rot" as string]: "-9deg" }}><div className="blank" /></div>
            <div className="tc" style={{ left: 654, top: 294, ["--z" as string]: "-3.6px", ["--rot" as string]: "6deg" }}><div className="blank" /></div>
            {p.discard && (
              <button
                type="button"
                className="tc"
                style={{ left: 654, top: 294, ["--z" as string]: "-3px", ["--rot" as string]: "-2deg", padding: 0, border: 0, background: "none", cursor: canDraw ? "pointer" : "default", pointerEvents: "auto" }}
                aria-label={`Take the ${rankLabel(p.discard.rank)} of ${SUIT_NAMES[p.discard.suit]} from the discard pile`}
                disabled={!canDraw}
                onClick={() => p.onDraw("discard")}
                data-flat
              >
                <div className={`cf ${p.discard.suit === "H" || p.discard.suit === "D" ? "red" : ""}`.trim()}>
                  <div className="ix"><b>{rankLabel(p.discard.rank)}</b><Suit suit={p.discard.suit} /></div>
                  <Suit suit={p.discard.suit} className="mid" />
                </div>
              </button>
            )}
          </div>
        </div>

        {/* The opponent: their ten backs, and who they are. */}
        <div className="ofan" aria-hidden="true">
          {angles.map((angle, i) => (
            <div key={i} className="ob" style={{ ["--a" as string]: `${angle}deg` }}>
              <div className="back"><i><Icon name="i-crown" /></i></div>
            </div>
          ))}
        </div>
        <div className="who" style={{ left: 422, top: 62, transform: "translateX(-50%)" }}>
          <div className="av them">{p.opponent.name.slice(0, 1).toUpperCase()}<span className="ct">{p.opponent.cardCount}</span></div>
          <div>
            <b>{p.opponent.name}</b>
            <span className="st">
              <i className={`dot them ${p.myTurn ? "" : "live"}`.trim()} {...(p.myTurn ? {} : { "data-ar-loop": true })} />
              {p.myTurn ? "Waiting" : p.phase === "draw" ? "Drawing" : "Discarding"}
            </span>
          </div>
        </div>

        {/* Top left: leave, the meld reading and the deadwood. */}
        <div style={{ position: "absolute", left: 48, top: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" className="ibtn" aria-label="Leave game" onClick={p.onLeave} data-flat>
            <Icon name="i-back" />
          </button>
          <div className="bar" style={{ padding: "0 12px", gap: 10 }} aria-label="Your melds">
            <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="tag" style={{ color: readColor }}>{p.reading.title}</span>
              <b className="disp" style={{ fontSize: 16, color: readColor }}>{p.reading.big}</b>
            </span>
            <span style={{ width: 1, height: 24, background: "rgba(255,255,255,.14)" }} />
            <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <b className="num" style={{ fontSize: 16, lineHeight: 1 }}>{p.deadwoodValue}</b>
              <span className="tag" style={{ fontSize: 8 }}>Deadwood</span>
            </span>
          </div>
        </div>

        {/* Top right: the clock, whose turn it is, and the menu. The ring is
            drawn only while a clock is actually running. */}
        <div style={{ position: "absolute", right: 48, top: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <div className="bar" style={{ padding: "0 12px 0 6px", gap: 9 }}>
            {p.secondsLeft !== null && (
              <div className="clock">
                <svg viewBox="0 0 34 34" aria-hidden="true">
                  <circle cx="17" cy="17" r="14" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="3.5" />
                  <circle className="arc" cx="17" cy="17" r="14" fill="none" stroke="#C6FF33" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="88" strokeDashoffset={clockOff} />
                </svg>
                <b>{p.secondsLeft}</b>
              </div>
            )}
            <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="tag">{p.myTurn ? "Your turn" : p.opponent.name}</span>
              <span className="disp" style={{ fontSize: 14, whiteSpace: "nowrap" }}>
                {p.busy ? "Working…" : p.myTurn ? (p.phase === "draw" ? "Draw a card" : "Discard a card") : (p.phase === "draw" ? "Drawing" : "Discarding")}
              </span>
            </span>
          </div>
          <button type="button" className="ibtn" aria-label="Menu" onClick={p.onMenu} data-flat>
            <Icon name="i-menu" />
          </button>
        </div>

        <span className="hint" role="status">
          {p.myTurn && <i className="dot live" data-ar-loop />}
          {p.hint}
        </span>

        <section className="hand" aria-label="Your hand">
          {p.hand.map((card, index) => {
            const id = cardId(card);
            const slot = position.get(id);
            if (!slot) return null;
            const offset = offsetOf(slot.k);
            const chosen = !!p.selected && cardId(p.selected) === id;
            const red = card.suit === "H" || card.suit === "D";
            return (
              <button
                type="button"
                key={id}
                className={`hc ${chosen ? "sel" : ""} ${p.myTurn ? "" : "wait"}`.replace(/\s+/g, " ").trim()}
                style={{
                  ["--x" as string]: `${Math.round(left0 + slot.x)}px`,
                  ["--y" as string]: `${yAt(offset)}px`,
                  ["--r" as string]: `${(offset * 1.3).toFixed(2)}deg`,
                  ["--i" as string]: index,
                  zIndex: 10 + slot.k,
                }}
                disabled={!p.myTurn || p.phase !== "discard" || p.busy}
                aria-pressed={chosen}
                aria-label={`${rankLabel(card.rank)} of ${SUIT_NAMES[card.suit]}`}
                onClick={() => p.onActivate(card)}
                data-flat
              >
                {p.drawnId === id && p.myTurn && <span className="newtag">New</span>}
                <span className={`cf ${red ? "red" : ""} ${card.rank === 10 ? "ten" : ""}`.replace(/\s+/g, " ").trim()}>
                  <span className="ix"><b>{rankLabel(card.rank)}</b><Suit suit={card.suit} /></span>
                  <Suit suit={card.suit} className="mid" />
                </span>
              </button>
            );
          })}
        </section>

        {spans.map(({ a, b, group }) => (
          <div
            key={group.ids.join("")}
            className={`gtag ${group.deadwood ? "dw" : ""}`.trim()}
            style={{ left: Math.round(left0 + a + 4), top: top - 30, width: Math.round(b - a - 8) }}
          >
            <span>{group.label}</span>
          </div>
        ))}

        <div className={`who ${p.myTurn ? "turn" : ""}`.trim()} style={{ left: 48, bottom: 16 }}>
          <div className="av">{p.name.slice(0, 1).toUpperCase()}<span className="ct">{p.hand.length}</span></div>
          <div>
            <b>{p.myTurn ? "Your turn" : p.name}</b>
            <span className="st">
              <i className={`dot ${p.myTurn ? "live" : ""}`.trim()} {...(p.myTurn ? { "data-ar-loop": true } : {})} />
              {p.myTurn ? (p.phase === "draw" ? "Draw or take" : "Discard one") : "Waiting"}
            </span>
          </div>
        </div>

        <div style={{ position: "absolute", right: 48, bottom: 18 }}>
          <button
            type="button"
            className={`ar-btn ${p.selectedWins ? "go" : ""}`.trim()}
            style={{ width: 176 }}
            disabled={!canDiscard}
            onClick={p.onDiscard}
            data-flat
          >
            <Icon name="i-discard" />
            {p.actionLabel}
            {p.selected && !p.selectedWins && <Suit suit={p.selected.suit} style={{ width: 15, height: 15 }} />}
          </button>
        </div>
      </div>
    </ArenaStage>
  );
}
