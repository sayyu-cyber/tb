"use client";
import { useState } from "react";

/**
 * The in-app rule book for both games.
 *
 * Written from the finished engines, not from the published versions of these
 * games: both differ from the standard rules on purpose. If a rule here and
 * lib/mindiEngine.ts or lib/ginRummyEngine.ts disagree, the engine is right
 * and this file is the bug - scripts/check-game-rules.ts pins the engine
 * behaviour that these pages describe.
 */

type Game = "mindi" | "gin";
interface Section { title: string; points: string[] }

const MINDI: Section[] = [
  {
    title: "Setting up",
    points: [
      "Four players in two teams of two. Your partner sits opposite you; your opponents sit either side.",
      "Before the deal, one card is cut for each player. Whoever cuts the highest card plays first, with Ace highest. If the highest card is tied, everybody cuts again.",
      "Thirteen cards are then dealt to each player, one at a time.",
      "Your hand is sorted by suit, lowest to highest, to begin with. You can rearrange it however you like.",
    ],
  },
  {
    title: "Playing a trick",
    points: [
      "The first player puts down any card. That card's suit is the led suit.",
      "Everybody else must follow the led suit if they hold it. Only a player with none of that suit may play something else.",
      "Ace is the highest card, then King, Queen, Jack, Ten, and down to Two.",
      "Once all four cards are down, the trick is won and the winner leads the next one. All thirteen tricks are played out.",
    ],
  },
  {
    title: "Trump",
    points: [
      "There is no trump suit when the hand begins.",
      "The first time a player cannot follow the led suit, whatever suit they play instead becomes trump — for the rest of the hand.",
      "That card wins the trick it was played in, unless somebody later in the same trick plays a higher trump.",
      "From then on, the highest trump in a trick wins it. A trump can only be beaten by a higher trump.",
      "With no trump in a trick, the highest card of the led suit wins.",
    ],
  },
  {
    title: "Winning",
    points: [
      "Whichever team captures the most Tens wins the hand.",
      "Three Tens beats one Ten even if the other team won every single trick.",
      "If both teams have the same number of Tens, the team that won more tricks wins.",
      "Baga — your team takes all four Tens.",
      "Haas Baga — your team takes all four Tens and wins every trick.",
    ],
  },
  {
    title: "Controls",
    points: [
      "Tap a card once to pick it up, and again to play it. The Play Card button does the same thing.",
      "Drag a card sideways to move it in your hand, or hold Alt and press the left and right arrow keys.",
      "Sort your hand by suit or by rank at any time. Choosing a sort clears an arrangement you made by hand.",
      "Cards you are not allowed to play are dimmed — you must follow the led suit while you still hold it.",
    ],
  },
  {
    title: "One against one",
    points: [
      "A room can be set to a two-player game instead. It works exactly the same way, with no partners.",
      "Each player gets twenty-six cards and the hand runs for twenty-six tricks.",
    ],
  },
];

const GIN: Section[] = [
  {
    title: "Setting up",
    points: [
      "Two players. Before the deal you each cut one card, and whoever cuts the higher card plays first. If you both cut the same rank, you cut again.",
      "Ace is the highest card in the cut — note that in the game itself an ace is the lowest card.",
      "Ten cards are then dealt to each of you, and the next card is turned face up to start the discard pile. The rest is the stock.",
      "Your hand is grouped by melds to begin with. You can rearrange it however you like.",
    ],
  },
  {
    title: "Melds",
    points: [
      "A set is three or four cards of the same rank — three Sevens, for instance.",
      "A run is three or more cards in a row in the same suit, such as 4-5-6 of spades.",
      "Ace is low. A run may start A-2-3, but it cannot turn the corner from King to Ace.",
      "Cards left over are your deadwood. Deadwood does not win or lose you anything here — it is only a guide to how close you are.",
    ],
  },
  {
    title: "Taking your turn",
    points: [
      "Draw one card, either the top of the stock or the face-up card on the discard pile.",
      "Then discard one card. Every turn is a draw and a discard.",
      "You get fifteen seconds for the whole turn. If the time runs out, a card is drawn from the stock for you and a random card is discarded.",
      "If the stock runs out, everything under the face-up card is shuffled and becomes the new stock, and play carries on.",
    ],
  },
  {
    title: "Winning",
    points: [
      "There is no knocking. Low deadwood never wins a hand, however low it gets.",
      "You win by holding, after your discard, exactly three melds — one of four cards and two of three — using all ten cards.",
      "A longer run counts if it can be split into those sizes. Ten cards in one run win, split 4-3-3. So do six-and-four, and seven-and-three.",
      "Two runs of five are the one shape that does not win. Five cards cannot be cut into two melds, so you must break one run up and re-form it.",
      "Because there is no knocking, a hand runs until somebody goes out. Now and then the cards each player needs are sitting in the other's hand, and neither can finish — you will be told when that looks likely, and you can leave the match.",
    ],
  },
  {
    title: "Controls",
    points: [
      "Tap a card once to highlight it, and again to discard it. The Discard button does the same thing.",
      "The button reads Discard & win when throwing that card goes out.",
      "Drag a card sideways to move it in your hand, or hold Alt and press the left and right arrow keys.",
      "Sort your hand by melds or by rank. Choosing a sort clears an arrangement you made by hand.",
      "View Melds highlights the cards that are currently part of a set or a run.",
    ],
  },
];

export function RuleBook({ game }: { game: Game }) {
  const sections = game === "mindi" ? MINDI : GIN;
  const [open, setOpen] = useState(0);

  return (
    <div className="rule-book">
      <nav className="rule-book-tabs" aria-label="Rule book sections">
        {sections.map((section, i) => (
          <button key={section.title} type="button" aria-current={i === open ? "true" : undefined} onClick={() => setOpen(i)}>
            {section.title}
          </button>
        ))}
      </nav>
      {sections.map((section, i) => (
        <section key={section.title} hidden={i !== open}>
          <h3>{section.title}</h3>
          <ul>{section.points.map(point => <li key={point}>{point}</li>)}</ul>
        </section>
      ))}
    </div>
  );
}
