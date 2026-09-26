import React from "react";
import { createRoot } from "react-dom/client";
import { MindiResultScreen } from "../components/game/MindiResultScreen";
import type { HandOutcome, TenCapture } from "../lib/mindiEngine";

/**
 * The Result board's own hand, so the screenshot and
 * design/arena/screens/result-hand-won.jpg line up:
 *
 *   Weekend League ranked duo, Tens 3-1, tricks 8-5, +10 trophies
 *   (58 -> 68, 7 to Platinum) and +10 coins onto a 1,250 balance.
 *
 * The third Ten - the 10 of spades on trick 9 - is what put the hand out of
 * reach, which is the card the board tags with its trick number.
 *
 * Query flags: ?lost, ?baga, ?tie (2-2, decided on tricks), ?casual (no
 * trophies at stake), ?forfeit (no Tens to turn over).
 */

const flag = (name: string) => location.search.includes(name);

const TENS: TenCapture[] = [
  { suit: "C", team: "A", trick: 2 },
  { suit: "D", team: "A", trick: 5 },
  { suit: "S", team: "A", trick: 9 },
  { suit: "H", team: "B", trick: 12 },
];

const TIE_TENS: TenCapture[] = [
  { suit: "C", team: "A", trick: 2 },
  { suit: "D", team: "B", trick: 5 },
  { suit: "S", team: "A", trick: 9 },
  { suit: "H", team: "B", trick: 12 },
];

const BAGA_TENS: TenCapture[] = TENS.map((ten) => ({ ...ten, team: "A" as const }));

function build(): { outcome: HandOutcome; tens: TenCapture[] } {
  if (flag("forfeit")) {
    return {
      outcome: { winner: "A", tensCaptured: { A: 2, B: 1 }, tricksWon: { A: 6, B: 4 }, special: "forfeit" },
      tens: [],
    };
  }
  if (flag("baga")) {
    return {
      outcome: { winner: "A", tensCaptured: { A: 4, B: 0 }, tricksWon: { A: 11, B: 2 }, special: "baga" },
      tens: BAGA_TENS,
    };
  }
  if (flag("tie")) {
    return {
      outcome: { winner: "A", tensCaptured: { A: 2, B: 2 }, tricksWon: { A: 7, B: 6 }, special: null },
      tens: TIE_TENS,
    };
  }
  if (flag("lost")) {
    return {
      outcome: { winner: "B", tensCaptured: { A: 1, B: 3 }, tricksWon: { A: 5, B: 8 }, special: null },
      tens: TENS.map((ten) => ({ ...ten, team: ten.team === "A" ? ("B" as const) : ("A" as const) })),
    };
  }
  return {
    outcome: { winner: "A", tensCaptured: { A: 3, B: 1 }, tricksWon: { A: 8, B: 5 }, special: null },
    tens: TENS,
  };
}

const { outcome, tens } = build();
const casual = flag("casual");
const youWon = outcome.winner === "A";

createRoot(document.getElementById("test-root")!).render(
  <MindiResultScreen
    outcome={outcome}
    myTeam="A"
    tenCaptures={tens}
    numPlayers={4}
    totalTricks={13}
    modeLabel={casual ? "Casual online" : "Ranked duo"}
    weekend={!casual}
    trophyChange={casual ? 0 : youWon ? 10 : -4}
    trophiesAfter={casual ? 58 : youWon ? 68 : 54}
    coins={youWon ? 10 : 2}
    balance={youWon ? 1260 : 1252}
    winnerNames={youWon ? ["Sayyu", "Mariyam"] : ["Hussain", "Aishath"]}
    playAgainHref="/play/mindi/ranked-duo"
  />
);
