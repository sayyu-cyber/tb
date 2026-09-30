import React, { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { MindiTable } from "../components/game/MindiTable";
import { GinRummyTable } from "../components/game/GinRummyTable";
import { ginOpening, mindiOpening, useOpeningDeal } from "../components/game/MindiDealIntro";
import { frozenMoment, openingTimeline } from "../components/game/mindiCutTimeline";
import type { Card as MindiCard, Rank } from "../lib/mindiEngine";
import type { Card as GinCard } from "../lib/ginRummyEngine";
import type { ArenaSeatData } from "../components/game/GameArena";

/**
 * The opening deal on the real tables, fed the Cut boards' own sample data
 * (design/arena/boards/Cut.dc.html and CutGin.dc.html):
 *
 *   Mindi   Shifa (E) deals. Sayyu 9 of clubs, Ibrahim jack of diamonds,
 *           Mariyam ace of hearts, Shifa 6 of spades - Mariyam leads.
 *   Gin     Hussain (N) deals. Sayyu's king of clubs beats his 8 of
 *           diamonds, so Sayyu starts; the 6 of clubs turns up.
 *   duel    The Mindi 1v1 room variant on Gin's two-seat layout: the same
 *           two players and cut, 26 cards each, no upcard.
 *
 *   ?game=mindi|gin|duel   ?phase=Cut|Reveal|First player|Deal|Ready (the
 *   board's `phase` prop: the clock held still at that moment; omit to
 *   play through)   ?back=<card back id>   ?lead=me (Sayyu wins instead)
 *
 * Fixture data only - no app code knows any of these names.
 */
const q = new URLSearchParams(location.search);
const game = (q.get("game") ?? "mindi") as "mindi" | "gin" | "duel";
const phase = q.get("phase") as "Cut" | "Reveal" | "First player" | "Deal" | "Ready" | null;
const back = q.get("back") ?? "cb_arena";

const RANK: Record<string, number> = { A: 14, K: 13, Q: 12, J: 11 };
const mindi = (label: string): MindiCard => {
  const rank = label.slice(0, -1), suit = label.slice(-1) as MindiCard["suit"];
  return { rank: (RANK[rank] ?? Number(rank)) as Rank, suit };
};
const gin = (label: string): GinCard => {
  const rank = label.slice(0, -1), suit = label.slice(-1) as GinCard["suit"];
  const n = rank === "A" ? 1 : rank === "K" ? 13 : rank === "Q" ? 12 : rank === "J" ? 11 : Number(rank);
  return { rank: n as GinCard["rank"], suit };
};

const MINDI_HAND = ["AS", "10S", "7S", "3S", "KH", "9H", "4H", "QC", "8C", "5C", "JD", "10D", "2D"].map(mindi);
const DUEL_HAND = ["AS", "KS", "10S", "8S", "6S", "3S", "QH", "JH", "9H", "7H", "5H", "2H", "AC", "10C", "9C", "6C", "4C", "3C", "KD", "JD", "10D", "8D", "7D", "5D", "4D", "2D"].map(mindi);
const GIN_HAND = ["AS", "4S", "9S", "7H", "KH", "5C", "QC", "3D", "8D", "JD"].map(gin);

const seat = (uid: string, name: string, cardCount: number, active: boolean): ArenaSeatData => ({ uid, name, cardCount, active, cardBackId: back });

function MindiFixture({ duel }: { duel: boolean }) {
  const lead = q.get("lead") === "me";
  const [setup] = useState(() => mindiOpening(duel
    ? {
        draw: { cards: { 0: { rank: 13, suit: "C" }, 1: { rank: 8, suit: "D" } }, winner: 0 },
        viewer: 0, dealer: 1, seats: [0, 1], names: { 0: "Sayyu", 1: "Hussain" }, roles: { 0: "You", 1: "Opponent" },
        handSize: 26, cardBack: back,
      }
    : {
        draw: { cards: { 0: { rank: lead ? 14 : 9, suit: lead ? "S" : "C" }, 1: { rank: 11, suit: "D" }, 2: { rank: lead ? 13 : 14, suit: "H" }, 3: { rank: 6, suit: "S" } }, winner: lead ? 0 : 2 },
        viewer: 0, dealer: 3, seats: [0, 1, 2, 3],
        names: { 0: "Sayyu", 1: "Ibrahim", 2: "Mariyam", 3: "Shifa" },
        roles: { 0: "You", 1: "Opponent", 2: "Partner", 3: "Opponent" },
        handSize: 13, cardBack: back,
      }));
  const T = openingTimeline({ seats: duel ? 2 : 4, handSize: duel ? 26 : 13, gap: 40, upcard: false });
  const [ready, setReady] = useState(0);
  const opening = useOpeningDeal(setup, { freezeAt: phase ? frozenMoment(phase, T) : null, onReady: () => setReady(n => n + 1) });
  const leader = duel || lead ? "S" : "N";
  return <>
    <output id="ready">{ready}</output>
    <MindiTable hand={duel ? DUEL_HAND : MINDI_HAND} legal={leader === "S" ? duel ? DUEL_HAND : MINDI_HAND : []} viewer={0}
      top={duel ? seat("hussain", "Hussain", 26, false) : seat("mariyam", "Mariyam", 13, leader === "N")}
      left={duel ? null : seat("ibrahim", "Ibrahim", 13, false)} right={duel ? null : seat("shifa", "Shifa", 13, false)}
      name="Sayyu" active={leader === "S" && (!opening || opening.step === 4)} trump={null} trick={[]}
      tens={{ A: 0, B: 0 }} tricks={{ A: 0, B: 0 }} mode="Casual online" tableSkin="tt_default"
      tenCaptures={[]} opening={opening} onPlay={() => {}} />
  </>;
}

function GinFixture() {
  const [setup] = useState(() => ginOpening({
    cut: { cards: { me: { rank: 13, suit: "C" }, hussain: { rank: 8, suit: "D" } }, winner: "me" },
    you: "me", opponent: "hussain", names: { me: "Sayyu", hussain: "Hussain" }, roles: { me: "You", hussain: "Opponent" },
    upcard: { rank: "6", suit: "C" }, cardBack: back,
  }));
  const T = openingTimeline({ seats: 2, handSize: 10, gap: 62, upcard: true });
  const [ready, setReady] = useState(0);
  const opening = useOpeningDeal(setup, { freezeAt: phase ? frozenMoment(phase, T) : null, onReady: () => setReady(n => n + 1) });
  return <>
    <output id="ready">{ready}</output>
    <GinRummyTable hand={GIN_HAND} selected={null} opponent={seat("hussain", "Hussain", 10, false)} name="Sayyu"
      stock={31} discard={gin("6C")} phase="draw" myTurn={!opening || opening.step === 4} mode="Casual online"
      deadline={null} tableSkin="tt_default" cardBack={back} opening={opening}
      onDraw={() => {}} onSelect={() => {}} onDiscard={() => {}} />
  </>;
}

createRoot(document.getElementById("test-root")!).render(
  <StrictMode>
    <div className="arena-app arena-phone">
      {game === "gin" ? <GinFixture /> : <MindiFixture duel={game === "duel"} />}
    </div>
  </StrictMode>
);
