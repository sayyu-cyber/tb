// lib/ginRummyEngine.ts
//
// Rules engine for Gin Rummy (2 players, standard 52-card deck, no jokers).
// Standard rules: https://www.pagat.com/rummy/ginrummy.html
// - Each player is dealt 10 cards; the rest form a stock, with the top card
//   turned up to start the discard pile.
// - Non-dealer moves first. Each turn: draw one card (from stock or the top
//   of the discard pile), then either discard one card, or knock.
// - A player may knock once their hand's deadwood (unmatched cards, after
//   forming sets/runs) is 10 points or less. Aces count 1, number cards
//   their face value, face cards 10 each.
// - Knocking with 0 deadwood is "Gin" (opponent may not lay off, +25 bonus).
// - Otherwise the opponent lays off any cards that extend the knocker's
//   melds, then deadwood is compared. If the opponent's deadwood ends up
//   equal to or lower than the knocker's, that's an "undercut" (opponent
//   scores the difference plus a 25 point bonus instead).
//
// Pure game logic only - no React, no Firebase.

export type Suit = "S" | "H" | "D" | "C";
// Ace is always low in Gin Rummy (rank 1) - no A-K wraparound in runs.
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  suit: Suit;
  rank: Rank;
}

export const SUITS: Suit[] = ["S", "H", "D", "C"];
export const SUIT_SYMBOLS: Record<Suit, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
export const SUIT_COLOR: Record<Suit, "red" | "black"> = { S: "black", H: "red", D: "red", C: "black" };

export function rankLabel(rank: Rank): string {
  if (rank === 1) return "A";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return String(rank);
}

export function cardValue(rank: Rank): number {
  if (rank >= 11) return 10;
  return rank;
}

export function cardId(card: Card): string {
  return `${card.suit}${card.rank}`;
}

export function createShuffledDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ suit, rank: rank as Rank });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export interface GinDeal {
  playerHand: Card[];
  opponentHand: Card[];
  stock: Card[];
  discard: Card[];
}

/** Deals a fresh hand: 10 cards each, then the next card starts the discard pile. */
export function dealGinHand(): GinDeal {
  const deck = createShuffledDeck();
  const playerHand = deck.slice(0, 10);
  const opponentHand = deck.slice(10, 20);
  const discard = [deck[20]];
  const stock = deck.slice(21);
  return { playerHand, opponentHand, stock, discard };
}

export type Meld = Card[];

function isSet(cards: Card[]): boolean {
  if (cards.length < 3) return false;
  return cards.every((c) => c.rank === cards[0].rank);
}

function isRun(cards: Card[]): boolean {
  if (cards.length < 3) return false;
  const suit = cards[0].suit;
  if (!cards.every((c) => c.suit === suit)) return false;
  const ranks = [...cards].map((c) => c.rank).sort((a, b) => a - b);
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) return false;
  }
  return true;
}

/** All possible sets/runs (length 3+) that can be formed from a hand. */
function candidateMelds(hand: Card[]): Meld[] {
  const melds: Meld[] = [];

  // Sets: group by rank, take all subsets of size 3 and 4.
  const byRank = new Map<Rank, Card[]>();
  for (const c of hand) {
    if (!byRank.has(c.rank)) byRank.set(c.rank, []);
    byRank.get(c.rank)!.push(c);
  }
  for (const cards of Array.from(byRank.values())) {
    if (cards.length >= 3) melds.push(cards.slice(0, 3));
    if (cards.length >= 4) melds.push(cards);
    if (cards.length === 4) {
      // also all four 3-card combinations
      for (let skip = 0; skip < 4; skip++) {
        melds.push(cards.filter((_: Card, i: number) => i !== skip));
      }
    }
  }

  // Runs: group by suit, sort by rank, find all consecutive runs length >= 3.
  const bySuit = new Map<Suit, Card[]>();
  for (const c of hand) {
    if (!bySuit.has(c.suit)) bySuit.set(c.suit, []);
    bySuit.get(c.suit)!.push(c);
  }
  for (const cards of Array.from(bySuit.values())) {
    const sorted = [...cards].sort((a, b) => a.rank - b.rank);
    for (let start = 0; start < sorted.length; start++) {
      let run: Card[] = [sorted[start]];
      for (let next = start + 1; next < sorted.length; next++) {
        if (sorted[next].rank === run[run.length - 1].rank + 1) {
          run = [...run, sorted[next]];
          if (run.length >= 3) melds.push(run);
        } else {
          break;
        }
      }
    }
  }

  return melds;
}

export interface MeldArrangement {
  melds: Meld[];
  deadwood: Card[];
  deadwoodValue: number;
}

/**
 * Finds the arrangement of non-overlapping melds that minimizes deadwood
 * value. Brute-force with memoization over "remaining card ids" - hands are
 * at most 11 cards, so this is small enough to be instant.
 */
export function bestMeldArrangement(hand: Card[]): MeldArrangement {
  const melds = candidateMelds(hand);
  const cache = new Map<string, { melds: Meld[]; value: number }>();

  function key(cards: Card[]): string {
    return cards.map(cardId).sort().join(",");
  }

  function solve(remaining: Card[]): { melds: Meld[]; value: number } {
    if (remaining.length === 0) return { melds: [], value: 0 };
    const k = key(remaining);
    const cached = cache.get(k);
    if (cached) return cached;

    const remainingIds = new Set(remaining.map(cardId));
    // Baseline: take no meld from remaining, all deadwood.
    let best = { melds: [] as Meld[], value: remaining.reduce((sum, c) => sum + cardValue(c.rank), 0) };

    for (const meld of melds) {
      if (!meld.every((c) => remainingIds.has(cardId(c)))) continue;
      const meldIds = new Set(meld.map(cardId));
      const rest = remaining.filter((c) => !meldIds.has(cardId(c)));
      const sub = solve(rest);
      if (sub.value < best.value) {
        best = { melds: [meld, ...sub.melds], value: sub.value };
      }
    }

    cache.set(k, best);
    return best;
  }

  const result = solve(hand);
  const meldedIds = new Set(result.melds.flat().map(cardId));
  const deadwood = hand.filter((c) => !meldedIds.has(cardId(c)));

  return { melds: result.melds, deadwood, deadwoodValue: result.value };
}

/**
 * Lays off deadwood cards onto the knocker's existing melds where legal
 * (extends a run, or completes a set), used to reduce the non-knocker's
 * deadwood after a knock (not applicable to a Gin knock).
 */
export function layOffDeadwood(deadwood: Card[], knockerMelds: Meld[]): { laidOff: Card[]; remaining: Card[] } {
  const laidOff: Card[] = [];
  let remaining = [...deadwood];
  let changed = true;

  while (changed) {
    changed = false;
    for (const card of [...remaining]) {
      for (const meld of knockerMelds) {
        if (canLayOff(card, meld)) {
          laidOff.push(card);
          remaining = remaining.filter((c) => cardId(c) !== cardId(card));
          changed = true;
          break;
        }
      }
    }
  }

  return { laidOff, remaining };
}

function canLayOff(card: Card, meld: Meld): boolean {
  if (isSet(meld)) {
    return card.rank === meld[0].rank;
  }
  if (isRun(meld)) {
    if (card.suit !== meld[0].suit) return false;
    const ranks = meld.map((c) => c.rank).sort((a, b) => a - b);
    return card.rank === ranks[0] - 1 || card.rank === ranks[ranks.length - 1] + 1;
  }
  return false;
}

export interface GinHandResult {
  winner: "player" | "opponent" | "draw";
  knocker: "player" | "opponent" | null;
  gin: boolean;
  undercut: boolean;
  playerDeadwood: number;
  opponentDeadwood: number;
  score: number; // points awarded to the winner (0 for a draw)
}

export function scoreKnock(
  knocker: "player" | "opponent",
  knockerArrangement: MeldArrangement,
  opponentHand: Card[]
): GinHandResult {
  const gin = knockerArrangement.deadwoodValue === 0;
  const opponentArrangement = bestMeldArrangement(opponentHand);

  if (gin) {
    const score = 25 + opponentArrangement.deadwoodValue;
    return {
      winner: knocker,
      knocker,
      gin: true,
      undercut: false,
      playerDeadwood: knocker === "player" ? 0 : opponentArrangement.deadwoodValue,
      opponentDeadwood: knocker === "player" ? opponentArrangement.deadwoodValue : 0,
      score,
    };
  }

  const { remaining } = layOffDeadwood(opponentArrangement.deadwood, knockerArrangement.melds);
  const opponentFinalDeadwood = remaining.reduce((sum, c) => sum + cardValue(c.rank), 0);

  if (opponentFinalDeadwood <= knockerArrangement.deadwoodValue) {
    // Undercut: the non-knocker wins instead.
    const nonKnocker = knocker === "player" ? "opponent" : "player";
    const score = 25 + (knockerArrangement.deadwoodValue - opponentFinalDeadwood);
    return {
      winner: nonKnocker,
      knocker,
      gin: false,
      undercut: true,
      playerDeadwood: knocker === "player" ? knockerArrangement.deadwoodValue : opponentFinalDeadwood,
      opponentDeadwood: knocker === "player" ? opponentFinalDeadwood : knockerArrangement.deadwoodValue,
      score,
    };
  }

  const score = opponentFinalDeadwood - knockerArrangement.deadwoodValue;
  return {
    winner: knocker,
    knocker,
    gin: false,
    undercut: false,
    playerDeadwood: knocker === "player" ? knockerArrangement.deadwoodValue : opponentFinalDeadwood,
    opponentDeadwood: knocker === "player" ? opponentFinalDeadwood : knockerArrangement.deadwoodValue,
    score,
  };
}

/** Simple heuristic AI: prefers the discard-pile card only if it directly helps, else draws from stock. */
export function botChooseDraw(hand: Card[], topDiscard: Card | null): "stock" | "discard" {
  if (!topDiscard) return "stock";
  const withoutDraw = bestMeldArrangement(hand).deadwoodValue;
  const withDiscard = bestMeldArrangement([...hand, topDiscard]).deadwoodValue;
  return withDiscard < withoutDraw ? "discard" : "stock";
}

/** Chooses the discard that minimizes resulting deadwood (ties broken by discarding the highest-value card). */
export function botChooseDiscard(hand: Card[]): Card {
  let best = hand[0];
  let bestValue = Infinity;
  for (const candidate of hand) {
    const rest = hand.filter((c) => cardId(c) !== cardId(candidate));
    const { deadwoodValue } = bestMeldArrangement(rest);
    if (
      deadwoodValue < bestValue ||
      (deadwoodValue === bestValue && cardValue(candidate.rank) > cardValue(best.rank))
    ) {
      best = candidate;
      bestValue = deadwoodValue;
    }
  }
  return best;
}
