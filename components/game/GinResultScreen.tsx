"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Home, Sparkles, RotateCcw, Coins } from "lucide-react";
import { GinHandResult, cardId, rankLabel, SUIT_SYMBOLS, SUIT_COLOR } from "@/lib/ginRummyEngine";

/**
 * End of a Gin hand: the winning layout, what the player earned, and the two
 * ways onward.
 *
 * Rewards are shown here rather than behind a button - the hand is over, and
 * making someone press "Rewards" to find out what they won is a step for no
 * reason. Continue starts another match in the same mode; Exit leaves.
 */
export function GinResultScreen({ result, youWon, coins, balance, onContinue, forfeited = false, continueLabel = "Continue" }: {
  result: GinHandResult;
  youWon: boolean;
  coins: number;
  balance: number;
  onContinue: () => void;
  /** A forfeited match has no winning layout to show. */
  forfeited?: boolean;
  continueLabel?: string;
}) {
  return (
    <div className="gin-result">
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="gin-result-inner">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
          className={"gin-result-badge" + (youWon ? " is-win" : "")}>
          <Sparkles size={38} aria-hidden="true" />
        </motion.div>

        <h1 className={youWon ? "gold-text-gradient" : undefined}>
          {forfeited ? (youWon ? "Opponent forfeited" : "You forfeited") : youWon ? "You won" : "You lost"}
        </h1>
        <p className="gin-result-sub">
          {forfeited ? "The match ended early" : youWon ? "Three melds — 4, 3 and 3" : "Your opponent melded 4, 3 and 3"}
        </p>

        {/* The layout that actually won, so the result is legible rather than
            just a verdict. A forfeit has none. */}
        <ul className="gin-result-layout" aria-label="Winning melds">
          {result.layout.map((meld, i) => (
            <li key={i}>
              {meld.map(card => (
                <span key={cardId(card)} data-suit={SUIT_COLOR[card.suit]}>
                  {rankLabel(card.rank)}{SUIT_SYMBOLS[card.suit]}
                </span>
              ))}
            </li>
          ))}
        </ul>

        <dl className="gin-result-rewards">
          <div><dt><Coins size={15} aria-hidden="true" />Coins earned</dt><dd>+{coins}</dd></div>
          <div><dt>New balance</dt><dd>{balance}</dd></div>
          {!forfeited && <div><dt>Points</dt><dd>{result.score}</dd></div>}
          {!forfeited && <div><dt>{youWon ? "Opponent deadwood" : "Your deadwood"}</dt><dd>{result.loserDeadwood}</dd></div>}
        </dl>

        <div className="gin-result-actions">
          <motion.button whileTap={{ scale: 0.95 }} className="gin-result-continue" onClick={onContinue}>
            <RotateCcw size={18} aria-hidden="true" />{continueLabel}
          </motion.button>
          <Link href="/play" className="gin-result-exit">
            <Home size={16} aria-hidden="true" />Exit
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
