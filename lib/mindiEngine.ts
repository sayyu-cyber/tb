// lib/mindiEngine.ts
//
// Rules engine for Mindi (the Maldivian "Dihaeh" trick-taking game).
// Documented source: pagat.com/national/maldives.html (research by Alex de
// Voogt, The Playing-Card Vol. 37 No. 3, 2009) — "Dihaeh": 4 players, fixed
// partnerships, 13 cards each from a standard 52-card pack, last card dealt
// is trump and belongs to the dealer, tricks played following suit (trump if
// unable), aim is to capture three Tens ("Mindi" cards) or seven tricks;
// capturing all four Tens is "baga", capturing all thirteen tricks is
// "hukunbunye". If neither team reaches 3 tens by the time all tricks are
// played, whichever team holds more tricks (majority is always >= 7 of 13)
// is the winner.
//
// This module is pure game logic — no React, no Firebase — so it can be
// reused by AI matches, Pass & Play, and (later) real online matchmaking.

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

export interface TrickPlay {
  seat: SeatIndex;
  card: Card;
}

export interface MindiDeal {
  hands: Record<SeatIndex, Card[]>;
  trumpSuit: Suit;
  trumpCard: Card;
  dealer: SeatIndex;
  leader: SeatIndex;
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
 * Deals a fresh hand. Dealing proceeds one card at a time, starting with the
 * seat to the dealer's left and going clockwise, for 13 rounds — so the
 * dealer receives the final (52nd) card of the deal, which sets trump.
 */
export function dealMindiHand(dealer: SeatIndex): MindiDeal {
  const deck = createShuffledDeck();
  const hands: Record<SeatIndex, Card[]> = { 0: [], 1: [], 2: [], 3: [] };

  let seat = nextSeat(dealer);
  for (let i = 0; i < 52; i++) {
    hands[seat].push(deck[i]);
    seat = nextSeat(seat);
  }

  const dealerHand = hands[dealer];
  const trumpCard = dealerHand[dealerHand.length - 1];

  return {
    hands,
    trumpSuit: trumpCard.suit,
    trumpCard,
    dealer,
    leader: nextSeat(dealer),
  };
}

/** Cards a seat may legally play, given the suit led (null if this seat is leading). */
export function getLegalPlays(hand: Card[], ledSuit: Suit | null): Card[] {
  if (!ledSuit) return hand;
  const followers = hand.filter((c) => c.suit === ledSuit);
  return followers.length > 0 ? followers : hand;
}

/** Determines which seat wins a completed trick. */
export function resolveTrick(plays: TrickPlay[], trumpSuit: Suit): SeatIndex {
  const ledSuit = plays[0].card.suit;
  const trumpPlays = plays.filter((p) => p.card.suit === trumpSuit);
  const pool = trumpPlays.length > 0 ? trumpPlays : plays.filter((p) => p.card.suit === ledSuit);
  let best = pool[0];
  for (const p of pool) {
    if (p.card.rank > best.card.rank) best = p;
  }
  return best.seat;
}

export function isTen(card: Card): boolean {
  return card.rank === 10;
}

export interface HandOutcome {
  winner: Team;
  tensCaptured: Record<Team, number>;
  tricksWon: Record<Team, number>;
  special: "baga" | "hukunbunye" | "forfeit" | null;
}

/** Checks whether the hand should end after the trick just resolved. */
export function checkHandOutcome(
  tensCaptured: Record<Team, number>,
  tricksWon: Record<Team, number>,
  tricksPlayed: number
): HandOutcome | null {
  for (const team of ["A", "B"] as Team[]) {
    if (tensCaptured[team] >= 3) {
      return {
        winner: team,
        tensCaptured,
        tricksWon,
        special: tensCaptured[team] === 4 ? "baga" : null,
      };
    }
  }
  // No team has reached 3 tens yet. Once a team has an unassailable trick
  // majority (7 of 13), or all 13 tricks are played, decide by trick count.
  for (const team of ["A", "B"] as Team[]) {
    if (tricksWon[team] >= 7 || tricksPlayed >= 13) {
      const other: Team = team === "A" ? "B" : "A";
      const winner = tricksWon[team] >= tricksWon[other] ? team : other;
      return {
        winner,
        tensCaptured,
        tricksWon,
        special: tricksWon[winner] === 13 ? "hukunbunye" : null,
      };
    }
  }
  return null;
}

/**
 * Simple-but-legal bot heuristic: follow suit when required, try to win
 * cheaply when it's worth winning (a Ten is in the trick, or the bot's team
 * isn't already winning), otherwise shed the lowest safe card.
 */
export function chooseBotPlay(
  hand: Card[],
  trickSoFar: TrickPlay[],
  trumpSuit: Suit,
  botSeat: SeatIndex
): Card {
  const ledSuit = trickSoFar.length > 0 ? trickSoFar[0].card.suit : null;
  const legal = getLegalPlays(hand, ledSuit);
  const sorted = [...legal].sort((a, b) => a.rank - b.rank);

  if (!ledSuit) {
    // Leading: prefer a low non-trump card to conserve trumps.
    const nonTrump = sorted.filter((c) => c.suit !== trumpSuit);
    return nonTrump[0] || sorted[0];
  }

  const partnerSeat = partnerOf(botSeat);
  const partnerCurrentlyWinning =
    trickSoFar.length > 0 && resolveTrick(trickSoFar, trumpSuit) === partnerSeat;
  const tenInTrick = trickSoFar.some((p) => isTen(p.card));

  if (partnerCurrentlyWinning && !tenInTrick) {
    // No need to spend a good card — play the lowest legal card.
    return sorted[0];
  }

  // Find the cheapest legal card that would win the trick right now.
  let cheapestWinner: Card | null = null;
  for (const candidate of sorted) {
    const hypothetical = [...trickSoFar, { seat: botSeat, card: candidate }];
    if (resolveTrick(hypothetical, trumpSuit) === botSeat) {
      cheapestWinner = candidate;
      break;
    }
  }

  if (cheapestWinner) return cheapestWinner;

  // Can't win (or don't need to) — shed the lowest card, preferring to keep trumps.
  const nonTrump = sorted.filter((c) => c.suit !== trumpSuit);
  return nonTrump[0] || sorted[0];
}
