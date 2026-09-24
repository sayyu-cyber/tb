// Deterministic deals only; melds, scoring, and turns use the real engine.
export * from "../lib/ginRummyEngine";
import { Card, createShuffledDeck, cardId, GinDeal } from "../lib/ginRummyEngine";

export function dealGinHand(): GinDeal {
  const playerHand: Card[] = [
    {suit:"S",rank:1},{suit:"S",rank:2},{suit:"S",rank:3},
    {suit:"H",rank:4},{suit:"H",rank:5},{suit:"H",rank:6},
    {suit:"C",rank:7},{suit:"C",rank:8},{suit:"C",rank:9},{suit:"C",rank:10},
  ];
  const drawn: Card = {suit:"D",rank:13};
  const used = new Set([...playerHand,drawn].map(cardId));
  const rest = createShuffledDeck().filter(card=>!used.has(cardId(card)));
  return {playerHand,opponentHand:rest.slice(0,10),discard:[rest[10]],stock:location.search.includes("empty")?rest.slice(11,13):[...rest.slice(11),drawn]};
}
