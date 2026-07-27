"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { updateMatchResult } from "@/lib/trophyUpdates";
import MatchRewardPopup from "@/components/rewards/MatchRewardPopup";
import { LeaveMatchButton } from "@/components/game/LeaveMatchButton";
import { watchMatch, updateMatchState, MatchDoc } from "@/lib/matchmaking";
import {
  Card,
  SeatIndex,
  Team,
  TrickPlay,
  SUIT_SYMBOLS,
  SUIT_COLOR,
  rankLabel,
  cardId,
  teamOf,
  nextSeat,
  nextSeatFFA1v1,
  getLegalPlays,
  resolveTrick,
  isTen,
  checkHandOutcome,
  HandOutcome,
} from "@/lib/mindiEngine";

export interface MindiOnlineState {
  handsByUid: Record<string, Card[]>;
  trumpSuit: Card["suit"];
  turnSeat: SeatIndex;
  trick: TrickPlay[];
  tensCaptured: Record<Team, number>;
  tricksWon: Record<Team, number>;
  tricksPlayed: number;
  outcome: HandOutcome | null;
  /** 4 = the standard 2v2 partnership game (default, matches every match
   *  created before this field existed). 2 = the 1v1 FFA room variant
   *  (dealMindiHandFFA1v1) - only seats 0 and 1 are ever used. */
  numPlayers?: 2 | 4;
}

const SEAT_NAMES = ["You", "Left opponent", "Partner", "Right opponent"];

export function MindiOnlineClient({ matchId }: { matchId: string }) {
  const { user } = useAuth();
  const { processMatchEnd } = useEconomy();
  const myUid = user?.uid ?? "";

  const [match, setMatch] = useState<MatchDoc<MindiOnlineState> | null>(null);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [rewardsApplied, setRewardsApplied] = useState(false);

  useEffect(() => {
    const unsub = watchMatch<MindiOnlineState>(matchId, setMatch);
    return unsub;
  }, [matchId]);

  const mySeat = useMemo(
    () => (match ? (match.players.indexOf(myUid) as SeatIndex) : (0 as SeatIndex)),
    [match, myUid]
  );
  const myTeam: Team = teamOf(mySeat);
  const state = match?.state;
  const numPlayers = state?.numPlayers ?? 4;
  const myHand = state?.handsByUid[myUid] ?? [];
  const isMyTurn = state?.turnSeat === mySeat;
  const ledSuit = state && state.trick.length > 0 ? state.trick[0].card.suit : null;
  const legalForMe = state ? getLegalPlays(myHand, ledSuit) : [];

  function seatLabelFor(seat: SeatIndex): string {
    if (numPlayers === 2) return "Opponent";
    // Relative to the viewer: same seat = You, +2 = Partner, others = opponents.
    const relative = (((seat - mySeat) % 4) + 4) % 4;
    return SEAT_NAMES[relative];
  }

  async function handlePlayCard(card: Card) {
    if (!state || !isMyTurn || !match) return;
    if (!legalForMe.some((c) => cardId(c) === cardId(card))) return;

    await updateMatchState<MindiOnlineState>(matchId, (current) => {
      const s = current.state;
      if (s.turnSeat !== mySeat) return null;
      const n = s.numPlayers ?? 4;

      const hand = s.handsByUid[myUid].filter((c) => cardId(c) !== cardId(card));
      const trick = [...s.trick, { seat: mySeat, card }];

      if (trick.length < n) {
        return {
          state: {
            ...s,
            handsByUid: { ...s.handsByUid, [myUid]: hand },
            trick,
            turnSeat: n === 2 ? nextSeatFFA1v1(mySeat as 0 | 1) : nextSeat(mySeat),
          },
        };
      }

      // Trick complete - resolve immediately.
      const winnerSeat = resolveTrick(trick, s.trumpSuit);
      const winnerTeam = teamOf(winnerSeat);
      const tensInTrick = trick.filter((p) => isTen(p.card)).length;
      const tensCaptured = { ...s.tensCaptured, [winnerTeam]: s.tensCaptured[winnerTeam] + tensInTrick };
      const tricksWon = { ...s.tricksWon, [winnerTeam]: s.tricksWon[winnerTeam] + 1 };
      const tricksPlayed = s.tricksPlayed + 1;
      const outcome = checkHandOutcome(tensCaptured, tricksWon, tricksPlayed, n === 2 ? 26 : 13);

      const nextState: MindiOnlineState = {
        ...s,
        handsByUid: { ...s.handsByUid, [myUid]: hand },
        trick: [],
        tensCaptured,
        tricksWon,
        tricksPlayed,
        turnSeat: outcome ? s.turnSeat : winnerSeat,
        outcome,
      };

      return outcome ? { status: "completed", state: nextState } : { state: nextState };
    });
  }

  async function handleShowRewards() {
    if (!state?.outcome || rewardsApplied) {
      setShowRewardPopup(true);
      return;
    }
    setRewardsApplied(true);
    const youWon = state.outcome.winner === myTeam;
    processMatchEnd(youWon, "mindi");
    // Casual is a no-stakes queue (see CasualOnlineClient) - coins/mission
    // progress still apply via processMatchEnd above, same as vs-AI/Pass &
    // Play, but trophies/rank/win-loss record are real-multiplayer-Ranked
    // only, so skip updateMatchResult entirely for a casual match.
    if (match?.pool !== "casual") {
      const trophyMultiplier = match?.pool === "weekend" ? 2 : 1;
      await updateMatchResult(myUid, youWon, "mindi", trophyMultiplier).catch(() => {});
    }
    setShowRewardPopup(true);
  }

  async function handleForfeit() {
    if (!match) return;
    const opponentTeam: Team = myTeam === "A" ? "B" : "A";
    await updateMatchState<MindiOnlineState>(matchId, (current) => {
      const s = current.state;
      if (s.outcome) return null; // match already ended some other way
      return {
        status: "completed",
        state: {
          ...s,
          outcome: {
            winner: opponentTeam,
            tensCaptured: s.tensCaptured,
            tricksWon: s.tricksWon,
            special: "forfeit",
          },
        },
      };
    }).catch(() => {});

    // We're leaving, so we won't be around to click "Rewards" ourselves -
    // take the loss on our own account right now instead.
    processMatchEnd(false, "mindi");
    if (match.pool !== "casual") {
      const trophyMultiplier = match.pool === "weekend" ? 2 : 1;
      await updateMatchResult(myUid, false, "mindi", trophyMultiplier).catch(() => {});
    }
  }

  if (!match || !state) {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center">
        <p className="text-[rgb(var(--c4))] text-sm">Loading match…</p>
      </div>
    );
  }

  if (state.outcome) {
    const youWon = state.outcome.winner === myTeam;
    return (
      <>
        <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${
                youWon ? "bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] shadow-[0_0_40px_rgba(212,175,55,0.3)]" : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]"
              }`}
            >
              <Sparkles size={40} className={youWon ? "text-[#0F0F0F]" : "text-[rgb(var(--c4))]"} />
            </motion.div>
            <div>
              <h1 className={`text-3xl font-bold ${youWon ? "gold-text-gradient" : "text-[rgb(var(--c4))]"}`}>
                {state.outcome.special === "forfeit"
                  ? youWon
                    ? "Opponent Forfeited"
                    : "You Forfeited"
                  : youWon
                  ? "You Won!"
                  : "You Lost"}
              </h1>
              {state.outcome.special && state.outcome.special !== "forfeit" && (
                <p className="text-[#D4AF37] text-sm font-semibold mt-1 uppercase tracking-wide">
                  {state.outcome.special === "baga" ? "Baga — all 4 Tens!" : "Hukunbunye — clean sweep!"}
                </p>
              )}
            </div>
            <div className="glass-card rounded-2xl p-6 max-w-xs mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[rgb(var(--c4))] text-xs">{numPlayers === 2 ? "You" : "Your team"} — Tens</span>
                <span className="text-[rgb(var(--text-primary))] font-bold">{state.outcome.tensCaptured[myTeam]} / 4</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[rgb(var(--c4))] text-xs">{numPlayers === 2 ? "Opponent" : "Opponents"} — Tens</span>
                <span className="text-[rgb(var(--text-primary))] font-bold">{state.outcome.tensCaptured[myTeam === "A" ? "B" : "A"]} / 4</span>
              </div>
            </div>
            <div className="flex gap-3 max-w-xs mx-auto">
              <Link href="/play" className="flex-1">
                <motion.button whileTap={{ scale: 0.95 }} className="w-full py-3 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--text-primary))] text-sm font-medium flex items-center justify-center gap-2">
                  <Home size={16} />
                  Exit
                </motion.button>
              </Link>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleShowRewards}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F] text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                Rewards
              </motion.button>
            </div>
          </motion.div>
        </div>
        <MatchRewardPopup
          isOpen={showRewardPopup}
          onClose={() => setShowRewardPopup(false)}
          isVictory={youWon}
          coinsEarned={youWon ? 10 : 2}
          trophyChange={match?.pool === "casual" ? 0 : youWon ? 15 : -5}
          newCoinBalance={0}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <LeaveMatchButton exitHref="/play" isOnlineMatch onConfirmLeave={handleForfeit} />
        <div className="text-center">
          <p className="text-[rgb(var(--text-primary))] text-sm font-semibold">
            Mindi — {match.pool === "casual" ? "Casual" : match.pool === "weekend" ? "Weekend League" : "Ranked"}
          </p>
          <p className="text-[rgb(var(--c4))] text-[10px] flex items-center justify-center gap-1">
            Trump: <span className={SUIT_COLOR[state.trumpSuit] === "red" ? "text-red-400" : "text-[rgb(var(--text-primary))]"}>{SUIT_SYMBOLS[state.trumpSuit]}</span>
          </p>
        </div>
        <div className="w-10" />
      </div>

      <div className="px-4 py-2">
        <div className="glass-card rounded-2xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-[#D4AF37]" />
            <span className="text-[rgb(var(--text-primary))] font-medium">{numPlayers === 2 ? "You" : "Your team"}</span>
            <span className="text-[#D4AF37] font-bold">{state.tensCaptured[myTeam]} tens</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#D4AF37] font-bold">{state.tensCaptured[myTeam === "A" ? "B" : "A"]} tens</span>
            <span className="text-[rgb(var(--text-primary))] font-medium">{numPlayers === 2 ? "Opponent" : "Opponents"}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-between py-4 px-4">
        {numPlayers === 2 ? (
          <SeatRow
            label={seatLabelFor(((mySeat === 0 ? 1 : 0) as SeatIndex))}
            count={state.handsByUid[match.players[mySeat === 0 ? 1 : 0]]?.length ?? 0}
            active={state.turnSeat !== mySeat}
          />
        ) : (
          <SeatRow label={seatLabelFor(((mySeat + 2) % 4) as SeatIndex)} count={state.handsByUid[match.players[((mySeat + 2) % 4)]]?.length ?? 0} active={state.turnSeat === (((mySeat + 2) % 4) as SeatIndex)} />
        )}

        <div className="flex items-center justify-between w-full max-w-sm">
          {numPlayers !== 2 && (
            <SeatRow label={seatLabelFor(((mySeat + 1) % 4) as SeatIndex)} count={state.handsByUid[match.players[((mySeat + 1) % 4)]]?.length ?? 0} active={state.turnSeat === (((mySeat + 1) % 4) as SeatIndex)} />
          )}

          <div className="relative w-32 h-32 flex items-center justify-center flex-wrap gap-1 mx-auto">
            {state.trick.length === 0 ? (
              <span className="text-[rgb(var(--c3))] text-xs">{isMyTurn ? "Your turn" : "Waiting…"}</span>
            ) : (
              state.trick.map((play) => (
                <div key={cardId(play.card)} className="w-10 h-14 rounded-md flex flex-col items-center justify-center border bg-[rgb(var(--c2))] border-[rgb(var(--c3))]">
                  <span className={`text-xs font-bold ${SUIT_COLOR[play.card.suit] === "red" ? "text-red-400" : "text-[rgb(var(--text-primary))]"}`}>{rankLabel(play.card.rank)}</span>
                  <span className={`text-[10px] ${SUIT_COLOR[play.card.suit] === "red" ? "text-red-400" : "text-[rgb(var(--text-primary))]"}`}>{SUIT_SYMBOLS[play.card.suit]}</span>
                </div>
              ))
            )}
          </div>

          {numPlayers !== 2 && (
            <SeatRow label={seatLabelFor(((mySeat + 3) % 4) as SeatIndex)} count={state.handsByUid[match.players[((mySeat + 3) % 4)]]?.length ?? 0} active={state.turnSeat === (((mySeat + 3) % 4) as SeatIndex)} />
          )}
        </div>

        <div className="w-full">
          <p className="text-[rgb(var(--c4))] text-xs mb-2 text-center">{isMyTurn ? "Select a card to play" : "Waiting for other players…"}</p>
          <div className="flex justify-center gap-1.5 flex-wrap">
            {myHand.map((card) => {
              const canPlay = isMyTurn && legalForMe.some((c) => cardId(c) === cardId(card));
              return (
                <motion.button
                  key={cardId(card)}
                  whileHover={canPlay ? { y: -8, scale: 1.05 } : {}}
                  whileTap={canPlay ? { scale: 0.95 } : {}}
                  onClick={() => canPlay && handlePlayCard(card)}
                  disabled={!canPlay}
                  className="w-12 h-16 rounded-lg bg-gradient-to-br from-[rgb(var(--c2))] to-[rgb(var(--c1))] border border-[#D4AF37]/30 flex flex-col items-center justify-center disabled:opacity-40 disabled:border-[rgb(var(--c3))]"
                >
                  <span className={`text-sm font-bold ${SUIT_COLOR[card.suit] === "red" ? "text-red-400" : "text-[#D4AF37]"}`}>{rankLabel(card.rank)}</span>
                  <span className={`text-xs ${SUIT_COLOR[card.suit] === "red" ? "text-red-400" : "text-[#D4AF37]"}`}>{SUIT_SYMBOLS[card.suit]}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SeatRow({ label, count, active }: { label: string; count: number; active: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-colors ${active ? "border-[#D4AF37] bg-[#D4AF37]/10" : "border-[rgb(var(--c3))] bg-[rgb(var(--c2))]"}`}>
      <span className={`text-[10px] font-medium ${active ? "text-[#D4AF37]" : "text-[rgb(var(--c5))]"}`}>{label}</span>
      <span className="text-[rgb(var(--c4))] text-[10px]">{count} cards</span>
    </div>
  );
}
