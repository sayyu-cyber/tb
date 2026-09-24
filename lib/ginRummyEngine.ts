// lib/ginRummyEngine.ts
//
// Rules engine for Gin Rummy (2 players, standard 52-card deck, no jokers).
//
// THESE RULES COME FROM THE GAME OWNER and are the authority for this app.
// They deliberately differ from the standard game described on pagat.com,
// which an earlier version of this file implemented - do not "correct" the
// engine back toward that source.
//
// SETUP
// - Each player is dealt 10 cards; the rest form a stock, with the top card
//   turned up to start the discard pile.
//
// PLAY
// - Each turn: draw one card (from the stock or the top of the discard pile),
//   then discard one card. A turn is 15 seconds; see TURN_SECONDS.
// - If the stock runs out, the discard pile (except its top card) is shuffled
//   back into the stock and play continues. See replenishStock. There is no
//   fixed end to a hand - it runs until somebody wins.
//
// WINNING - the important difference
// - THERE IS NO KNOCKING. Deadwood never wins a hand, however low it is.
// - The only way to win is to hold, after discarding, exactly three melds
//   of sizes 3, 3 and 4 covering all ten cards. See findGinLayout.
//
// - Worth knowing, because it looks like a bug and is not: a long run counts
//   if it can be RE-CUT into 4+3+3. A ten-card run wins (A-2-3-4 | 5-6-7 |
//   8-9-10), and so do 6+4 and 7+3. The only way to meld all ten cards and
//   still not win is 5+5, because a five-card run cannot be cut into two
//   melds (that would need six cards) and a five-card set cannot exist.
//   So "must be 3,3,4" excludes exactly one shape: 5+5.
//
// - This is why bestMeldArrangement (which only minimises deadwood VALUE)
//   cannot be used to detect a win: it reports zero deadwood for 5+5 too.
//
// Deadwood is still computed, but only as a progress readout for the player
// and a heuristic for the bots - it decides nothing.
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

/** Seconds a player gets for a whole turn (draw AND discard together). */
export const TURN_SECONDS = 15;

/** The only winning shape: three melds of exactly these sizes, all 10 cards. */
export const GIN_MELD_SIZES = [4, 3, 3] as const;

/**
 * The winning layout for a hand, or null if the hand does not win.
 *
 * A win is exactly three melds of sizes 4, 3 and 3 covering all ten cards.
 * Because 4+3+3 is ten distinct cards, finding three non-overlapping melds of
 * those sizes in a ten-card hand necessarily covers the whole hand - there is
 * no separate "did it cover everything" check to forget.
 *
 * Deliberately NOT built on bestMeldArrangement: that minimises deadwood
 * value, so it happily reports zero deadwood for a 5+5 or a ten-card run,
 * neither of which wins under these rules.
 */
export function findGinLayout(hand: Card[]): Meld[] | null {
  if (hand.length !== 10) return null;
  const melds = candidateMelds(hand);
  const fours = melds.filter((meld) => meld.length === 4);
  const threes = melds.filter((meld) => meld.length === 3);

  for (const four of fours) {
    const usedByFour = new Set(four.map(cardId));
    for (let i = 0; i < threes.length; i++) {
      const first = threes[i];
      if (first.some((card) => usedByFour.has(cardId(card)))) continue;
      const usedSoFar = new Set([...Array.from(usedByFour), ...first.map(cardId)]);
      for (let j = i + 1; j < threes.length; j++) {
        const second = threes[j];
        if (second.some((card) => usedSoFar.has(cardId(card)))) continue;
        return [four, first, second];
      }
    }
  }
  return null;
}

export function isWinningGin(hand: Card[]): boolean {
  return findGinLayout(hand) !== null;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Refills an empty stock from the discard pile so play can continue.
 *
 * The top discard stays face up and in play - it is the card an opponent may
 * still draw - and everything beneath it is shuffled back into the stock.
 * Returns the input untouched when there is nothing to recycle, so callers
 * can apply this unconditionally.
 */
export function replenishStock(stock: Card[], discard: Card[]): { stock: Card[]; discard: Card[] } {
  if (stock.length > 0 || discard.length <= 1) return { stock, discard };
  const top = discard[discard.length - 1];
  return { stock: shuffle(discard.slice(0, -1)), discard: [top] };
}

export interface GinHandResult {
  winner: "player" | "opponent";
  /** The winning three melds, for the reveal at the end of the hand. */
  layout: Meld[];
  /** The loser's remaining deadwood - shown on the result screen only. */
  loserDeadwood: number;
  score: number;
}

/**
 * Scores a completed hand. Only ever called once a player's ten cards have
 * been verified as a 4+3+3 layout, so there is no losing branch here.
 */
export function scoreGin(winner: "player" | "opponent", layout: Meld[], loserHand: Card[]): GinHandResult {
  const loserDeadwood = bestMeldArrangement(loserHand).deadwoodValue;
  return { winner, layout, loserDeadwood, score: 25 + loserDeadwood };
}

/** Simple heuristic AI: prefers the discard-pile card only if it directly helps, else draws from stock. */
export function botChooseDraw(hand: Card[], topDiscard: Card | null): "stock" | "discard" {
  if (!topDiscard) return "stock";
  // Taking the face-up card is only worth it if it leads somewhere: either it
  // completes a winning layout outright, or it lowers deadwood.
  const withDiscard = [...hand, topDiscard];
  if (winningDiscard(withDiscard)) return "discard";
  return bestMeldArrangement(withDiscard).deadwoodValue < bestMeldArrangement(hand).deadwoodValue
    ? "discard"
    : "stock";
}

/**
 * The card to throw away that leaves a winning 4+3+3 behind, or null.
 * Shared by the bots and by the clients, which use it to detect that a human
 * player's discard has just won the hand.
 */
export function winningDiscard(hand: Card[]): Card | null {
  if (hand.length !== 11) return null;
  for (const candidate of hand) {
    const rest = hand.filter((card) => cardId(card) !== cardId(candidate));
    if (isWinningGin(rest)) return candidate;
  }
  return null;
}

/**
 * Chooses a discard. Winning ends the hand, so it outranks every heuristic;
 * otherwise this minimises resulting deadwood, breaking ties by throwing the
 * highest-value card.
 *
 * Note the deadwood heuristic does not aim at 4+3+3 directly - it is a rough
 * proxy that keeps the bot collecting melds. Without the winning check above
 * the bots would almost never actually go out.
 */
export function botChooseDiscard(hand: Card[]): Card {
  const winner = winningDiscard(hand);
  if (winner) return winner;

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

/**
 * The discard used when a player's 15 seconds run out. Deliberately random,
 * as specified - it does not protect a hand that was about to win, which is
 * the cost of letting the clock run down.
 */
export function randomDiscard(hand: Card[]): Card {
  return hand[Math.floor(Math.random() * hand.length)];
}
