"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Home, Sparkles, Layers, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEconomy } from "@/contexts/EconomyContext";
import MatchRewardPopup from "@/components/rewards/MatchRewardPopup";
import {
  Card,
  cardId,
  rankLabel,
  SUIT_SYMBOLS,
  SUIT_COLOR,
  dealGinHand,
  bestMeldArrangement,
  scoreKnock,
  botChooseDraw,
  botChooseDiscard,
  GinHandResult,
} from "@/lib/ginRummyEngine";

interface GinRummyGameClientProps {
  /** "ai": you vs a bot. "passplay": two local players alternating with a pass-the-device screen. */
  mode: "ai" | "passplay";
}

type Side = "player" | "opponent";
type Phase = "draw" | "discard";

export function GinRummyGameClient({ mode }: GinRummyGameClientProps) {
  const { processMatchEnd } = useEconomy();
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
  const sortedPlayerHand = useMemo(
    () => [...playerHand].sort((a, b) => (a.suit === b.suit ? a.rank - b.rank : a.suit.localeCompare(b.suit))),
    [playerHand]
  );

  const currentArrangement = useMemo(() => bestMeldArrangement(playerHand), [playerHand]);
  const deadwoodAfterSelected = useMemo(() => {
    if (!selectedDiscard) return null;
    const rest = playerHand.filter((c) => cardId(c) !== cardId(selectedDiscard));
    return bestMeldArrangement(rest);
  }, [playerHand, selectedDiscard]);

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
    if (result || phase !== "draw") return;
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
    if (!selectedDiscard) return;
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
    if (!selectedDiscard || !deadwoodAfterSelected) return;
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
        <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-6">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${
                youWon ? "bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] shadow-[0_0_40px_rgba(212,175,55,0.3)]" : "bg-[#1A1A1A] border border-[#2A2A2A]"
              }`}
            >
              <Sparkles size={40} className={youWon ? "text-[#0F0F0F]" : "text-[#3A3A3A]"} />
            </motion.div>
            <div>
              <h1 className={`text-3xl font-bold ${youWon ? "gold-text-gradient" : "text-[#3A3A3A]"}`}>
                {isDraw ? "Stock Ran Out — Draw" : youWon ? "You Won!" : "You Lost"}
              </h1>
              {!isDraw && (result.gin || result.undercut) && (
                <p className="text-[#D4AF37] text-sm font-semibold mt-1 uppercase tracking-wide">
                  {result.gin ? "Gin!" : "Undercut!"}
                </p>
              )}
            </div>
            <div className="glass-card rounded-2xl p-6 max-w-xs mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#3A3A3A] text-xs">Your deadwood</span>
                <span className="text-white font-bold">{result.playerDeadwood}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#3A3A3A] text-xs">Opponent deadwood</span>
                <span className="text-white font-bold">{result.opponentDeadwood}</span>
              </div>
              {!isDraw && (
                <>
                  <div className="h-px bg-[#2A2A2A]" />
                  <div className="flex items-center justify-between">
                    <span className="text-[#3A3A3A] text-xs">Points</span>
                    <span className="text-[#D4AF37] font-bold">{result.score}</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 max-w-xs mx-auto">
              <Link href="/play" className="flex-1">
                <motion.button whileTap={{ scale: 0.95 }} className="w-full py-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-white text-sm font-medium flex items-center justify-center gap-2">
                  <Home size={16} />
                  Exit
                </motion.button>
              </Link>
              {!isDraw && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleShowRewards}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F] text-sm font-semibold flex items-center justify-center gap-2"
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
            trophyChange={result.winner === "player" ? 15 : -5}
            newCoinBalance={0}
          />
        )}
      </>
    );
  }

  if (needsPassScreen) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-6 text-center">
        <Smartphone size={40} className="text-[#D4AF37] mb-4" />
        <h2 className="text-white text-xl font-bold mb-2">Pass the device to</h2>
        <p className="text-[#D4AF37] text-2xl font-bold mb-6">{turn === "player" ? "Player 1" : "Player 2"}</p>
        <p className="text-[#3A3A3A] text-xs mb-8">Make sure no one else can see the screen</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setRevealedSide(turn)}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F] font-semibold"
        >
          I&apos;m ready — show my hand
        </motion.button>
      </div>
    );
  }

  const activeHand = mode === "passplay" ? (turn === "player" ? sortedPlayerHand : [...opponentHand].sort((a, b) => (a.suit === b.suit ? a.rank - b.rank : a.suit.localeCompare(b.suit)))) : sortedPlayerHand;
  const isMyTurn = mode === "ai" ? turn === "player" : true;
  const deadwoodShown = mode === "passplay" ? bestMeldArrangement(turn === "player" ? playerHand : opponentHand).deadwoodValue : currentArrangement.deadwoodValue;

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <Link href="/play">
          <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A]">
            <ArrowLeft size={20} className="text-[#D4AF37]" />
          </motion.button>
        </Link>
        <div className="text-center">
          <p className="text-white text-sm font-semibold">Gin Rummy — Casual</p>
          <p className="text-[#3A3A3A] text-[10px]">
            {isMyTurn ? "Your turn" : "Opponent's turn"} · Deadwood: {deadwoodShown}
          </p>
        </div>
        <div className="w-10" />
      </div>

      {/* Stock + discard */}
      <div className="flex items-center justify-center gap-8 py-6">
        <button
          onClick={() => handleDraw("stock")}
          disabled={phase !== "draw" || !isMyTurn || stock.length <= 2}
          className="flex flex-col items-center gap-1 disabled:opacity-40"
        >
          <div className="w-16 h-24 rounded-xl bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] border border-[#2A2A2A] flex items-center justify-center">
            <Layers size={20} className="text-[#3A3A3A]" />
          </div>
          <span className="text-[10px] text-[#3A3A3A]">Stock ({stock.length})</span>
        </button>

        <button
          onClick={() => handleDraw("discard")}
          disabled={phase !== "draw" || !isMyTurn || !topDiscard}
          className="flex flex-col items-center gap-1 disabled:opacity-40"
        >
          {topDiscard ? (
            <div className="w-16 h-24 rounded-xl bg-[#1A1A1A] border border-[#D4AF37]/40 flex flex-col items-center justify-center">
              <span className={`text-lg font-bold ${SUIT_COLOR[topDiscard.suit] === "red" ? "text-red-400" : "text-white"}`}>
                {rankLabel(topDiscard.rank)}
              </span>
              <span className={`text-sm ${SUIT_COLOR[topDiscard.suit] === "red" ? "text-red-400" : "text-white"}`}>
                {SUIT_SYMBOLS[topDiscard.suit]}
              </span>
            </div>
          ) : (
            <div className="w-16 h-24 rounded-xl border border-dashed border-[#2A2A2A]" />
          )}
          <span className="text-[10px] text-[#3A3A3A]">Discard pile</span>
        </button>
      </div>

      {/* Hand */}
      <div className="flex-1 flex flex-col justify-end px-4 pb-6">
        <p className="text-[#3A3A3A] text-xs mb-3 text-center">
          {!isMyTurn ? "Waiting for opponent…" : phase === "draw" ? "Draw a card" : "Select a card to discard"}
        </p>
        <div className="flex justify-center gap-1.5 flex-wrap">
          {activeHand.map((card) => {
            const selected = selectedDiscard && cardId(selectedDiscard) === cardId(card);
            return (
              <motion.button
                key={cardId(card)}
                whileHover={isMyTurn && phase === "discard" ? { y: -8 } : {}}
                whileTap={isMyTurn && phase === "discard" ? { scale: 0.95 } : {}}
                onClick={() => isMyTurn && handleSelectDiscard(card)}
                disabled={!isMyTurn || phase !== "discard"}
                className={`w-11 h-16 rounded-lg border flex flex-col items-center justify-center disabled:opacity-70 ${
                  selected ? "bg-[#D4AF37]/20 border-[#D4AF37] -translate-y-2" : "bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] border-[#2A2A2A]"
                }`}
              >
                <span className={`text-sm font-bold ${SUIT_COLOR[card.suit] === "red" ? "text-red-400" : "text-[#D4AF37]"}`}>
                  {rankLabel(card.rank)}
                </span>
                <span className={`text-xs ${SUIT_COLOR[card.suit] === "red" ? "text-red-400" : "text-[#D4AF37]"}`}>
                  {SUIT_SYMBOLS[card.suit]}
                </span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {selectedDiscard && phase === "discard" && isMyTurn && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex justify-center gap-3 mt-4"
            >
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleConfirmDiscard}
                className="px-6 py-2.5 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-white text-sm font-medium"
              >
                Discard
              </motion.button>
              {canKnock && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleKnock}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F] text-sm font-semibold"
                >
                  Knock
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
