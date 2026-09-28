"use client";

import { ArenaStage } from "../ArenaStage";
import { ArenaSprite, Suit, Icon } from "../ArenaSprite";
import { cardId, rankLabel, isTen, type Card, type SeatIndex, type Suit as SuitLetter, type TrickPlay } from "@/lib/mindiEngine";
import type { ArenaSeatData } from "../GameArena";

/**
 * The Mindi table on a phone held sideways —
 * design/arena/boards/PMindi.dc.html,
 * design/arena/screens/phone/phone-land-02-mindi.jpg.
 *
 * An 844x390 composition, not the 1440x900 one shrunk. The board recomposes
 * the same hand for a screen a third of the height: the score rack and the
 * trump badge become two 44px bars along the top, the three opponents become
 * `.who` chips pinned to the edges instead of framed seats with fanned
 * hands, your own chip and the action button take the bottom corners, and
 * the hand sits in a shallow arc across the middle. The table itself is the
 * same 3D felt at `rotateX(50deg) scale(.5)`, pushed up so the horizon sits
 * behind the top bars.
 *
 * ArenaStage scales all of it to the VISIBLE viewport, so the hand and the
 * action button are never under the browser's own bars - MOBILE.md is
 * explicit that those two must not be cropped.
 *
 * It holds no state: MindiTable owns the hand, the selection, the leave
 * confirm and the rules, and renders this instead of its own board when the
 * phone is sideways. So double-tap-to-play, the legal-card rules and the
 * leave flow are the same code on both compositions, not two copies.
 */

/**
 * Where a played card lands on the felt, by seat relative to the viewer, in
 * the table's own 1200x740 space.
 *
 * The board draws two of the four - across at (546,172) and right at
 * (712,284) - because its sample trick is mid-hand with two cards down. The
 * other two are the mirror of those about the table's centre line and one
 * step nearer, on the board's own 112px vertical step. Worth a look against
 * phone-land-02-mindi.jpg with a full trick down.
 */
const TRICK_SPOT = [
  { x: 546, y: 396, rot: 2 },    // you, nearest the bottom
  { x: 380, y: 284, rot: -6 },   // left
  { x: 546, y: 172, rot: 3 },    // across
  { x: 712, y: 284, rot: -6 },   // right
];

/** The board's aprons, front to back. */
const APRONS: [number, string][] = [
  [-60, "#030305"], [-50, "#07070B"], [-40, "#0B0B11"], [-30, "#100F18"],
  [-20, "#16151F"], [-14, "#063A40"], [-10, "#00BCC8"], [-7, "#1E1D28"],
];

/** Felt colours, keyed by the table-theme cosmetic (data/cosmetics.ts). */
const FELT: Record<string, string> = {
  tt_default: "#06323A",
  tt_red: "#4A1119",
  tt_blue: "#0E2C4E",
  tt_black: "#101214",
};

const SUIT_NAMES: Record<string, string> = { S: "Spades", H: "Hearts", D: "Diamonds", C: "Clubs" };

export interface PhoneMindiBoardProps {
  /** The hand in the order it is displayed, already sorted or rearranged. */
  hand: Card[];
  /** Which of those may legally be played right now. */
  legal: Set<string>;
  /** The picked card's id, or null. */
  selected: string | null;
  viewer: SeatIndex;
  top: ArenaSeatData;
  left?: ArenaSeatData | null;
  right?: ArenaSeatData | null;
  /** The viewer's own name and card count, for the bottom-left chip. */
  you: { name: string; cards: number };
  active: boolean;
  /** Trump after any renege in the current trick, or null before one. */
  trump: SuitLetter | null;
  trick: TrickPlay[];
  /** The seat taking the trick once every card is down, else null. */
  winner: SeatIndex | null;
  tens: { us: number; them: number };
  tricks: { us: number; them: number };
  /** The suits of the Tens each side holds, for the two racks. */
  tenSuits: { us: SuitLetter[]; them: SuitLetter[] };
  /**
   * The one line the board prints mid-table - the board's own "Tap the 10
   * again to play it". Short, because `.hint` is nowrap; the turn status
   * lives in the chip bottom-left instead.
   */
  hint: string;
  /** The action button's words: "Play 10", "Pick a card". */
  actionLabel: string;
  tableSkin?: string;
  /** True when the picked card can actually be played. */
  canPlay: boolean;
  onActivate: (card: Card) => void;
  onPlay: () => void;
  onLeave: () => void;
  onMenu: () => void;
}

export function PhoneMindiBoard(p: PhoneMindiBoardProps) {
  const duel = !p.left && !p.right;
  const felt = FELT[p.tableSkin ?? "tt_default"] ?? FELT.tt_default;
  const chosen = p.hand.find((card) => cardId(card) === p.selected) ?? null;

  /**
   * The hand's arc. The board draws five cards 51px apart at y=285 with a
   * 1.75x offset-squared drop and 5 degrees of rotation per step, and those
   * are the numbers below - a five-card hand lands on the board's own
   * pixels. A full thirteen would be 674px wide at that spacing and would
   * run under the chip and the button in the bottom corners, so the spacing
   * closes to fit the 440px between them and the drop is capped, which keeps
   * the whole hand on the felt at every size. The same thing the desktop
   * board does with `Math.min(112, 980/(n-1))`.
   */
  const n = p.hand.length;
  const spacing = Math.min(51, n > 1 ? 378 / (n - 1) : 0);
  const layout = p.hand.map((card, i) => {
    const offset = n === 1 ? 0 : i - (n - 1) / 2;
    return {
      card,
      x: 422 - 31 + offset * spacing,
      y: 285 + Math.min(offset * offset * 1.75, 10),
      r: offset * 5,
    };
  });

  return (
    <ArenaStage width={844} height={390} className="arena-pmindi">
      <div className="ar" style={{ position: "relative", width: 844, height: 390, overflow: "hidden", background: "#000" }}>
        <ArenaSprite />
        <div className="bg" />

        <div className="stage" aria-hidden="true">
          <div className="floor" />
          <div className="table">
            {APRONS.map(([z, colour]) => (
              <div key={z} className="apron" style={{ transform: `translateZ(${z}px)`, background: colour }} />
            ))}
            <div className="felt" style={{ backgroundColor: felt }} />
            <div className="rail" />
            <svg className="leds" viewBox="0 0 1200 740">
              <defs>
                <filter id="pmindi-led-glow" x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur stdDeviation="8" />
                </filter>
              </defs>
              <ellipse cx="600" cy="370" rx="565" ry="335" fill="none" stroke="#6FE9F0" strokeOpacity=".8" strokeWidth="7" strokeLinecap="round" strokeDasharray="3 27" />
              <ellipse cx="600" cy="370" rx="533" ry="303" fill="none" stroke="#C6FF33" strokeWidth="16" strokeOpacity=".7" filter="url(#pmindi-led-glow)" />
              <ellipse cx="600" cy="370" rx="533" ry="303" fill="none" stroke="#DFFF85" strokeWidth="5" />
            </svg>

            {p.trick.map((play) => {
              const spot = TRICK_SPOT[(play.seat - p.viewer + 4) % 4];
              const won = p.winner === play.seat;
              return (
                <div
                  key={cardId(play.card)}
                  className={`tcard ${won ? "win" : ""}`.trim()}
                  style={{ left: spot.x, top: spot.y, ["--rot" as string]: `${spot.rot}deg` }}
                >
                  <div className={`cf ${play.card.suit === "H" || play.card.suit === "D" ? "red" : ""} ${isTen(play.card) ? "ten" : ""}`.replace(/\s+/g, " ").trim()}>
                    <div className="ix"><b>{rankLabel(play.card.rank)}</b><Suit suit={play.card.suit} /></div>
                    <Suit suit={play.card.suit} className="mid" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top left: leave, the Tens racks and the trick count. */}
        <div style={{ position: "absolute", left: 48, top: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" className="ibtn" aria-label="Leave game" onClick={p.onLeave} data-flat>
            <Icon name="i-back" />
          </button>
          <div className="bar" style={{ padding: "0 12px", gap: 9 }} aria-label="Tens and tricks">
            <span className="tag" style={{ color: "#fff" }}>Tens</span>
            <span className="tag" style={{ color: "#D4D4DC" }}><i className="dot" />{duel ? "You" : "Us"}</span>
            <TenRack suits={p.tenSuits.us} />
            <span className="tag" style={{ color: "#D4D4DC" }}><i className="dot them" />{duel ? "They" : "Them"}</span>
            <TenRack suits={p.tenSuits.them} />
            <span style={{ width: 1, height: 22, background: "rgba(255,255,255,.14)" }} />
            <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <b className="num" style={{ fontSize: 15, lineHeight: 1, color: "#C6FF33" }}>{p.tricks.us}–{p.tricks.them}</b>
              <span className="tag" style={{ fontSize: 8.5, color: "#A4A4B2" }}>Tricks</span>
            </span>
          </div>
        </div>

        {/* Top right: trump and the menu. The board's badge is drawn with a
            suit in it; before a renege there is no trump yet, so the hexagon
            stays but goes quiet rather than showing a suit nobody chose. */}
        <div style={{ position: "absolute", right: 48, top: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <div className="bar" style={{ padding: "0 14px 0 6px", gap: 9 }}>
            <div className="hx" style={p.trump ? undefined : { filter: "grayscale(1) brightness(.6)" }}>
              {p.trump ? <Suit suit={p.trump} /> : <Icon name="i-crown" />}
            </div>
            <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="tag" style={{ fontSize: 8.5, color: "#A4A4B2" }}>Trump</span>
              <span className="disp" style={{ fontSize: 15 }}>{p.trump ? SUIT_NAMES[p.trump] : "Not set"}</span>
            </span>
          </div>
          <button type="button" className="ibtn" aria-label="Menu" onClick={p.onMenu} data-flat>
            <Icon name="i-menu" />
          </button>
        </div>

        {/* The three other seats. In the 1v1 room variant there is only one,
            and the board's own centre position is where it belongs. */}
        <Who seat={p.top} partner={!duel} style={{ left: 422, top: 62, transform: "translateX(-50%)" }} />
        {p.left && <Who seat={p.left} partner={false} style={{ left: 48, top: 150 }} />}
        {p.right && <Who seat={p.right} partner={false} style={{ right: 48, top: 150 }} />}

        <span className="hint" role="status">
          {p.active && <i className="dot live" data-ar-loop />}
          {p.hint}
        </span>

        <section aria-label="Your hand">
          {layout.map(({ card, x, y, r }) => {
            const id = cardId(card);
            const playable = p.legal.has(id);
            const red = card.suit === "H" || card.suit === "D";
            return (
              <button
                type="button"
                key={id}
                className={`hc ${p.selected === id ? "sel" : ""} ${p.active && !playable ? "no" : ""}`.replace(/\s+/g, " ").trim()}
                style={{ left: x, top: y, transform: `rotate(${r}deg)` }}
                aria-label={`${rankLabel(card.rank)} of ${SUIT_NAMES[card.suit].toLowerCase()}${p.active && !playable ? ", can't play" : ""}`}
                aria-pressed={p.selected === id}
                disabled={p.active && !playable}
                onClick={() => p.onActivate(card)}
                data-flat
              >
                <span className={`cf ${red ? "red" : ""} ${isTen(card) ? "ten" : ""}`.replace(/\s+/g, " ").trim()}>
                  <span className="ix"><b>{rankLabel(card.rank)}</b><Suit suit={card.suit} /></span>
                  <Suit suit={card.suit} className="mid" />
                </span>
              </button>
            );
          })}
        </section>

        {/* You, bottom left. The board writes the lime ring inline on the
            turn it is yours, so it is written inline here too. */}
        <div
          className="who"
          style={{
            left: 48, bottom: 18,
            ...(p.active ? { borderColor: "#C6FF33", boxShadow: "0 0 0 3px rgba(198,255,51,.14), 0 0 20px rgba(198,255,51,.22)" } : null),
          }}
        >
          <div className="av">{p.you.name.slice(0, 1).toUpperCase()}<span className="ct">{p.you.cards}</span></div>
          <div>
            <b>{p.active ? "Your turn" : p.you.name}</b>
            <span className="st">
              <i className={`dot ${p.active ? "live" : ""}`.trim()} {...(p.active ? { "data-ar-loop": true } : {})} />
              {p.active ? shortHint(p.trick) : "Waiting"}
            </span>
          </div>
        </div>

        <div style={{ position: "absolute", right: 48, bottom: 22 }}>
          <button type="button" className="ar-btn" disabled={!p.canPlay} onClick={p.onPlay} data-flat>
            <Icon name="i-play" />
            {p.actionLabel}
            {chosen && <Suit suit={chosen.suit} />}
          </button>
        </div>
      </div>
    </ArenaStage>
  );
}

/** One side's Tens, as the board's 20x28 foil minis. */
function TenRack({ suits }: { suits: SuitLetter[] }) {
  if (suits.length === 0) return <span className="tag" style={{ fontSize: 8.5, color: "#6E6E7B" }}>None</span>;
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {suits.map((suit) => (
        <div key={suit} className={`mini foil ${suit === "H" || suit === "D" ? "red" : ""}`.trim()}>
          <b>10</b><Suit suit={suit} />
        </div>
      ))}
    </div>
  );
}

/** A seated player, as the board's `.who` chip. */
function Who({ seat, partner, style }: { seat: ArenaSeatData; partner: boolean; style: React.CSSProperties }) {
  return (
    <div className="who" style={style}>
      <div className={`av ${partner ? "" : "them"}`.trim()}>
        {seat.name.slice(0, 1).toUpperCase()}<span className="ct">{seat.cardCount}</span>
      </div>
      <div>
        <b>{seat.name}</b>
        <span className="st">
          <i className={`dot ${partner ? "" : "them"} ${seat.active ? "live" : ""}`.replace(/\s+/g, " ").trim()}
             {...(seat.active ? { "data-ar-loop": true } : {})} />
          {seat.active ? "Playing" : partner ? "Partner" : "Waiting"}
        </span>
      </div>
    </div>
  );
}

/** "Follow spades" or "Lead any card" - what the board's chip says. */
function shortHint(trick: TrickPlay[]): string {
  if (trick.length === 0) return "Lead any card";
  return `Follow ${SUIT_NAMES[trick[0].card.suit].toLowerCase()}`;
}
