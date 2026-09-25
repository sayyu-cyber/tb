"use client";
import Link from "next/link";
import { Home, Trophy, RotateCcw, Coins, Check } from "lucide-react";
import { Card, GinHandResult, cardId, rankLabel } from "@/lib/ginRummyEngine";
import { ArenaStage } from "./ArenaStage";
import { ArenaSprite } from "./ArenaSprite";
import { ArenaFace } from "./ArenaCard";
import { GinArenaScene } from "./GinArenaScene";
import { Button } from "@/components/ui/Button";

/**
 * End of a Gin hand: the winning layout, what the player earned, and the two
 * ways onward.
 *
 * Rewards are shown here rather than behind a button - the hand is over, and
 * making someone press "Rewards" to find out what they won is a step for no
 * reason. Continue starts another match in the same mode; Exit leaves.
 */
export function GinResultScreen({ result, youWon, coins, balance, onContinue, forfeited = false, continueLabel = "Continue", revealedHand, tableSkin }: {
  result: GinHandResult;
  youWon: boolean;
  coins: number;
  balance: number;
  onContinue: () => void;
  /** A forfeited match has no winning layout to show. */
  forfeited?: boolean;
  continueLabel?: string;
  /** Only supplied after the match has ended. */
  revealedHand?: Card[];
  tableSkin?: string;
}) {
  return (
    <ArenaStage className="arena-gin-board gin-arena gin-arena-result">
      <div className="ar gin-arena-board">
        <ArenaSprite/>
        <div className="bg" aria-hidden="true"/><div className="bigword" aria-hidden="true">GIN</div>
        <div className="stage" aria-hidden="true"><div className="floor"/></div>
        <GinArenaScene skin={tableSkin}/>
      <main className="hud gin-arena-result-panel">
        <div className="gin-result-kicker"><Trophy size={20}/>{forfeited?"Match complete":"Hand complete"}</div>
        <h1>
          {forfeited ? (youWon ? "Opponent forfeited" : "You forfeited") : youWon ? "You won" : "You lost"}
        </h1>
        <p className="gin-arena-result-sub">
          {forfeited ? "The match ended early" : youWon ? "Three melds — 4, 3 and 3" : "Your opponent melded 4, 3 and 3"}
        </p>

        {/* The layout that actually won, so the result is legible rather than
            just a verdict. A forfeit has none. */}
        {!forfeited&&<ul className="gin-arena-winning-melds" aria-label="Winning melds">
          {result.layout.map((meld, i) => (
            <li key={i}><div>
              {meld.map(card => (
                <div key={cardId(card)} className="gin-result-face" role="img" aria-label={`${rankLabel(card.rank)} ${card.suit}`}>
                  <ArenaFace rank={rankLabel(card.rank)} suit={card.suit}/>
                </div>
              ))}
            </div><span><Check size={14}/>{meld.every(card=>card.rank===meld[0].rank)?"Set":"Run"} of {meld.length}</span></li>
          ))}
        </ul>}

        <dl className="gin-arena-result-stats">
          <div><dt><Coins size={15} aria-hidden="true" />Coins earned</dt><dd>+{coins}</dd></div>
          <div><dt>New balance</dt><dd>{balance}</dd></div>
          {!forfeited && <div><dt>Points</dt><dd>{result.score}</dd></div>}
          {!forfeited && <div><dt>{youWon ? "Opponent deadwood" : "Your deadwood"}</dt><dd>{result.loserDeadwood}</dd></div>}
        </dl>

        {!forfeited&&!!revealedHand?.length&&<section className="gin-arena-reveal" aria-label="Opponent's revealed hand"><h2>Opponent&apos;s hand</h2><div>{revealedHand.map(card=><div key={cardId(card)} className="gin-result-face" role="img" aria-label={`${rankLabel(card.rank)} ${card.suit}`}><ArenaFace rank={rankLabel(card.rank)} suit={card.suit}/></div>)}</div></section>}
        <div className="gin-arena-result-actions">
          <Button onClick={onContinue}>
            <RotateCcw size={18} aria-hidden="true" />{continueLabel}
          </Button>
          <Link href="/play" className="ar-btn ghost">
            <Home size={16} aria-hidden="true" />Exit
          </Link>
        </div>
      </main>
      </div>
    </ArenaStage>
  );
}
