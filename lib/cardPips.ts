// lib/cardPips.ts
//
// Where the pips sit on a numbered card face, as percentages of the face.
//
// These are the classic positions a printed deck uses, not an invented grid.
// The lower half is rotated 180° (`flip`), which is how a real card is laid
// out - the bottom pips point back at the person holding it.
//
// Note 7, 8 and 10 place pips BETWEEN the main rows (y = 26, 32, 68, 74).
// That is why this is a coordinate table rather than a CSS grid: a grid
// cannot express a half-row without inventing one.
//
// Kept out of the component so scripts/check-game-rules.ts can check the
// counts and the symmetry without pulling React in.

export interface Pip {
  /** Percent from the left edge. */
  x: number;
  /** Percent from the top edge. */
  y: number;
  /** Rotated 180°, as the lower half of a real card is. */
  flip?: boolean;
}

const L = 26, C = 50, R = 74;

export const PIPS: Record<string, Pip[]> = {
  "2": [{ x: C, y: 14 }, { x: C, y: 86, flip: true }],
  "3": [{ x: C, y: 14 }, { x: C, y: 50 }, { x: C, y: 86, flip: true }],
  "4": [{ x: L, y: 14 }, { x: R, y: 14 }, { x: L, y: 86, flip: true }, { x: R, y: 86, flip: true }],
  "5": [{ x: L, y: 14 }, { x: R, y: 14 }, { x: C, y: 50 }, { x: L, y: 86, flip: true }, { x: R, y: 86, flip: true }],
  "6": [{ x: L, y: 14 }, { x: R, y: 14 }, { x: L, y: 50 }, { x: R, y: 50 }, { x: L, y: 86, flip: true }, { x: R, y: 86, flip: true }],
  "7": [{ x: L, y: 14 }, { x: R, y: 14 }, { x: C, y: 32 }, { x: L, y: 50 }, { x: R, y: 50 }, { x: L, y: 86, flip: true }, { x: R, y: 86, flip: true }],
  "8": [{ x: L, y: 14 }, { x: R, y: 14 }, { x: C, y: 32 }, { x: L, y: 50 }, { x: R, y: 50 }, { x: C, y: 68, flip: true }, { x: L, y: 86, flip: true }, { x: R, y: 86, flip: true }],
  "9": [{ x: L, y: 14 }, { x: R, y: 14 }, { x: L, y: 38 }, { x: R, y: 38 }, { x: C, y: 50 }, { x: L, y: 62, flip: true }, { x: R, y: 62, flip: true }, { x: L, y: 86, flip: true }, { x: R, y: 86, flip: true }],
  "10": [{ x: L, y: 14 }, { x: R, y: 14 }, { x: C, y: 26 }, { x: L, y: 38 }, { x: R, y: 38 }, { x: L, y: 62, flip: true }, { x: R, y: 62, flip: true }, { x: C, y: 74, flip: true }, { x: L, y: 86, flip: true }, { x: R, y: 86, flip: true }],
};

/** J, Q and K are a solid suit-colour panel with a white letter, not pips. */
export const COURTS = new Set(["J", "Q", "K"]);
