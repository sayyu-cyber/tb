import * as mindi from "../lib/mindiEngine";
import * as gin from "../lib/ginRummyEngine";
import { cutForFirstPlay } from "../lib/openingCut";
import type { MindiOnlineState } from "../components/game/MindiOnlineClient";
import type { GinOnlineState } from "../components/game/GinRummyOnlineClient";

export type Game = "mindi" | "gin_rummy";
export type GameState = MindiOnlineState | GinOnlineState;
export type Move = { type: "play"; card: { suit: string; rank: number } }
  | { type: "discard"; card: { suit: string; rank: number } }
  | { type: "draw"; source: "stock" | "discard" } | { type: "forfeit" } | { type: "timeout" };
export interface AuthorityMatch {
  game: Game;
  players: string[];
  state: GameState;
  deadline: number;
  completed: boolean;
}

export function secureRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
}

export function createState(game: Game, players: string[], random = secureRandom): GameState {
  if (new Set(players).size !== players.length || ![2, 4].includes(players.length) || (game === "gin_rummy" && players.length !== 2)) {
    throw new Error("Invalid table configuration");
  }
  if (game === "mindi") {
    const { deal, draw } = players.length === 2 ? mindi.openMindiHandFFA1v1(1, random) : mindi.openMindiHand(3, random);
    return {
      handsByUid: Object.fromEntries(players.map((uid, seat) => [uid, deal.hands[seat as mindi.SeatIndex]])),
      numPlayers: players.length as 2 | 4, firstDraw: draw, trumpSuit: null, turnSeat: draw.winner,
      trick: [], tensCaptured: { A: 0, B: 0 }, tricksWon: { A: 0, B: 0 }, tricksPlayed: 0, outcome: null,
    };
  }
  const cut = cutForFirstPlay(players, random);
  const deal = gin.dealGinHand(random);
  return { hands: { [players[0]]: deal.playerHand, [players[1]]: deal.opponentHand }, stock: deal.stock,
    discard: deal.discard, turn: cut.winner, phase: "draw", firstCut: cut, result: null };
}

export function activePlayer(match: AuthorityMatch): string {
  return match.game === "mindi" ? match.players[(match.state as MindiOnlineState).turnSeat] : (match.state as GinOnlineState).turn;
}

/** Reuses the product's engines; the caller cannot supply a replacement state. */
export function applyMove(match: AuthorityMatch, actor: string, move: Move, now: number, random = secureRandom): AuthorityMatch {
  if (!match.players.includes(actor)) throw new Error("You are not a player at this table");
  if (match.completed) throw new Error("This match has finished");
  const next: AuthorityMatch = structuredClone(match);
  if (move.type === "timeout") {
    if (now < match.deadline) throw new Error("The turn has not expired");
    actor = activePlayer(match);
  } else if (move.type !== "forfeit") {
    if (actor !== activePlayer(match)) throw new Error("It is not your turn");
    if (now >= match.deadline) throw new Error("The turn has expired. Refresh the table.");
  }
  if (match.game === "mindi") {
    const s = next.state as MindiOnlineState;
    const seat = next.players.indexOf(actor) as mindi.SeatIndex;
    if (move.type === "forfeit") {
      s.outcome = { winner: mindi.teamOf(seat) === "A" ? "B" : "A", tensCaptured: s.tensCaptured,
        tricksWon: s.tricksWon, special: "forfeit" };
    } else {
      const hand = s.handsByUid[actor];
      const led = s.trick[0]?.card.suit ?? null;
      const legal = mindi.getLegalPlays(hand, led);
      const card = move.type === "timeout" ? legal[0] : move.type === "play"
        ? legal.find(c => c.suit === move.card.suit && c.rank === move.card.rank) : undefined;
      if (!card) throw new Error("That card cannot be played");
      s.handsByUid[actor] = hand.filter(c => mindi.cardId(c) !== mindi.cardId(card));
      s.trumpSuit = mindi.establishTrump(s.trumpSuit, led, card);
      s.trick.push({ seat, card });
      if (s.trick.length === next.players.length) {
        const winner = mindi.resolveTrick(s.trick, s.trumpSuit), team = mindi.teamOf(winner);
        s.tensCaptured[team] += s.trick.filter(p => mindi.isTen(p.card)).length;
        s.tricksWon[team]++;
        s.tricksPlayed++;
        s.lastTrick = { plays: s.trick, winner, number: s.tricksPlayed };
        s.tenCaptures = [...(s.tenCaptures ?? []), ...mindi.tensFromTrick(s.trick, winner, s.tricksPlayed)];
        s.trick = [];
        s.turnSeat = winner;
        s.outcome = mindi.checkHandOutcome(s.tensCaptured, s.tricksWon, s.tricksPlayed, next.players.length === 2 ? 26 : 13);
      } else s.turnSeat = ((seat + 1) % next.players.length) as mindi.SeatIndex;
    }
    next.completed = !!s.outcome;
    next.deadline = now + 30000;
  } else {
    const s = next.state as GinOnlineState;
    const opponent = next.players.find(uid => uid !== actor)!;
    if (move.type === "forfeit") {
      s.result = { winnerUid: opponent, layout: [], loserDeadwood: gin.bestMeldArrangement(s.hands[actor]).deadwoodValue,
        score: 0, forfeitedBy: actor };
    } else {
      if (move.type === "draw" || (move.type === "timeout" && s.phase === "draw")) {
        if (s.phase !== "draw") throw new Error("Discard before drawing again");
        if (move.type === "draw" && move.source === "discard") {
          if (!s.discard.length) throw new Error("The discard pile is empty");
          s.hands[actor].push(s.discard.pop()!);
        } else {
          if (!s.stock.length) {
            const refilled = gin.replenishStock(s.stock, s.discard, random);
            s.stock = refilled.stock; s.discard = refilled.discard; s.reshuffles = (s.reshuffles ?? 0) + 1;
          }
          if (!s.stock.length) throw new Error("No card is available to draw");
          s.hands[actor].push(s.stock.pop()!);
        }
        s.phase = "discard";
      }
      if (move.type === "discard" || move.type === "timeout") {
        if (s.phase !== "discard") throw new Error("Draw before discarding");
        const hand = s.hands[actor];
        const card = move.type === "timeout" ? hand[Math.floor(random() * hand.length)]
          : hand.find(c => c.suit === move.card.suit && c.rank === move.card.rank);
        if (!card) throw new Error("That card is not in your hand");
        s.hands[actor] = hand.filter(c => gin.cardId(c) !== gin.cardId(card));
        s.discard.push(card);
        const layout = gin.findGinLayout(s.hands[actor]);
        if (layout) {
          const score = gin.scoreGin("player", layout, s.hands[opponent]);
          s.result = { winnerUid: actor, layout, loserDeadwood: score.loserDeadwood, score: score.score };
        } else { s.turn = opponent; s.phase = "draw"; }
        next.deadline = now + gin.TURN_SECONDS * 1000;
      } else if (move.type !== "draw") throw new Error("Invalid Gin move");
    }
    next.completed = !!s.result;
    s.turnDeadline = next.completed ? null : next.deadline;
  }
  return next;
}

export function projectMatch(match: AuthorityMatch) {
  const hands = match.game === "mindi" ? (match.state as MindiOnlineState).handsByUid : (match.state as GinOnlineState).hands;
  const handCounts = Object.fromEntries(match.players.map(uid => [uid, hands[uid].length]));
  const publicState = match.game === "mindi"
    ? { ...match.state as MindiOnlineState, handsByUid: {}, handCounts, turnDeadline: match.completed ? null : match.deadline }
    : { ...match.state as GinOnlineState, hands: match.completed ? hands : {}, stock: [],
        stockCount: (match.state as GinOnlineState).stock.length, handCounts, turnDeadline: match.completed ? null : match.deadline };
  return { publicState, privateStates: Object.fromEntries(match.players.map(uid => [uid, { hand: hands[uid] }])) };
}

export function winners(match: AuthorityMatch): string[] {
  if (!match.completed) return [];
  if (match.game === "gin_rummy") return [(match.state as GinOnlineState).result!.winnerUid];
  const team = (match.state as MindiOnlineState).outcome!.winner;
  return match.players.filter((_, seat) => mindi.teamOf(seat as mindi.SeatIndex) === team);
}
