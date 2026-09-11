"use client";
import { PlayingCard, type Suit } from "./PlayingCard";

/** Shares the match renderer so equipped card backs stay consistent. */
export function GameDeckArt({ game = "mindi", cardBackId }: { game?: string; cardBackId?: string }) {
  const cards: { rank: string; suit: Suit; back?: boolean }[] = game === "mindi"
    ? [{ rank: "A", suit: "spades", back: true }, { rank: "10", suit: "hearts" }, { rank: "10", suit: "spades" }]
    : [{ rank: "7", suit: "diamonds", back: true }, { rank: "8", suit: "diamonds" }, { rank: "9", suit: "diamonds" }];
  return (
    <div className="game-deck-art" aria-hidden="true">
      {cards.map((card, index) => (
        <div className="game-deck-card" key={index} style={{ "--card-angle": `${(index - 1) * 17}deg`, "--card-x": `${(index - 1) * 44}px`, "--card-y": `${index === 1 ? -12 : 0}px` } as React.CSSProperties}>
          <PlayingCard rank={card.rank} suit={card.suit} faceDown={card.back} cardBackId={cardBackId} size="lg" />
        </div>
      ))}
    </div>
  );
}
