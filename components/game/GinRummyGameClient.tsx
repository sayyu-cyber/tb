"use client";
import { GinRummyTable } from "./GinRummyTable";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Home, Sparkles, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEconomy } from "@/contexts/EconomyContext";
import MatchRewardPopup from "@/components/rewards/MatchRewardPopup";
import {
  Card,
  cardId,
  dealGinHand,
  bestMeldArrangement,
  scoreKnock,
  botChooseDraw,
  botChooseDiscard,
  GinHandResult,
} from "@/lib/ginRummyEngine";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { sortHand } from "@/lib/cardSort";
import { ArenaSeatData } from "@/components/game/GameArena";

interface GinRummyGameClientProps {
  /** "ai": you vs a bot. "passplay": two local players alternating with a pass-the-device screen. */
  mode: "ai" | "passplay";
}

type Side = "player" | "opponent";
type Phase = "draw" | "discard";

const LOCAL_SIDE_DECK_SKINS: Record<Side, string> = {
  player: "cb_neon",
  opponent: "cb_fire",
};

export function GinRummyGameClient({ mode }: GinRummyGameClientProps) {
  const { processMatchEnd, state: economyState } = useEconomy();
  const { playerStats, user } = useAuth();
  const t = useTranslation();
  const [showRewardPopup, setShowRewardPopup] = useState(false);

  const [initialDeal] = useState(() => dealGinHand());
  const [playerHand, setPlayerHand] = useState<Card[]>(() => initialDeal.playerHand);
  const [opponentHand, setOpponentHand] = useState<Card[]>(() => initialDeal.opponentHand);
  const [stock, setStock] = useState<Card[]>(() => initialDeal.stock);
  const [discard, setDiscard] = useState<Card[]>(() => initialDeal.discard);

  const [turn, setTurn] = useState<Side>("player");
  const [phase, setPhase] = useState<Phase>("draw");
  const [selectedDiscard, setSelectedDiscard] = useState<Card | null>(null);
  const [result, setResult] = useState<GinHandResult | null>(null);

  // Pass & Play: whose turn is currently revealed on screen.
  const [revealedSide, setRevealedSide] = useState<Side | null>(mode === "ai" ? "player" : null);

  const needsPassScreen = mode === "passplay" && !result && revealedSide !== turn;

  const topDiscard = discard.length > 0 ? discard[discard.length - 1] : null;
  const sortedPlayerHand = useMemo(() => sortHand(playerHand), [playerHand]);

  const deadwoodAfterSelected = useMemo(() => {
    if (!selectedDiscard) return null;
    const rest = (mode === "passplay" && turn === "opponent" ? opponentHand : playerHand).filter((c) => cardId(c) !== cardId(selectedDiscard));
    return bestMeldArrangement(rest);
  }, [playerHand, opponentHand, mode, turn, selectedDiscard]);

  const canKnock = phase === "discard" && !!deadwoodAfterSelected && deadwoodAfterSelected.deadwoodValue <= 10;

  // Opponent / bot turn.
  useEffect(() => {
    if (result) return;
    if (turn !== "opponent") return;
    if (mode === "passplay") return; // a human plays the "opponent" seat too

    const timer = setTimeout(() => runOpponentTurn(), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, result, mode]);

  function checkStockExhausted(): boolean {
    if (stock.length <= 2) {
      setResult({
        winner: "draw",
        knocker: null,
        gin: false,
        undercut: false,
        playerDeadwood: bestMeldArrangement(playerHand).deadwoodValue,
        opponentDeadwood: bestMeldArrangement(opponentHand).deadwoodValue,
        score: 0,
      });
      return true;
    }
    return false;
  }

  function runOpponentTurn() {
    if (checkStockExhausted()) return;

    const drawSource = botChooseDraw(opponentHand, topDiscard);
    let drawnCard: Card;
    let newStock = stock;
    let newDiscard = discard;

    if (drawSource === "discard" && topDiscard) {
      drawnCard = topDiscard;
      newDiscard = discard.slice(0, -1);
    } else {
      drawnCard = stock[stock.length - 1];
      newStock = stock.slice(0, -1);
    }

    const handWithDraw = [...opponentHand, drawnCard];
    const discardChoice = botChooseDiscard(handWithDraw);
    const finalHand = handWithDraw.filter((c) => cardId(c) !== cardId(discardChoice));
    const arrangement = bestMeldArrangement(finalHand);

    setStock(newStock);

    if (arrangement.deadwoodValue <= 10 && (arrangement.deadwoodValue === 0 || Math.random() > 0.3)) {
      setOpponentHand(finalHand);
      setDiscard([...newDiscard, discardChoice]);
      setResult(scoreKnock("opponent", arrangement, playerHand));
      return;
    }

    setOpponentHand(finalHand);
    setDiscard([...newDiscard, discardChoice]);
    setTurn("player");
    setPhase("draw");
    if (mode === "passplay") setRevealedSide(null);
  }

  function handleDraw(source: "stock" | "discard") {
    if (result || phase !== "draw" || (mode === "ai" && turn !== "player")) return;
    if (mode === "passplay" && revealedSide !== turn) return;
    if (checkStockExhausted()) return;

    const hand = turn === "player" ? playerHand : opponentHand;
    const setHand = turn === "player" ? setPlayerHand : setOpponentHand;

    if (source === "discard") {
      if (!topDiscard) return;
      setHand([...hand, topDiscard]);
      setDiscard((prev) => prev.slice(0, -1));
    } else {
      const card = stock[stock.length - 1];
      setHand([...hand, card]);
      setStock((prev) => prev.slice(0, -1));
    }
    setPhase("discard");
  }

  function handleSelectDiscard(card: Card) {
    if (phase !== "discard" || result) return;
    if (mode === "passplay" && revealedSide !== turn) return;
    setSelectedDiscard((prev) => (prev && cardId(prev) === cardId(card) ? null : card));
  }

  function handleConfirmDiscard() {
    if (!selectedDiscard || result || phase !== "discard" || (mode === "ai" && turn !== "player")) return;
    const hand = turn === "player" ? playerHand : opponentHand;
    const setHand = turn === "player" ? setPlayerHand : setOpponentHand;
    setHand(hand.filter((c) => cardId(c) !== cardId(selectedDiscard)));
    setDiscard((prev) => [...prev, selectedDiscard]);
    setSelectedDiscard(null);
    setPhase("draw");
    const nextTurn: Side = turn === "player" ? "opponent" : "player";
    setTurn(nextTurn);
    if (mode === "passplay") setRevealedSide(null);
  }

  function handleKnock() {
    if (!selectedDiscard || !deadwoodAfterSelected || !canKnock || (mode === "ai" && turn !== "player")) return;
    const hand = turn === "player" ? playerHand : opponentHand;
    const setHand = turn === "player" ? setPlayerHand : setOpponentHand;
    const otherHand = turn === "player" ? opponentHand : playerHand;
    setHand(hand.filter((c) => cardId(c) !== cardId(selectedDiscard)));
    setDiscard((prev) => [...prev, selectedDiscard]);
    setResult(scoreKnock(turn, deadwoodAfterSelected, otherHand));
  }

  function handleShowRewards() {
    if (!result) return;
    processMatchEnd(result.winner === "player", "gin_rummy");
    setShowRewardPopup(true);
  }

  if (result) {
    const youWon = result.winner === "player";
    const isDraw = result.winner === "draw";
    return (
      <>
        <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${
                youWon ? "bg-gradient-to-br from-[rgb(var(--gold))] to-[rgb(var(--gold-bright))] shadow-[0_0_40px_rgb(var(--gold)/30%)]" : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]"
              }`}
            >
              <Sparkles size={40} className={youWon ? "text-[#0F0F0F]" : "text-[rgb(var(--c4))]"} />
            </motion.div>
            <div>
              <h1 className={`text-3xl font-bold ${youWon ? "gold-text-gradient" : "text-[rgb(var(--c4))]"}`}>
                {isDraw ? t("gin_stockRanOut") : youWon ? t("mindi_youWon") : t("mindi_youLost")}
              </h1>
              {!isDraw && (result.gin || result.undercut) && (
                <p className="text-[rgb(var(--gold-ink))] text-sm font-semibold mt-1 uppercase tracking-wide">
                  {result.gin ? t("gin_gin") : t("gin_undercut")}
                </p>
              )}
            </div>
            <div className="glass-card rounded-2xl p-6 max-w-xs mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[rgb(var(--c4))] text-xs">{t("gin_yourDeadwood")}</span>
                <span className="text-[rgb(var(--text-primary))] font-bold">{result.playerDeadwood}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[rgb(var(--c4))] text-xs">{t("gin_opponentDeadwood")}</span>
                <span className="text-[rgb(var(--text-primary))] font-bold">{result.opponentDeadwood}</span>
              </div>
              {!isDraw && (
                <>
                  <div className="h-px bg-[rgb(var(--c3))]" />
                  <div className="flex items-center justify-between">
                    <span className="text-[rgb(var(--c4))] text-xs">{t("gin_points")}</span>
                    <span className="text-[rgb(var(--gold-ink))] font-bold">{result.score}</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 max-w-xs mx-auto">
              <Link href="/play" className="flex-1">
                <motion.button whileTap={{ scale: 0.95 }} className="w-full py-3 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--text-primary))] text-sm font-medium flex items-center justify-center gap-2">
                  <Home size={16} />
                  Exit
                </motion.button>
              </Link>
              {!isDraw && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleShowRewards}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  Rewards
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>
        {!isDraw && (
          <MatchRewardPopup
            isOpen={showRewardPopup}
            onClose={() => setShowRewardPopup(false)}
            isVictory={result.winner === "player"}
            coinsEarned={result.winner === "player" ? 10 : 2}
            trophyChange={0}
            newCoinBalance={0}
          />
        )}
      </>
    );
  }

  if (needsPassScreen) {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6 text-center">
        <Smartphone size={40} className="text-[rgb(var(--gold-ink))] mb-4" />
        <h2 className="text-[rgb(var(--text-primary))] text-xl font-bold mb-2">{t("offline_passDeviceTo")}</h2>
        <p className="text-[rgb(var(--gold-ink))] text-2xl font-bold mb-6">{turn === "player" ? t("offline_player1") : t("offline_player2")}</p>
        <p className="text-[rgb(var(--c4))] text-xs mb-8">{t("offline_hideScreen")}</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setRevealedSide(turn)}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] font-semibold"
        >
          I&apos;m ready — show my hand
        </motion.button>
      </div>
    );
  }

  const activeHand = mode === "passplay" ? (turn === "player" ? sortedPlayerHand : sortHand(opponentHand)) : sortedPlayerHand;
  const isMyTurn = mode === "ai" ? turn === "player" : true;

  // The seat shown at the top: in "ai" mode always the bot; in "passplay"
  // whichever local player isn't currently holding the device.
  const topSide: Side = mode === "ai" ? "opponent" : turn === "player" ? "opponent" : "player";
  const topSeat: ArenaSeatData = {
    uid: topSide,
    name: mode === "ai" ? t("gin_opponent") : topSide === "player" ? t("offline_player1") : t("offline_player2"),
    cardBackId: LOCAL_SIDE_DECK_SKINS[topSide],
    cardCount: (topSide === "player" ? playerHand : opponentHand).length,
    active: !isMyTurn,
  };
  const selfName = mode === "ai" ? user?.displayName ?? t("mindi_you") : turn === "player" ? t("offline_player1") : t("offline_player2");

  return <GinRummyTable hand={activeHand} selected={selectedDiscard} opponent={topSeat}
    name={selfName} avatar={playerStats?.avatarPreset} stock={stock.length} discard={topDiscard}
    phase={phase} myTurn={isMyTurn} canKnock={canKnock} mode={mode === "ai" ? "Casual" : "Pass & Play"}
    tableSkin={economyState.profile.equipped.tableTheme} cardBack={economyState.profile.equipped.cardBack}
    onDraw={handleDraw} onSelect={handleSelectDiscard} onDiscard={handleConfirmDiscard} onKnock={handleKnock}/>;
}
