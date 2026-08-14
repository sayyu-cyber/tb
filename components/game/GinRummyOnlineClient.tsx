"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Sparkles, Layers } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { updateMatchResult } from "@/lib/trophyUpdates";
import MatchRewardPopup from "@/components/rewards/MatchRewardPopup";
import { LeaveMatchButton } from "@/components/game/LeaveMatchButton";
import { watchMatch, updateMatchState, MatchDoc } from "@/lib/matchmaking";
import {
  Card,
  cardId,
  rankLabel,
  SUIT_SYMBOLS,
  SUIT_COLOR,
  bestMeldArrangement,
  scoreKnock,
} from "@/lib/ginRummyEngine";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/contexts/ToastContext";

export interface GinOnlineState {
  hands: Record<string, Card[]>;
  stock: Card[];
  discard: Card[];
  turn: string;
  phase: "draw" | "discard";
  result: {
    winnerUid: string | "draw";
    knockerUid: string | null;
    gin: boolean;
    undercut: boolean;
    deadwood: Record<string, number>;
    score: number;
    forfeitedBy?: string;
  } | null;
}

export function GinRummyOnlineClient({ matchId }: { matchId: string }) {
  const { user } = useAuth();
  const { processMatchEnd } = useEconomy();
  const myUid = user?.uid ?? "";

  const [match, setMatch] = useState<MatchDoc<GinOnlineState> | null>(null);
  const [selectedDiscard, setSelectedDiscard] = useState<Card | null>(null);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [rewardsApplied, setRewardsApplied] = useState(false);
  const t = useTranslation();
  const { showToast } = useToast();

  useEffect(() => {
    const unsub = watchMatch<GinOnlineState>(matchId, setMatch);
    return unsub;
  }, [matchId]);

  const opponentUid = useMemo(() => match?.players.find((p) => p !== myUid) ?? "", [match, myUid]);
  const state = match?.state;
  const myHand = useMemo(() => state?.hands[myUid] ?? [], [state, myUid]);
  const isMyTurn = state?.turn === myUid;
  const topDiscard = state && state.discard.length > 0 ? state.discard[state.discard.length - 1] : null;

  const sortedHand = useMemo(
    () => [...myHand].sort((a, b) => (a.suit === b.suit ? a.rank - b.rank : a.suit.localeCompare(b.suit))),
    [myHand]
  );

  const deadwoodAfterSelected = useMemo(() => {
    if (!selectedDiscard) return null;
    const rest = myHand.filter((c) => cardId(c) !== cardId(selectedDiscard));
    return bestMeldArrangement(rest);
  }, [myHand, selectedDiscard]);

  const canKnock = state?.phase === "discard" && !!deadwoodAfterSelected && deadwoodAfterSelected.deadwoodValue <= 10;

  async function handleDraw(source: "stock" | "discard") {
    if (!state || !isMyTurn || state.phase !== "draw") return;
    await updateMatchState<GinOnlineState>(matchId, (current) => {
      const s = current.state;
      if (s.turn !== myUid || s.phase !== "draw") return null;
      if (s.stock.length <= 2) {
        return {
          status: "completed",
          state: {
            ...s,
            result: {
              winnerUid: "draw",
              knockerUid: null,
              gin: false,
              undercut: false,
              deadwood: {
                [myUid]: bestMeldArrangement(s.hands[myUid]).deadwoodValue,
                [opponentUid]: bestMeldArrangement(s.hands[opponentUid]).deadwoodValue,
              },
              score: 0,
            },
          },
        };
      }
      const hand = [...s.hands[myUid]];
      let stock = [...s.stock];
      let discard = [...s.discard];
      if (source === "discard") {
        if (discard.length === 0) return null;
        hand.push(discard.pop()!);
      } else {
        if (stock.length === 0) return null;
        hand.push(stock.pop()!);
      }
      return { state: { ...s, hands: { ...s.hands, [myUid]: hand }, stock, discard, phase: "discard" } };
    });
  }

  function handleSelectDiscard(card: Card) {
    if (!state || state.phase !== "discard" || !isMyTurn) return;
    setSelectedDiscard((prev) => (prev && cardId(prev) === cardId(card) ? null : card));
  }

  async function handleConfirmDiscard() {
    if (!selectedDiscard || !opponentUid) return;
    const discardCard = selectedDiscard;
    setSelectedDiscard(null);
    await updateMatchState<GinOnlineState>(matchId, (current) => {
      const s = current.state;
      if (s.turn !== myUid || s.phase !== "discard") return null;
      const hand = s.hands[myUid].filter((c) => cardId(c) !== cardId(discardCard));
      return {
        state: { ...s, hands: { ...s.hands, [myUid]: hand }, discard: [...s.discard, discardCard], phase: "draw", turn: opponentUid },
      };
    });
  }

  async function handleKnock() {
    if (!selectedDiscard || !deadwoodAfterSelected || !opponentUid) return;
    const discardCard = selectedDiscard;
    const arrangement = deadwoodAfterSelected;
    setSelectedDiscard(null);
    await updateMatchState<GinOnlineState>(matchId, (current) => {
      const s = current.state;
      if (s.turn !== myUid || s.phase !== "discard") return null;
      const hand = s.hands[myUid].filter((c) => cardId(c) !== cardId(discardCard));
      if (arrangement.deadwoodValue > 10) return null;
      const raw = scoreKnock("player", arrangement, s.hands[opponentUid]);
      const winnerUid = raw.winner === "player" ? myUid : opponentUid;
      return {
        status: "completed",
        state: {
          ...s,
          hands: { ...s.hands, [myUid]: hand },
          discard: [...s.discard, discardCard],
          result: {
            winnerUid,
            knockerUid: myUid,
            gin: raw.gin,
            undercut: raw.undercut,
            deadwood: { [myUid]: raw.playerDeadwood, [opponentUid]: raw.opponentDeadwood },
            score: raw.score,
          },
        },
      };
    });
  }

  async function handleShowRewards() {
    if (!state?.result || rewardsApplied) {
      setShowRewardPopup(true);
      return;
    }
    setRewardsApplied(true);
    const isVictory = state.result.winnerUid === myUid;
    processMatchEnd(isVictory, "gin_rummy");
    // Casual is a no-stakes queue (see CasualOnlineClient) - skip the real
    // trophy/rank update, same treatment as Mindi's casual pool.
    if (state.result.winnerUid !== "draw" && match?.pool !== "casual") {
      const trophyMultiplier = match?.pool === "weekend" ? 2 : 1;
      // See MindiOnlineClient - a swallowed failure here reads to the
      // player as "I won and got nothing".
      await updateMatchResult(myUid, isVictory, "gin-rummy", trophyMultiplier).catch(() => {
        showToast(t("toast_trophiesFailed"), "error");
      });
    }
    setShowRewardPopup(true);
  }

  async function handleForfeit() {
    if (!match || !opponentUid) return;
    await updateMatchState<GinOnlineState>(matchId, (current) => {
      const s = current.state;
      if (s.result) return null; // match already ended some other way
      return {
        status: "completed",
        state: {
          ...s,
          result: {
            winnerUid: opponentUid,
            knockerUid: null,
            gin: false,
            undercut: false,
            deadwood: {
              [myUid]: bestMeldArrangement(s.hands[myUid] ?? []).deadwoodValue,
              [opponentUid]: bestMeldArrangement(s.hands[opponentUid] ?? []).deadwoodValue,
            },
            score: 0,
            forfeitedBy: myUid,
          },
        },
      };
    }).catch(() => {
      showToast(t("toast_forfeitFailed"), "error");
    });

    // We're leaving, so we won't be around to click "Rewards" ourselves -
    // take the loss on our own account right now instead.
    processMatchEnd(false, "gin_rummy");
    if (match.pool !== "casual") {
      const trophyMultiplier = match.pool === "weekend" ? 2 : 1;
      await updateMatchResult(myUid, false, "gin-rummy", trophyMultiplier).catch(() => {
        showToast(t("toast_trophiesFailed"), "error");
      });
    }
  }

  if (!match || !state) {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center">
        <p className="text-[rgb(var(--c4))] text-sm">{t("common_loadingMatch")}</p>
      </div>
    );
  }

  if (state.result) {
    const { result } = state;
    const isDraw = result.winnerUid === "draw";
    const youWon = result.winnerUid === myUid;
    return (
      <>
        <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${
                youWon ? "bg-gradient-to-br from-[rgb(var(--gold))] to-[rgb(var(--gold-bright))] shadow-[0_0_40px_rgba(212,175,55,0.3)]" : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]"
              }`}
            >
              <Sparkles size={40} className={youWon ? "text-[#0F0F0F]" : "text-[rgb(var(--c4))]"} />
            </motion.div>
            <div>
              <h1 className={`text-3xl font-bold ${youWon ? "gold-text-gradient" : "text-[rgb(var(--c4))]"}`}>
                {result.forfeitedBy
                  ? youWon
                    ? t("mindi_opponentForfeited")
                    : t("mindi_youForfeited")
                  : isDraw
                  ? t("gin_stockRanOut")
                  : youWon
                  ? t("mindi_youWon")
                  : t("mindi_youLost")}
              </h1>
              {!isDraw && !result.forfeitedBy && (result.gin || result.undercut) && (
                <p className="text-[rgb(var(--gold))] text-sm font-semibold mt-1 uppercase tracking-wide">
                  {result.gin ? t("gin_gin") : t("gin_undercut")}
                </p>
              )}
            </div>
            <div className="glass-card rounded-2xl p-6 max-w-xs mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[rgb(var(--c4))] text-xs">{t("gin_yourDeadwood")}</span>
                <span className="text-[rgb(var(--text-primary))] font-bold">{result.deadwood[myUid] ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[rgb(var(--c4))] text-xs">{t("gin_opponentDeadwood")}</span>
                <span className="text-[rgb(var(--text-primary))] font-bold">{result.deadwood[opponentUid] ?? 0}</span>
              </div>
              {!isDraw && (
                <>
                  <div className="h-px bg-[rgb(var(--c3))]" />
                  <div className="flex items-center justify-between">
                    <span className="text-[rgb(var(--c4))] text-xs">{t("gin_points")}</span>
                    <span className="text-[rgb(var(--gold))] font-bold">{result.score}</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 max-w-xs mx-auto">
              <Link href="/play" className="flex-1">
                <motion.button whileTap={{ scale: 0.95 }} className="w-full py-3 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--text-primary))] text-sm font-medium flex items-center justify-center gap-2">
                  <Home size={16} />
                  {t("common_exit")}
                </motion.button>
              </Link>
              {!isDraw && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleShowRewards}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  {t("common_rewards")}
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>
        {!isDraw && (
          <MatchRewardPopup
            isOpen={showRewardPopup}
            onClose={() => setShowRewardPopup(false)}
            isVictory={youWon}
            coinsEarned={youWon ? 10 : 2}
            trophyChange={match?.pool === "casual" ? 0 : youWon ? 15 : -5}
            newCoinBalance={0}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <LeaveMatchButton exitHref="/play" isOnlineMatch onConfirmLeave={handleForfeit} />
        <div className="text-center">
          <p className="text-[rgb(var(--text-primary))] text-sm font-semibold">
            Gin Rummy — {match.pool === "casual" ? t("gamesel_online") : match.pool === "weekend" ? t("page_weekendLeague") : t("mindi_poolRanked")}
          </p>
          <p className="text-[rgb(var(--c4))] text-[10px]">
            {isMyTurn ? t("gin_yourTurn") : t("gin_opponentTurn")} · {t("gin_deadwood")}: {bestMeldArrangement(myHand).deadwoodValue}
          </p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex items-center justify-center gap-8 py-6">
        <button
          onClick={() => handleDraw("stock")}
          disabled={state.phase !== "draw" || !isMyTurn || state.stock.length <= 2}
          className="flex flex-col items-center gap-1 disabled:opacity-40"
        >
          <div className="w-16 h-24 rounded-xl bg-gradient-to-br from-[rgb(var(--c2))] to-[rgb(var(--c1))] border border-[rgb(var(--c3))] flex items-center justify-center">
            <Layers size={20} className="text-[rgb(var(--c4))]" />
          </div>
          <span className="text-[10px] text-[rgb(var(--c4))]">{t("gin_stock").replace("{n}", String(state.stock.length))}</span>
        </button>

        <button
          onClick={() => handleDraw("discard")}
          disabled={state.phase !== "draw" || !isMyTurn || !topDiscard}
          className="flex flex-col items-center gap-1 disabled:opacity-40"
        >
          {topDiscard ? (
            <div className="w-16 h-24 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--gold)/40%)] flex flex-col items-center justify-center">
              <span className={`text-lg font-bold ${SUIT_COLOR[topDiscard.suit] === "red" ? "text-red-400" : "text-[rgb(var(--text-primary))]"}`}>
                {rankLabel(topDiscard.rank)}
              </span>
              <span className={`text-sm ${SUIT_COLOR[topDiscard.suit] === "red" ? "text-red-400" : "text-[rgb(var(--text-primary))]"}`}>
                {SUIT_SYMBOLS[topDiscard.suit]}
              </span>
            </div>
          ) : (
            <div className="w-16 h-24 rounded-xl border border-dashed border-[rgb(var(--c3))]" />
          )}
          <span className="text-[10px] text-[rgb(var(--c4))]">{t("gin_discardPile")}</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-end px-4 pb-6">
        <p className="text-[rgb(var(--c4))] text-xs mb-3 text-center">
          {!isMyTurn ? t("gin_waitingOpponent") : state.phase === "draw" ? t("gin_drawCard") : t("gin_selectDiscard")}
        </p>
        <div className="flex justify-center gap-1.5 flex-wrap">
          {sortedHand.map((card) => {
            const selected = selectedDiscard && cardId(selectedDiscard) === cardId(card);
            return (
              <motion.button
                key={cardId(card)}
                whileHover={isMyTurn && state.phase === "discard" ? { y: -8 } : {}}
                whileTap={isMyTurn && state.phase === "discard" ? { scale: 0.95 } : {}}
                onClick={() => handleSelectDiscard(card)}
                disabled={!isMyTurn || state.phase !== "discard"}
                className={`w-11 h-16 rounded-lg border flex flex-col items-center justify-center disabled:opacity-70 ${
                  selected ? "bg-[rgb(var(--gold)/20%)] border-[rgb(var(--gold))] -translate-y-2" : "bg-gradient-to-br from-[rgb(var(--c2))] to-[rgb(var(--c1))] border-[rgb(var(--c3))]"
                }`}
              >
                <span className={`text-sm font-bold ${SUIT_COLOR[card.suit] === "red" ? "text-red-400" : "text-[rgb(var(--gold))]"}`}>
                  {rankLabel(card.rank)}
                </span>
                <span className={`text-xs ${SUIT_COLOR[card.suit] === "red" ? "text-red-400" : "text-[rgb(var(--gold))]"}`}>
                  {SUIT_SYMBOLS[card.suit]}
                </span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {selectedDiscard && state.phase === "discard" && isMyTurn && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex justify-center gap-3 mt-4">
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleConfirmDiscard} className="px-6 py-2.5 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--text-primary))] text-sm font-medium">
                {t("gin_discard")}
              </motion.button>
              {canKnock && (
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleKnock} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] text-sm font-semibold">
                  {t("gin_knock")}
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
