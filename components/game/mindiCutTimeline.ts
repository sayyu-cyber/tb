/**
 * The opening deal's clock - design/arena/DEAL_AND_ROOMS.md "Timeline", and
 * timeline() / phaseAt() in design/arena/boards/Cut.dc.html.
 *
 * CUT_TIMELINE is the spec's summary: when each step of the ceremony starts,
 * in milliseconds from the first frame. Gin ends earlier than Mindi because
 * it deals 20 cards rather than 52 (see openingTimeline for the arithmetic).
 */
export const CUT_TIMELINE = { fan: 1150, draw: 1900, reveal: 3150, winner: 4350, dealing: 5650, end: 8680 } as const;
export const CUT_TIMELINE_GIN_END = 8188;

/** The spec's four steps, as the step bar reads them. */
export type CutPhase = "preparing" | "cut" | "fan" | "draw" | "reveal" | "winner" | "dealing";

/** Kept for callers that only need the spec's coarse steps. */
export function cutPhaseAt(elapsed: number): CutPhase {
  if (elapsed >= CUT_TIMELINE.dealing) return "dealing";
  if (elapsed >= CUT_TIMELINE.winner) return "winner";
  if (elapsed >= CUT_TIMELINE.reveal) return "reveal";
  if (elapsed >= CUT_TIMELINE.draw) return "draw";
  if (elapsed >= CUT_TIMELINE.fan) return "fan";
  return "cut";
}

/**
 * The board's nine moments. shuffle -> spread -> draw -> gather make up the
 * Cut step, then reveal, first (the winner rises), collect (the cut cards go
 * back on the deck), deal (the flights) and ready (the hand comes up).
 */
export type DealPhase = "shuffle" | "spread" | "draw" | "gather" | "reveal" | "first" | "collect" | "deal" | "ready";

/** Which of the four steps (Cut, Reveal, First, Deal) each moment belongs to; 4 is the table. */
export const DEAL_STEP: Record<DealPhase, 0 | 1 | 2 | 3 | 4> = {
  shuffle: 0, spread: 0, draw: 0, gather: 0, reveal: 1, first: 2, collect: 3, deal: 3, ready: 4,
};

export interface DealTimeline {
  spread: number;
  draw: number;
  gather: number;
  reveal: number;
  first: number;
  deal: number;
  /** When the first card leaves the dealer's deck. */
  fly: number;
  /** How long one flight lasts. */
  dur: number;
  /** Between one card leaving and the next. */
  gap: number;
  /** Cards dealt in all. */
  cards: number;
  lastLand: number;
  /** Gin only: when the upcard turns over. */
  up: number | null;
  ready: number;
}

/**
 * timeline() from the board, for any number of seats and hand size.
 *
 *   Mindi, four seats: 52 cards, 40 ms apart -> ready at 8680.
 *   Mindi 1v1:         52 cards (26 each), 40 ms apart, no upcard -> 8680.
 *   Gin:               20 cards, 62 ms apart, upcard at 7738 -> 8188.
 */
export function openingTimeline({ seats, handSize, gap, upcard }: { seats: number; handSize: number; gap: number; upcard: boolean }): DealTimeline {
  const base = { spread: 1150, draw: 1900, gather: 2750, reveal: 3150, first: 4350, deal: 5650, fly: 6150, dur: 330 };
  const cards = seats * handSize;
  const lastLand = base.fly + (cards - 1) * gap + base.dur;
  const up = upcard ? lastLand + 80 : null;
  const ready = up !== null ? up + base.dur + 120 : lastLand + 160;
  return { ...base, gap, cards, lastLand, up, ready };
}

/** phaseAt() from the board. */
export function openingPhaseAt(t: number, T: DealTimeline): DealPhase {
  if (t < T.spread) return "shuffle";
  if (t < T.draw) return "spread";
  if (t < T.gather) return "draw";
  if (t < T.reveal) return "gather";
  if (t < T.first) return "reveal";
  if (t < T.deal) return "first";
  if (t < T.fly) return "collect";
  if (t < T.ready) return "deal";
  return "ready";
}

/**
 * The moment each of the board's `phase` props freezes on (elapsed() in
 * Cut.dc.html), used by the fixtures that screenshot the ceremony still.
 */
export function frozenMoment(phase: "Cut" | "Reveal" | "First player" | "Deal" | "Ready", T: DealTimeline): number {
  switch (phase) {
    case "Cut": return 2600;
    case "Reveal": return 4150;
    case "First player": return 5000;
    case "Deal": return T.fly + Math.round(T.cards * 0.55) * T.gap + 190;
    case "Ready": return T.ready + 1600;
  }
}
