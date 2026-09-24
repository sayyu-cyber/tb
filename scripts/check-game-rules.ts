// Rules tests for both engines. Run with `npm run test:rules`.
//
// These exist because the Mindi and Gin rules in this app are the OWNER'S
// rules, not the published ones, so a reader who "knows" the standard game is
// exactly the person likely to break them. Every assertion below is a rule
// the owner stated; if one fails, the engine changed, not the test.

import {
  Card, Suit, Rank, cardId,
  findGinLayout, isWinningGin, replenishStock, winningDiscard, botChooseDiscard,
  dealGinHand, bestMeldArrangement, scoreGin, botChooseDraw,
} from "../lib/ginRummyEngine";
import {
  establishTrump, trumpAfterTrick, resolveTrick, getLegalPlays, checkHandOutcome,
  drawForFirstPlayer, openMindiHand, openMindiHandFFA1v1,
  type TrickPlay, type Card as MindiCard, type Suit as MindiSuit,
} from "../lib/mindiEngine";
import { cutForFirstPlay } from "../lib/openingCut";

let failures = 0;
function eq(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) { console.error(`  FAIL  ${label}\n        got ${a}\n        want ${b}`); failures++; }
}
function ok(label: string, condition: boolean) { eq(label, condition, true); }

const g = (suit: Suit, rank: number): Card => ({ suit, rank: rank as Rank });
const m = (rank: number, suit: MindiSuit): MindiCard => ({ rank: rank as MindiCard["rank"], suit });

// ---------------------------------------------------------------- Gin Rummy

console.log("Gin Rummy — winning is 4+3+3 and nothing else");

const win334 = [g("S",7),g("H",7),g("D",7),g("C",7), g("S",2),g("S",3),g("S",4), g("H",13),g("D",13),g("C",13)];
ok("4+3+3 wins", isWinningGin(win334));

const layout = findGinLayout(win334)!;
eq("layout is sizes 4,3,3", layout.map(x => x.length).sort((a,b) => b-a), [4,3,3]);
eq("layout covers all ten distinct cards", new Set(layout.flat().map(cardId)).size, 10);

// The one shape that melds everything and still loses. A five-card run cannot
// be cut into two melds (that needs six cards) and a five-card set cannot
// exist, so 5+5 can never be re-cut into 4+3+3.
const fiveFive = [g("S",2),g("S",3),g("S",4),g("S",5),g("S",6), g("H",8),g("H",9),g("H",10),g("H",11),g("H",12)];
eq("5+5 has zero deadwood", bestMeldArrangement(fiveFive).deadwoodValue, 0);
ok("5+5 does NOT win despite zero deadwood", !isWinningGin(fiveFive));

// Long runs DO win, because they re-cut into 4+3+3. This looks wrong and is
// not - see the header of lib/ginRummyEngine.ts.
ok("6+4 wins (re-cut)", isWinningGin([g("S",2),g("S",3),g("S",4),g("S",5),g("S",6),g("S",7), g("H",9),g("H",10),g("H",11),g("H",12)]));
ok("7+3 wins (re-cut)", isWinningGin([g("S",2),g("S",3),g("S",4),g("S",5),g("S",6),g("S",7),g("S",8), g("H",11),g("D",11),g("C",11)]));
ok("ten-card run wins (re-cut)", isWinningGin([1,2,3,4,5,6,7,8,9,10].map(r => g("S", r))));

ok("3+3+3 plus a loose card does not win", !isWinningGin([g("S",7),g("H",7),g("D",7), g("S",2),g("S",3),g("S",4), g("H",13),g("D",13),g("C",13), g("C",9)]));
ok("eleven cards never win", !isWinningGin([...win334, g("C",9)]));
ok("nine cards never win", !isWinningGin(win334.slice(0, 9)));

console.log("Gin Rummy — discarding, the clock, and the stock");

const eleven = [...win334, g("C",9)];
eq("winningDiscard finds the card to throw", cardId(winningDiscard(eleven)!), "C9");
eq("a bot always takes an available win", cardId(botChooseDiscard(eleven)), "C9");
eq("winningDiscard needs eleven cards", winningDiscard(win334), null);
eq("a bot draws the face-up card when it wins the hand", botChooseDraw(win334.slice(0,9).concat(g("C",9)), g("C",13)), "discard");

const pile = [g("S",1),g("S",2),g("S",3),g("H",5)];
const refilled = replenishStock([], pile);
eq("the face-up card stays in play", refilled.discard.map(cardId), ["H5"]);
eq("everything under it is recycled", refilled.stock.map(cardId).sort(), ["S1","S2","S3"]);
eq("no card is lost in the reshuffle", refilled.stock.length + refilled.discard.length, pile.length);
eq("a stock with cards is left alone", replenishStock([g("D",4)], pile).stock.map(cardId), ["D4"]);
eq("nothing to recycle is left alone", replenishStock([], [g("H",5)]).discard.length, 1);

const scored = scoreGin("player", layout, [g("S",13),g("H",12),g("D",11)]);
eq("score is 25 plus the loser's deadwood", scored.score, 55);
eq("loser deadwood is reported", scored.loserDeadwood, 30);

for (let i = 0; i < 200; i++) {
  const deal = dealGinHand();
  const all = [...deal.playerHand, ...deal.opponentHand, ...deal.stock, ...deal.discard];
  if (all.length !== 52 || new Set(all.map(cardId)).size !== 52) { eq("deal uses a full 52-card deck", all.length, 52); break; }
  if (deal.playerHand.length !== 10 || deal.opponentHand.length !== 10) { eq("deal gives ten cards each", deal.playerHand.length, 10); break; }
}

// With no knocking, a hand ends only when somebody melds 4+3+3. Most hands
// finish quickly, but a small share CANNOT finish at all: if the cards each
// player still needs are sitting in the other's hand, no amount of
// reshuffling will ever produce a win. By the owner's decision those hands
// simply continue - there is no cap and no tie-break - so this is measured
// and reported rather than asserted. A big jump in the stalled figure means
// the bots or the win check regressed.
console.log("Gin Rummy — how hands end (no knocking, unlimited reshuffles)");
const lengths: number[] = [];
let stalled = 0;
for (let game = 0; game < 120; game++) {
  const deal = dealGinHand();
  const hands = [deal.playerHand, deal.opponentHand];
  let stock = deal.stock, discard = deal.discard, turn = 0, finished = false;
  for (let t = 1; t <= 1000; t++) {
    ({ stock, discard } = replenishStock(stock, discard));
    if (stock.length === 0) break;
    const top = discard[discard.length - 1] ?? null;
    let drawn: Card;
    if (top && botChooseDraw(hands[turn], top) === "discard") { drawn = top; discard = discard.slice(0, -1); }
    else { drawn = stock[0]; stock = stock.slice(1); }
    const withDraw = [...hands[turn], drawn];
    const thrown = botChooseDiscard(withDraw);
    hands[turn] = withDraw.filter(card => cardId(card) !== cardId(thrown));
    discard = [...discard, thrown];
    if (hands[0].length + hands[1].length + stock.length + discard.length !== 52) { eq("cards are conserved during play", false, true); t = 1000; break; }
    if (hands[turn].length !== 10) { eq("a hand is ten cards between turns", hands[turn].length, 10); t = 1000; break; }
    if (isWinningGin(hands[turn])) { lengths.push(t); finished = true; break; }
    turn = 1 - turn;
  }
  if (!finished) stalled++;
}
lengths.sort((a, b) => a - b);
console.log(`  ${lengths.length}/120 hands won — median ${lengths[Math.floor(lengths.length / 2)]} turns, longest ${lengths[lengths.length - 1]}`);
console.log(`  ${stalled}/120 could not finish (expected: roughly 1 in 300)`);
ok("the overwhelming majority of hands still finish", lengths.length >= 110);

// --------------------------------------------------------------------- Mindi

console.log("Mindi — trump is established by a renege, never dealt");

eq("leading cannot set trump", establishTrump(null, null, m(14,"S")), null);
eq("following suit cannot set trump", establishTrump(null, "S", m(2,"S")), null);
eq("playing off-suit sets trump", establishTrump(null, "S", m(2,"D")), "D");
eq("trump never changes once set", establishTrump("D", "S", m(2,"C")), "D");

const lateTrump: TrickPlay[] = [{seat:0,card:m(14,"S")},{seat:1,card:m(13,"S")},{seat:2,card:m(12,"S")},{seat:3,card:m(2,"H")}];
eq("a trump set by the last card counts in that trick", trumpAfterTrick(null, lateTrump), "H");
eq("and wins it", resolveTrick(lateTrump, trumpAfterTrick(null, lateTrump)), 3);

const overTrump: TrickPlay[] = [{seat:0,card:m(14,"S")},{seat:1,card:m(3,"H")},{seat:2,card:m(9,"H")},{seat:3,card:m(2,"S")}];
eq("a higher trump beats a lower one", resolveTrick(overTrump, trumpAfterTrick(null, overTrump)), 2);
eq("with no trump the highest led suit wins, ace high",
  resolveTrick([{seat:0,card:m(10,"S")},{seat:1,card:m(14,"S")},{seat:2,card:m(13,"S")},{seat:3,card:m(2,"S")}], null), 1);

eq("you must follow suit when you hold it", getLegalPlays([m(2,"S"),m(5,"H")], "S").length, 1);
eq("being void frees your whole hand", getLegalPlays([m(4,"D"),m(5,"H")], "S").length, 2);

console.log("Mindi — the hand runs to all 13 tricks");

eq("no early exit, even holding all four Tens", checkHandOutcome({A:4,B:0},{A:5,B:3},8), null);
eq("all four Tens is a Baga", checkHandOutcome({A:4,B:0},{A:9,B:4},13)!.special, "baga");
eq("all four Tens and every trick is a Haas Baga", checkHandOutcome({A:4,B:0},{A:13,B:0},13)!.special, "haasbaga");
eq("three Tens beats one, whatever the tricks", checkHandOutcome({A:3,B:1},{A:2,B:11},13)!.winner, "A");
eq("level on Tens, the most tricks wins", checkHandOutcome({A:2,B:2},{A:6,B:7},13)!.winner, "B");

console.log("Mindi — the draw for first play");

for (let i = 0; i < 1000; i++) {
  const draw = drawForFirstPlayer();
  const best = draw.cards[draw.winner].rank;
  const tied = ([0,1,2,3] as const).some(seat => seat !== draw.winner && draw.cards[seat].rank >= best);
  if (tied) { eq("the draw never ties", false, true); break; }
}
for (let i = 0; i < 200; i++) {
  const four = openMindiHand(3);
  if (four.deal.leader !== four.draw.winner) { eq("the draw winner leads", false, true); break; }
  if (([0,1,2,3] as const).some(s => four.deal.hands[s].length !== 13)) { eq("thirteen cards each", false, true); break; }
  if (four.deal.trumpSuit !== null) { eq("no trump is dealt", four.deal.trumpSuit, null); break; }
  const duel = openMindiHandFFA1v1(1);
  if (duel.deal.leader !== duel.draw.winner) { eq("the duel draw winner leads", false, true); break; }
  if (Object.keys(duel.draw.cards).length !== 2) { eq("a duel draws two cards", Object.keys(duel.draw.cards).length, 2); break; }
  if (duel.deal.hands[0].length !== 26 || duel.deal.hands[1].length !== 26) { eq("twenty-six cards each in a duel", false, true); break; }
}

// ---------------------------------------------------------- the opening cut

console.log("The opening cut — shared by both games");

// Two players (Gin Rummy, and the Mindi 1v1 room variant) and four (Mindi).
for (const keys of [["a", "b"], ["a", "b", "c", "d"]] as string[][]) {
  for (let i = 0; i < 500; i++) {
    const cut = cutForFirstPlay(keys);
    const best = cut.cards[cut.winner].rank;
    if (keys.some(k => k !== cut.winner && cut.cards[k].rank >= best)) { eq(`${keys.length}-way cut never ties`, false, true); break; }
    if (new Set(keys.map(k => cardId(cut.cards[k] as never))).size !== keys.length) { eq(`${keys.length}-way cut deals distinct cards`, false, true); break; }
    if (keys.some(k => cut.cards[k].rank < 2 || cut.cards[k].rank > 14)) { eq("cut ranks are 2..14, ace high", false, true); break; }
  }
}
// Ace high is the point: in Gin Rummy an ace is otherwise the LOWEST card, so
// this is the rule most likely to be "corrected" by mistake.
{
  const pair: ("a" | "b")[] = ["a", "b"];
  let sawAceWin = false;
  for (let i = 0; i < 4000 && !sawAceWin; i++) {
    const cut = cutForFirstPlay(pair);
    if (cut.cards[cut.winner].rank === 14) sawAceWin = true;
    // An ace must never lose the cut.
    for (const k of pair) if (cut.cards[k].rank === 14 && cut.winner !== k) { eq("an ace never loses the cut", false, true); i = 4000; break; }
  }
  ok("an ace does win the cut", sawAceWin);
}

// -------------------------------------------------------------------- result

console.log(failures === 0 ? "\nAll rules hold." : `\n${failures} rule check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
