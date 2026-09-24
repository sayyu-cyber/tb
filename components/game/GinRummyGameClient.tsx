"use client";
import { GinRummyTable } from "./GinRummyTable";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";
import { useEconomy } from "@/contexts/EconomyContext";
import {
  Card,
  cardId,
  rankLabel,
  dealGinHand,
  findGinLayout,
  replenishStock,
  randomDiscard,
  scoreGin,
  botChooseDraw,
  botChooseDiscard,
  GinHandResult,
  TURN_SECONDS,
} from "@/lib/ginRummyEngine";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { sortHand } from "@/lib/cardSort";
import { ArenaSeatData } from "@/components/game/GameArena";
import { GinResultScreen } from "./GinResultScreen";
import { MindiDealIntro } from "./MindiDealIntro";
import { cutForFirstPlay } from "@/lib/openingCut";
import type { FirstPlayerDraw, SeatIndex } from "@/lib/mindiEngine";

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

/** How long the winning card sits on the table before the result screen. */
const LAST_CARD_MS = 1700;

export function GinRummyGameClient({ mode }: GinRummyGameClientProps) {
  const [round, setRound] = useState(0);
  return <GinRummyHand key={`${mode}-${round}`} mode={mode} onReplay={() => setRound(value => value + 1)} />;
}

function GinRummyHand({ mode, onReplay }: GinRummyGameClientProps & { onReplay: () => void }) {
  const { processMatchEnd, state: economyState } = useEconomy();
  const { playerStats, user } = useAuth();
  const t = useTranslation();
  const rewardApplied = useRef(false);

  // The cut decides who plays first, so it happens before anything else and
  // its winner becomes the opening turn. Seats 0 and 1 are the player and the
  // opponent - the ceremony is seat-indexed because it is shared with Mindi.
  const [cut] = useState(() => cutForFirstPlay<SeatIndex>([0, 1]));
  const [introDone, setIntroDone] = useState(false);

  const [initialDeal] = useState(() => dealGinHand());
  const [playerHand, setPlayerHand] = useState<Card[]>(() => initialDeal.playerHand);
  const [opponentHand, setOpponentHand] = useState<Card[]>(() => initialDeal.opponentHand);
  const [stock, setStock] = useState<Card[]>(() => initialDeal.stock);
  const [discard, setDiscard] = useState<Card[]>(() => initialDeal.discard);
  const [reshuffles, setReshuffles] = useState(0);

  const [turn, setTurn] = useState<Side>(() => (cut.winner === 0 ? "player" : "opponent"));
  const [phase, setPhase] = useState<Phase>("draw");
  const [selectedDiscard, setSelectedDiscard] = useState<Card | null>(null);
  const [result, setResult] = useState<GinHandResult | null>(null);
  // Held back so the winning discard can be seen landing before the screen
  // changes; `result` is the engine's truth the moment the hand is decided.
  const [resultReady, setResultReady] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);

  // Pass & Play: whose turn is currently revealed on screen.
  const [revealedSide, setRevealedSide] = useState<Side | null>(mode === "ai" ? "player" : null);

  // The ceremony comes first in Pass & Play too, or the "pass the device"
  // screen would cover the cut both players are meant to watch.
  const needsPassScreen = introDone && mode === "passplay" && !result && revealedSide !== turn;
  const topDiscard = discard.length > 0 ? discard[discard.length - 1] : null;
  const sortedPlayerHand = useMemo(() => sortHand(playerHand), [playerHand]);

  /** Applies a completed turn, ending the hand if the kept ten cards win. */
  const finishTurn = useCallback((side: Side, kept: Card[], nextStock: Card[], nextDiscard: Card[]) => {
    const setHand = side === "player" ? setPlayerHand : setOpponentHand;
    setHand(kept);
    setStock(nextStock);
    setDiscard(nextDiscard);
    setSelectedDiscard(null);

    const layout = findGinLayout(kept);
    if (layout) {
      const loserHand = side === "player" ? opponentHand : playerHand;
      setResult(scoreGin(side, layout, loserHand));
      setDeadline(null);
      return;
    }
    setPhase("draw");
    setTurn(side === "player" ? "opponent" : "player");
    if (mode === "passplay") setRevealedSide(null);
  }, [mode, opponentHand, playerHand]);

  /**
   * Refills the stock from the discard pile when it runs dry. There is no
   * knocking in this game, so a hand ends only when somebody melds 4+3+3 -
   * which means the deck has to keep circulating rather than the hand being
   * declared over.
   */
  const draw = useCallback((source: "stock" | "discard") => {
    let nextStock = stock, nextDiscard = discard;
    if (source === "discard" && nextDiscard.length > 0) {
      return { card: nextDiscard[nextDiscard.length - 1], stock: nextStock, discard: nextDiscard.slice(0, -1) };
    }
    if (nextStock.length === 0) {
      const refilled = replenishStock(nextStock, nextDiscard);
      if (refilled.stock.length === 0) return null;
      nextStock = refilled.stock; nextDiscard = refilled.discard;
      setReshuffles(count => count + 1);
    }
    return { card: nextStock[nextStock.length - 1], stock: nextStock.slice(0, -1), discard: nextDiscard };
  }, [stock, discard]);

  // Bot turn. Nothing moves while the cut and deal are on screen, or the bot
  // would take its turn behind the ceremony.
  useEffect(() => {
    if (!introDone || result || turn !== "opponent" || mode === "passplay") return;
    const timer = setTimeout(() => {
      const drawn = draw(botChooseDraw(opponentHand, topDiscard));
      if (!drawn) return;
      const withDraw = [...opponentHand, drawn.card];
      const thrown = botChooseDiscard(withDraw);
      finishTurn("opponent", withDraw.filter(c => cardId(c) !== cardId(thrown)), drawn.stock, [...drawn.discard, thrown]);
    }, 900);
    return () => clearTimeout(timer);
  }, [introDone, turn, result, mode, opponentHand, topDiscard, draw, finishTurn]);

  // One 15-second clock per turn, covering draw and discard together. It is
  // keyed on the turn, not the phase, so discarding does not reset it, and it
  // does not start until the ceremony is off screen - otherwise the first
  // player would lose most of their turn watching the deal.
  const onClock = introDone && !result && (mode === "passplay" ? revealedSide === turn : turn === "player");
  useEffect(() => {
    if (!onClock) { setDeadline(null); return; }
    setDeadline(Date.now() + TURN_SECONDS * 1000);
  }, [turn, onClock]);

  // Timeout: play out whatever is left of the turn with a random card.
  useEffect(() => {
    if (!deadline || !onClock) return;
    const timer = setTimeout(() => {
      const side = turn;
      const hand = side === "player" ? playerHand : opponentHand;
      let working = hand, nextStock = stock, nextDiscard = discard;
      if (phase === "draw") {
        const drawn = draw("stock");
        if (!drawn) return;
        working = [...hand, drawn.card]; nextStock = drawn.stock; nextDiscard = drawn.discard;
      }
      const thrown = randomDiscard(working);
      finishTurn(side, working.filter(c => cardId(c) !== cardId(thrown)), nextStock, [...nextDiscard, thrown]);
    }, Math.max(0, deadline - Date.now()));
    return () => clearTimeout(timer);
  }, [deadline, onClock, turn, phase, playerHand, opponentHand, stock, discard, draw, finishTurn]);

  // Let the last card land before the result screen takes over.
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => setResultReady(true), LAST_CARD_MS);
    return () => clearTimeout(timer);
  }, [result]);

  useEffect(() => {
    if (!result || rewardApplied.current) return;
    rewardApplied.current = true;
    processMatchEnd(result.winner === "player", "gin_rummy");
  }, [result, processMatchEnd]);

  function handleDraw(source: "stock" | "discard") {
    if (result || phase !== "draw" || (mode === "ai" && turn !== "player")) return;
    if (mode === "passplay" && revealedSide !== turn) return;
    const hand = turn === "player" ? playerHand : opponentHand;
    const setHand = turn === "player" ? setPlayerHand : setOpponentHand;
    const drawn = draw(source);
    if (!drawn) return;
    setHand([...hand, drawn.card]);
    setStock(drawn.stock);
    setDiscard(drawn.discard);
    setPhase("discard");
  }

  function handleSelectDiscard(card: Card) {
    if (phase !== "discard" || result) return;
    if (mode === "passplay" && revealedSide !== turn) return;
    setSelectedDiscard(prev => (prev && cardId(prev) === cardId(card) ? null : card));
  }

  function handleConfirmDiscard() {
    if (!selectedDiscard || result || phase !== "discard" || (mode === "ai" && turn !== "player")) return;
    if (mode === "passplay" && revealedSide !== turn) return;
    const hand = turn === "player" ? playerHand : opponentHand;
    if (!hand.some(card => cardId(card) === cardId(selectedDiscard))) return;
    finishTurn(turn, hand.filter(c => cardId(c) !== cardId(selectedDiscard)), stock, [...discard, selectedDiscard]);
  }

  if (result && resultReady) {
    const youWon = result.winner === "player";
    return <GinResultScreen result={result} youWon={youWon}
      coins={youWon ? 10 : 2} balance={economyState.economy.coins}
      onContinue={onReplay} />;
  }

  if (needsPassScreen) {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6 text-center">
        <Smartphone size={40} className="text-[rgb(var(--gold-ink))] mb-4" />
        <h2 className="text-[rgb(var(--text-primary))] text-xl font-bold mb-2">{t("offline_passDeviceTo")}</h2>
        <p className="text-[rgb(var(--gold-ink))] text-2xl font-bold mb-6">{turn === "player" ? t("offline_player1") : t("offline_player2")}</p>
        <p className="text-[rgb(var(--c4))] text-xs mb-8">{t("offline_hideScreen")}</p>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setRevealedSide(turn)}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] font-semibold">
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
    cardBackId: topSide === "player" ? economyState.profile.equipped.cardBack : LOCAL_SIDE_DECK_SKINS[topSide],
    cardCount: (topSide === "player" ? playerHand : opponentHand).length,
    active: !isMyTurn,
  };
  const selfName = mode === "ai" ? user?.displayName ?? t("mindi_you") : turn === "player" ? t("offline_player1") : t("offline_player2");

  // Seat 0 is always the local player, so they read on the left of the cut.
  const cutNames: Record<SeatIndex, string> = {
    0: mode === "ai" ? user?.displayName ?? t("mindi_you") : t("offline_player1"),
    1: mode === "ai" ? t("gin_opponent") : t("offline_player2"),
    2: "", 3: "",
  };

  // The ceremony replaces the table rather than sitting on top of it. Rendered
  // together, the table paints first and the dialog only opens on the effect
  // after it, so the player sees the table flash before the cut.
  if (!introDone) {
    return <MindiDealIntro game="gin" draw={cut as FirstPlayerDraw} names={cutNames}
      seats={[0, 1]} viewer={0} handSize={10}
      cardBacks={{ 0: economyState.profile.equipped.cardBack, 1: LOCAL_SIDE_DECK_SKINS.opponent }}
      tableSkin={economyState.profile.equipped.tableTheme} onDone={() => setIntroDone(true)} />;
  }

  return <>
    {/* The winning card, held on screen before the result takes over. */}
    {result && !resultReady && topDiscard && (
      <div className="gin-last-card" role="status">
        <motion.div initial={{ scale: 0.4, y: -120, rotate: -14, opacity: 0 }} animate={{ scale: 1, y: 0, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 170, damping: 16 }}>
          <span>{rankLabel(topDiscard.rank)}{topDiscard.suit === "H" ? "♥" : topDiscard.suit === "D" ? "♦" : topDiscard.suit === "C" ? "♣" : "♠"}</span>
        </motion.div>
        <p>{result.winner === "player" ? "You went out" : `${topSeat.name} went out`}</p>
      </div>
    )}
    <GinRummyTable hand={activeHand} selected={selectedDiscard} opponent={topSeat}
      name={selfName} avatar={playerStats?.avatarPreset} stock={stock.length} discard={topDiscard}
      phase={phase} myTurn={isMyTurn} mode={mode === "ai" ? "Casual" : "Pass & Play"}
      deadline={deadline} reshuffles={reshuffles}
      tableSkin={economyState.profile.equipped.tableTheme} cardBack={economyState.profile.equipped.cardBack}
      onDraw={handleDraw} onSelect={handleSelectDiscard} onDiscard={handleConfirmDiscard} />
  </>;
}
