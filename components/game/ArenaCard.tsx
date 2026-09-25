"use client";
import { Suit, Icon } from "./ArenaSprite";
import { PIPS, COURTS } from "@/lib/cardPips";

/**
 * A card face built to the board's exact structure
 * (design/arena/boards/Main.dc.html → `.face`).
 *
 * The board sizes a card entirely from font-size: the face is 7.2em x
 * 10.08em and every part inside — indices, pips, the court panel — is in em.
 * So a caller sets one font-size and gets a correctly proportioned card at
 * any scale. The board's own sizes: 15px on the felt, 18.333px in hand.
 *
 * Pip coordinates live in lib/cardPips.ts, where they are checked by
 * scripts/check-game-rules.ts.
 */

/**
 * lib/cardPips.ts holds coordinates as percentages of the whole FACE, which
 * is how the app's other card renders them. The board instead insets a
 * `.pips` box (2.38em either side, 1.66em top and bottom) and positions
 * within that, so the numbers have to be rebased.
 *
 * The two spaces line up exactly: x 26/50/74 maps to 0/50/100, and y 14..86
 * maps to 0..100. So this is a lossless rebase, not an approximation, and
 * the pip table stays the single source of truth that
 * scripts/check-game-rules.ts checks.
 */
const toBox = (pip: { x: number; y: number }) => ({
  x: ((pip.x - 26) / 48) * 100,
  y: ((pip.y - 14) / 72) * 100,
});

export function ArenaFace({
  rank,
  suit,
  ten = false,
  className = "",
}: {
  /** "A", "2".."10", "J", "Q", "K". */
  rank: string;
  /** Engine suit letter: S, H, D, C. */
  suit: string;
  /** Draws the foil ring. Tens decide Mindi, so they are marked. */
  ten?: boolean;
  className?: string;
}) {
  const red = suit === "H" || suit === "D";
  const pips = PIPS[rank];
  return (
    <span className={`face${red ? " red" : ""}${ten ? " ten" : ""} ${className}`}>
      <span className="idx tl"><b>{rank}</b><Suit suit={suit} /></span>
      <span className="idx br"><b>{rank}</b><Suit suit={suit} /></span>
      {COURTS.has(rank) ? (
        <span className="court"><b>{rank}</b><Suit suit={suit} /></span>
      ) : pips ? (
        <span className="pips">
          {pips.map((pip, i) => {
            // Inline coordinates, as the board does: each pip sits at its own
            // position inside the inset pip box.
            const at = toBox(pip);
            return <Suit key={i} suit={suit}
              className={`pip${pip.flip ? " flip" : ""}`}
              style={{ left: `${at.x}%`, top: `${at.y}%` }} />;
          })}
        </span>
      ) : (
        <Suit suit={suit} className="ace" />
      )}
    </span>
  );
}

/** The face-down back: blue lattice, lime crown in a black diamond. */
export function ArenaBack({ className = "" }: { className?: string }) {
  return (
    <span className={`back ${className}`}>
      <i><Icon name="i-crown" /></i>
    </span>
  );
}
