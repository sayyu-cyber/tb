// lib/openingCut.ts
//
// The opening cut: one card each, highest card plays first.
//
// Both games open the same way, so the ritual lives here rather than inside
// either rules engine - lib/mindiEngine.ts and the Gin Rummy clients both use
// this, and neither engine has to import the other.
//
// ACE IS HIGH IN THE CUT, in both games. That is deliberate and it is worth
// knowing for Gin Rummy, where an ace is otherwise the LOWEST card (a run may
// start A-2-3 but never turns the corner at the King). The cut is a separate
// ritual from the game's own card ranking, and the owner asked for Gin to cut
// exactly as Mindi does.
//
// Ties are broken by cutting again rather than by seat order, so the outcome
// never depends on where somebody happens to be sitting.

/** Suit letters, shared by both engines' card shapes. */
export type CutSuit = "S" | "H" | "D" | "C";

/** 2..14, ace high - the cut's own ranking, not a game's. */
export type CutRank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface CutCard {
  suit: CutSuit;
  rank: CutRank;
}

/**
 * The settled result of a cut, keyed by whatever identifies a player in the
 * caller's world: a seat number in Mindi, a seat or a uid in Gin Rummy.
 */
export interface OpeningCut<Key extends string | number> {
  cards: Record<Key, CutCard>;
  winner: Key;
}

const CUT_SUITS: CutSuit[] = ["S", "H", "D", "C"];

function shuffledCutDeck(): CutCard[] {
  const deck: CutCard[] = [];
  for (const suit of CUT_SUITS) {
    for (let rank = 2; rank <= 14; rank++) deck.push({ suit, rank: rank as CutRank });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Cuts one card for each key and returns the whole cut, so the UI can show
 * every card before naming the winner.
 *
 * Works for any number of players - two for Gin Rummy and for the Mindi 1v1
 * room variant, four for the standard Mindi game.
 */
export function cutForFirstPlay<Key extends string | number>(keys: Key[]): OpeningCut<Key> {
  const deal = () => {
    const deck = shuffledCutDeck();
    const cards = {} as Record<Key, CutCard>;
    keys.forEach((key, i) => { cards[key] = deck[i]; });
    return cards;
  };

  for (let attempt = 0; attempt < 20; attempt++) {
    const cards = deal();
    let best = keys[0];
    let tied = false;
    for (const key of keys) {
      if (cards[key].rank > cards[best].rank) { best = key; tied = false; }
      else if (key !== best && cards[key].rank === cards[best].rank) tied = true;
    }
    if (!tied) return { cards, winner: best };
  }
  // Astronomically unlikely to land here; fall back rather than loop forever.
  return { cards: deal(), winner: keys[0] };
}
