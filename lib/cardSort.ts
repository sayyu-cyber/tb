// lib/cardSort.ts
//
// Shared hand ordering for both rules engines (mindiEngine.ts and
// ginRummyEngine.ts each define their own identical-shaped Suit/Card types,
// so this is written generically rather than importing one engine's types
// into the other). A dealt or drawn hand always displays in a fixed suit
// order - Spades, Hearts, Clubs, Diamonds - then lowest to highest rank
// within each suit, so a player's hand doesn't visually reshuffle itself
// after every draw/discard/play.

const SUIT_ORDER: Record<string, number> = { S: 0, H: 1, C: 2, D: 3 };

export function sortHand<T extends { suit: string; rank: number }>(cards: T[]): T[] {
  return [...cards].sort((a, b) => {
    const suitDiff = (SUIT_ORDER[a.suit] ?? 99) - (SUIT_ORDER[b.suit] ?? 99);
    if (suitDiff !== 0) return suitDiff;
    return a.rank - b.rank;
  });
}
