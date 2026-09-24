// lib/mindiEngine.ts
//
// Rules engine for Mindi.
//
// These rules come from the game owner and are the authority for this app.
// They differ from the published "Dihaeh" description on pagat.com, which an
// earlier version of this file implemented — do not "correct" the engine back
// toward that source.
//
// SETUP
//   4 players, two fixed partnerships, partners sit opposite.
//   13 cards each from a standard 52-card pack.
//   Four cards are drawn face up, one per seat; highest card leads the first
//   trick (drawForFirstPlayer).
//   Ranking is standard: A high, then K Q J 10 9 ... 2.
//
// PLAY
//   Follow the led suit if you hold it. Highest card of the led suit wins.
//   The winner of a trick leads the next.
//   Every hand is played out to all 13 tricks — there is no early finish.
//
// TRUMP
//   There is NO trump at the start of a hand. The first time any player
//   cannot follow the led suit, the suit they play instead becomes trump for
//   the remainder of the hand. It takes effect immediately, so that card wins
//   the trick it was played in unless a higher trump follows in the same
//   trick. Trump beats any non-trump; only a higher trump beats a trump.
//
// WINNING — Tens ("Mindi" cards) decide it
//   Most Tens wins. Trick count is ONLY consulted at 2-2, so three Tens beats
//   one Ten even if the other team won every trick.
//   All four Tens AND every trick  = "Haas Baga".
//   All four Tens, not every trick = "Baga".
//
// This module is pure game logic — no React, no Firebase — so it can be
// reused by AI matches, Pass & Play, and online matchmaking.

import { cutForFirstPlay } from "./openingCut";

export type Suit = "S" | "H" | "D" | "C";
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  suit: Suit;
  rank: Rank;
}

export const SUITS: Suit[] = ["S", "H", "D", "C"];
export const SUIT_SYMBOLS: Record<Suit, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
export const SUIT_COLOR: Record<Suit, "red" | "black"> = { S: "black", H: "red", D: "red", C: "black" };

export function rankLabel(rank: Rank): string {
  if (rank === 14) return "A";
  if (rank === 13) return "K";
  if (rank === 12) return "Q";
  if (rank === 11) return "J";
  return String(rank);
}

export function cardId(card: Card): string {
  return `${card.suit}${card.rank}`;
}

// Seats are arranged like a card table: 0 = South (you), 1 = West,
// 2 = North (your partner), 3 = East. Seats 0 & 2 are Team A,
// seats 1 & 3 are Team B — this matches "fixed partnerships" (partner sits
// opposite you).
export type SeatIndex = 0 | 1 | 2 | 3;
export type Team = "A" | "B";

export const SEATS: SeatIndex[] = [0, 1, 2, 3];

export function teamOf(seat: SeatIndex): Team {
  return seat === 0 || seat === 2 ? "A" : "B";
}

export function partnerOf(seat: SeatIndex): SeatIndex {
  return ((seat + 2) % 4) as SeatIndex;
}

export function nextSeat(seat: SeatIndex): SeatIndex {
  return ((seat + 1) % 4) as SeatIndex;
}

/** Like nextSeat, but for the 1v1 FFA variant where only seats 0 and 1 are
 *  ever in play (see dealMindiHandFFA1v1) - just toggles between the two. */
export function nextSeatFFA1v1(seat: 0 | 1): 0 | 1 {
  return seat === 0 ? 1 : 0;
}

export interface TrickPlay {
  seat: SeatIndex;
  card: Card;
}

/** Public cards from the most recently completed trick, for table review. */
export interface CompletedTrick {
  plays: TrickPlay[];
  winner: SeatIndex;
  number: number;
}

export interface MindiDeal {
  hands: Record<SeatIndex, Card[]>;
  /**
   * NULL until trump is established during play.
   *
   * Trump is not dealt in this game. The first time any player cannot follow
   * the led suit, whatever suit they play instead becomes trump for the rest
   * of the hand. Until that happens there is no trump at all and the highest
   * card of the led suit simply wins. See establishTrump().
   */
  trumpSuit: Suit | null;
  dealer: SeatIndex;
  leader: SeatIndex;
}

/**
 * Four cards drawn face up, one per seat, to decide who leads the first
 * trick — highest card starts. Returned as a full record so the UI can show
 * the draw before the deal.
 *
 * Ties are broken by redrawing rather than by seat order, so the outcome
 * never depends on where you happen to be sitting.
 */
export interface FirstPlayerDraw {
  cards: Record<SeatIndex, Card>;
  winner: SeatIndex;
}

/**
 * Kept as Mindi's own name for the cut, but the implementation is shared with
 * Gin Rummy in lib/openingCut.ts - both games open the same way, and neither
 * engine should have to import the other. Mindi's card ranks are already
 * 2..14 ace-high, so the shared cut card is the same shape as a Mindi card.
 */
export function drawForFirstPlayer(seats: SeatIndex[] = SEATS): FirstPlayerDraw {
  const cut = cutForFirstPlay(seats);
  return { cards: cut.cards as Record<SeatIndex, Card>, winner: cut.winner };
}

/**
 * Draw for first play, then deal with that winner as the leader.
 *
 * Every mode should open a hand through here rather than calling
 * dealMindiHand directly, so the draw can never be skipped and the leader can
 * never silently fall back to "the dealer's left". Online callers store the
 * returned `draw` in the match document so all clients replay one shared
 * result instead of each generating their own.
 */
export interface MindiOpening {
  draw: FirstPlayerDraw;
  deal: MindiDeal;
}

export function openMindiHand(dealer: SeatIndex = 3): MindiOpening {
  const draw = drawForFirstPlayer();
  return { draw, deal: dealMindiHand(dealer, draw.winner) };
}

export function openMindiHandFFA1v1(dealer: 0 | 1 = 1): MindiOpening {
  const draw = drawForFirstPlayer([0, 1]);
  return { draw, deal: dealMindiHandFFA1v1(dealer, draw.winner as 0 | 1) };
}

function createShuffledDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push({ suit, rank: rank as Rank });
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Deals a fresh hand: 13 cards each, one at a time, clockwise from the
 * dealer's left.
 *
 * No trump is set here. `leader` is who plays the first card, and is decided
 * by the four-card draw (drawForFirstPlayer) rather than by seat position,
 * so pass the draw winner in.
 */
export function dealMindiHand(dealer: SeatIndex, leader: SeatIndex = nextSeat(dealer)): MindiDeal {
  const deck = createShuffledDeck();
  const hands: Record<SeatIndex, Card[]> = { 0: [], 1: [], 2: [], 3: [] };

  let seat = nextSeat(dealer);
  for (let i = 0; i < 52; i++) {
    hands[seat].push(deck[i]);
    seat = nextSeat(seat);
  }

  return { hands, trumpSuit: null, dealer, leader };
}

/**
 * Deals a 1v1 "free-for-all" hand: just two players, seats 0 and 1, no
 * partnership. Reuses the existing team plumbing unmodified - teamOf(0) is
 * always "A" and teamOf(1) is always "B", and since each "team" here has
 * exactly one player, the existing tensCaptured/tricksWon-by-team tallies
 * already are individual scoring for this mode. Seats 2 and 3 are simply
 * never dealt into or played from.
 *
 * 26 cards each (52 / 2), same one-at-a-time dealing rule as the 4-player
 * game. Trump is established in play here too, not dealt.
 */
export function dealMindiHandFFA1v1(dealer: 0 | 1, leader: 0 | 1 = dealer === 0 ? 1 : 0): MindiDeal {
  const deck = createShuffledDeck();
  const hands: Record<SeatIndex, Card[]> = { 0: [], 1: [], 2: [], 3: [] };

  const other: 0 | 1 = dealer === 0 ? 1 : 0;
  let seat: 0 | 1 = other;
  for (let i = 0; i < 52; i++) {
    hands[seat].push(deck[i]);
    seat = seat === 0 ? 1 : 0;
  }

  return { hands, trumpSuit: null, dealer, leader };
}

/** Cards a seat may legally play, given the suit led (null if this seat is leading). */
export function getLegalPlays(hand: Card[], ledSuit: Suit | null): Card[] {
  if (!ledSuit) return hand;
  const followers = hand.filter((c) => c.suit === ledSuit);
  return followers.length > 0 ? followers : hand;
}

/**
 * Trump after this card is played.
 *
 * Trump is established the first time anyone plays off-suit. No extra state
 * is needed to detect "couldn't follow": getLegalPlays already forces you to
 * follow the led suit whenever you hold it, so an off-suit card IS a renege
 * by definition.
 *
 * Returns the existing trump unchanged once one is set — only the FIRST
 * renege in a hand sets it, and it holds for the rest of the hand.
 */
export function establishTrump(
  trumpSuit: Suit | null,
  ledSuit: Suit | null,
  card: Card
): Suit | null {
  if (trumpSuit) return trumpSuit;
  if (!ledSuit) return null; // leading a trick can never set trump
  return card.suit === ledSuit ? null : card.suit;
}

/**
 * Which seat wins a completed trick.
 *
 * `trumpSuit` is null before any trump has been established, in which case
 * the highest card of the led suit simply wins.
 *
 * Note the trump that was established BY this trick counts within it: the
 * off-suit card that created the trump beats the led suit and takes the
 * round, unless a later player in the same trick plays a higher trump. Pass
 * the post-establishment trump in and this falls out naturally.
 */
export function resolveTrick(plays: TrickPlay[], trumpSuit: Suit | null): SeatIndex {
  const ledSuit = plays[0].card.suit;
  const trumpPlays = trumpSuit ? plays.filter((p) => p.card.suit === trumpSuit) : [];
  const pool = trumpPlays.length > 0 ? trumpPlays : plays.filter((p) => p.card.suit === ledSuit);
  let best = pool[0];
  for (const p of pool) {
    if (p.card.rank > best.card.rank) best = p;
  }
  return best.seat;
}

/**
 * Trump for a trick, derived from the trump before it plus any renege within
 * it. Convenience for callers that resolve a whole trick at once.
 */
export function trumpAfterTrick(trumpSuit: Suit | null, plays: TrickPlay[]): Suit | null {
  if (trumpSuit || plays.length === 0) return trumpSuit;
  const ledSuit = plays[0].card.suit;
  for (const play of plays) {
    const next = establishTrump(null, ledSuit, play.card);
    if (next) return next;
  }
  return null;
}

export function isTen(card: Card): boolean {
  return card.rank === 10;
}

export interface HandOutcome {
  winner: Team;
  tensCaptured: Record<Team, number>;
  tricksWon: Record<Team, number>;
  /**
   * haasbaga — all four Tens AND every trick. The perfect hand.
   * baga      — all four Tens, but not every trick.
   * forfeit   — opponent left the match.
   */
  special: "haasbaga" | "baga" | "forfeit" | null;
}

/**
 * Checks whether the hand should end after the trick just resolved.
 * `totalTricks` defaults to 13 (the standard 4-player, 13-card-each game);
 * pass 26 for the 1v1 FFA variant (26 cards each - see
 * dealMindiHandFFA1v1), which needs a proportionally higher "unassailable
 * majority" and "all tricks played" threshold.
 */
export function checkHandOutcome(
  tensCaptured: Record<Team, number>,
  tricksWon: Record<Team, number>,
  tricksPlayed: number,
  totalTricks: number = 13
): HandOutcome | null {
  // Every hand runs to the last card. There is deliberately no early exit:
  // a team three Tens up has all but won, but the fourth Ten and the trick
  // count are still live, and those decide Baga, Haas Baga, and the 2-2
  // tiebreak. Calling it early would erase results players care about.
  if (tricksPlayed < totalTricks) return null;

  const tensA = tensCaptured.A;
  const tensB = tensCaptured.B;

  // Tens decide it outright. Trick count is ONLY a tiebreak at 2-2, which is
  // why three Tens beats one Ten even when the other team swept every trick.
  let winner: Team;
  if (tensA !== tensB) {
    winner = tensA > tensB ? "A" : "B";
  } else {
    winner = tricksWon.A >= tricksWon.B ? "A" : "B";
  }

  const sweptTens = tensCaptured[winner] === 4;
  const sweptTricks = tricksWon[winner] === totalTricks;

  return {
    winner,
    tensCaptured,
    tricksWon,
    special: sweptTens ? (sweptTricks ? "haasbaga" : "baga") : null,
  };
}

/**
 * Simple-but-legal bot heuristic: follow suit when required, try to win
 * cheaply when it's worth winning (a Ten is in the trick, or the bot's team
 * isn't already winning), otherwise shed the lowest safe card.
 */
export function chooseBotPlay(
  hand: Card[],
  trickSoFar: TrickPlay[],
  trumpSuit: Suit | null,
  botSeat: SeatIndex
): Card {
  const ledSuit = trickSoFar.length > 0 ? trickSoFar[0].card.suit : null;
  const legal = getLegalPlays(hand, ledSuit);
  const sorted = [...legal].sort((a, b) => a.rank - b.rank);

  if (!ledSuit) {
    // Leading: prefer a low non-trump card to conserve trumps. Before trump
    // exists there is nothing to conserve, so this is just the lowest card.
    const nonTrump = sorted.filter((c) => c.suit !== trumpSuit);
    return nonTrump[0] || sorted[0];
  }

  // A renege by this bot would SET trump, so evaluate the trick with the
  // trump that would be in force rather than the one before the play.
  const effectiveTrump = trumpAfterTrick(trumpSuit, trickSoFar);

  const partnerSeat = partnerOf(botSeat);
  const partnerCurrentlyWinning =
    trickSoFar.length > 0 && resolveTrick(trickSoFar, effectiveTrump) === partnerSeat;
  const tenInTrick = trickSoFar.some((p) => isTen(p.card));

  if (partnerCurrentlyWinning && !tenInTrick) {
    // No need to spend a good card — play the lowest legal card.
    return sorted[0];
  }

  // Cheapest legal card that would win the trick right now. Each candidate
  // is scored against the trump IT would create if it is a renege — playing
  // off-suit while trump is unset both sets trump and wins the trick.
  let cheapestWinner: Card | null = null;
  for (const candidate of sorted) {
    const hypothetical = [...trickSoFar, { seat: botSeat, card: candidate }];
    const candidateTrump = establishTrump(effectiveTrump, ledSuit, candidate) ?? effectiveTrump;
    if (resolveTrick(hypothetical, candidateTrump) === botSeat) {
      cheapestWinner = candidate;
      break;
    }
  }

  if (cheapestWinner) return cheapestWinner;

  // Can't win (or don't need to) — shed the lowest card, preferring to keep trumps.
  const nonTrump = sorted.filter((c) => c.suit !== effectiveTrump);
  return nonTrump[0] || sorted[0];
}
