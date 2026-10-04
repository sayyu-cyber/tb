import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { MindiTable } from "../components/game/MindiTable";
import { GinRummyTable } from "../components/game/GinRummyTable";
import { MatchGateProvider } from "../contexts/MatchGateContext";
import { RotateGate } from "../components/layout/RotateGate";
import type { Card as MindiCard, Rank, TenCapture } from "../lib/mindiEngine";
import { findGinLayout, scoreGin, type Card as GinCard } from "../lib/ginRummyEngine";
import type { ArenaSeatData } from "../components/game/GameArena";

/**
 * The landscape tables fed their boards' own sample data, for
 * scripts/check-landscape-tables.cjs:
 *
 *   ?mindi   PMindi (phone-land-02-mindi): trick 9 under hearts, Mariyam's
 *            king of spades winning, Shifa's 4 played, Sayyu to follow
 *            spades from 6, 10, Q of hearts, 3 of clubs, 8 of diamonds.
 *            Tens: us the clubs and diamonds, them the hearts; tricks 5-3.
 *   ?gin     PGin (phone-land-03-gin): Sayyu holds A-2 of spades, 5-6-7-8 of
 *            hearts, three Queens and the King of diamonds, with Hussain's
 *            jack of clubs on the discard and 24 in the stock. Drawing
 *            brings the 3 of spades, and only the King goes out.
 *
 *   ?gin&won PGin's won state (phone-land-03c-gin-won): the King of diamonds
 *            thrown, Hussain's 4-7 of clubs, three 9s and J, 2, 10 turned
 *            over - 22 deadwood, so 47 points - and +10 onto 1,240.
 *            &lost turns it round: Hussain went out and Sayyu's hand is left.
 *   &gate    a match held upright: MRotate over the live table.
 *
 * Fixture data only - no app code knows any of these names.
 */
const q = new URLSearchParams(location.search);
const RANK: Record<string, number> = { A: 14, K: 13, Q: 12, J: 11 };
const mindi = (label: string): MindiCard => ({ rank: (RANK[label.slice(0, -1)] ?? Number(label.slice(0, -1))) as Rank, suit: label.slice(-1) as MindiCard["suit"] });
const gin = (label: string): GinCard => {
  const r = label.slice(0, -1);
  return { rank: (r === "A" ? 1 : r === "K" ? 13 : r === "Q" ? 12 : r === "J" ? 11 : Number(r)) as GinCard["rank"], suit: label.slice(-1) as GinCard["suit"] };
};
const seat = (uid: string, name: string, cardCount: number, active = false): ArenaSeatData => ({ uid, name, cardCount, active, cardBackId: "cb_arena" });

const TENS: TenCapture[] = [
  { suit: "C", team: "A", trick: 2 },
  { suit: "D", team: "A", trick: 5 },
  { suit: "H", team: "B", trick: 7 },
];

function MindiFixture() {
  const hand = ["6S", "10S", "QH", "3C", "8D"].map(mindi);
  return <MindiTable hand={hand} legal={hand.filter(card => card.suit === "S")} viewer={0}
    top={seat("mariyam", "Mariyam", 4)} left={seat("ibrahim", "Ibrahim", 5)} right={seat("shifa", "Shifa", 4)}
    name="Sayyu" active trump="H" trick={[{ seat: 2, card: mindi("KS") }, { seat: 3, card: mindi("4S") }]}
    tens={{ A: 2, B: 1 }} tricks={{ A: 5, B: 3 }} mode="Casual online" tableSkin="tt_default" tenCaptures={TENS}
    onPlay={card => { document.body.dataset.played = `${card.rank}${card.suit}`; }} />;
}

function GinFixture() {
  const [hand, setHand] = useState<GinCard[]>(["AS", "2S", "5H", "6H", "7H", "8H", "QS", "QD", "QC", "KD"].map(gin));
  const [phase, setPhase] = useState<"draw" | "discard">("draw");
  const [selected, setSelected] = useState<GinCard | null>(null);
  const [stock, setStock] = useState(25);
  const [deadline] = useState(() => Date.now() + 12_500);
  return <GinRummyTable hand={hand} selected={selected} opponent={seat("hussain", "Hussain", 10)} name="Sayyu"
    stock={stock} discard={gin("JC")} phase={phase} myTurn mode="Casual online" deadline={deadline}
    tableSkin="tt_default" cardBack="cb_arena"
    onDraw={() => { setHand(cards => [...cards, gin("3S")]); setStock(24); setPhase("discard"); }}
    onSelect={setSelected}
    onDiscard={() => { document.body.dataset.discarded = selected ? `${selected.rank}${selected.suit}` : ""; }} />;
}

function GinWonFixture() {
  const mine = ["AS", "2S", "3S", "5H", "6H", "7H", "8H", "QS", "QD", "QC"].map(gin);
  const theirs = ["4C", "5C", "6C", "7C", "9C", "9D", "9H", "JH", "2D", "10S"].map(gin);
  const lost = q.has("lost");
  const winnerHand = lost ? ["4C", "5C", "6C", "7C", "9C", "9D", "9H", "QS", "QD", "QC"].map(gin) : mine;
  const loserHand = lost ? ["AS", "2S", "3S", "5H", "6H", "7H", "8H", "JH", "2D", "10S"].map(gin) : theirs;
  const result = scoreGin(lost ? "opponent" : "player", findGinLayout(winnerHand)!, loserHand);
  return <GinRummyTable hand={lost ? loserHand : mine} selected={null} opponent={seat("hussain", "Hussain", 10)} name="Sayyu"
    stock={24} discard={gin("KD")} phase="draw" myTurn={false} mode="Casual online" deadline={null}
    tableSkin="tt_default" cardBack="cb_arena"
    outcome={{ youWon: !lost, result, loserHand, opponentHand: lost ? winnerHand : theirs, coins: lost ? 2 : 10, balance: lost ? 1242 : 1250,
      continueLabel: "Continue", onContinue: () => { document.body.dataset.continued = "1"; } }}
    onDraw={() => {}} onSelect={() => {}} onDiscard={() => {}} />;
}

function Fixture() {
  const table = q.has("won") ? <GinWonFixture /> : q.has("gin") ? <GinFixture /> : <MindiFixture />;
  // A live match sits in the match shell, so the rotate gate can blur it.
  return <div className={`arena-app app-shell ${q.has("gate") ? "app-shell-match" : ""}`.trim()}>
    <MatchGateProvider>
      {q.has("gate") && <RotateGate />}
      {table}
    </MatchGateProvider>
  </div>;
}

createRoot(document.getElementById("test-root")!).render(<Fixture />);
