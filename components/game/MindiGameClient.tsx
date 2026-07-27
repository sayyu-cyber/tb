"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Sparkles, Users, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BOT_NAMES } from "@/constants/ranks";
import { useEconomy } from "@/contexts/EconomyContext";
import MatchRewardPopup from "@/components/rewards/MatchRewardPopup";
import { LeaveMatchButton } from "@/components/game/LeaveMatchButton";
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
  dealMindiHand,
  getLegalPlays,
  resolveTrick,
  isTen,
  checkHandOutcome,
  chooseBotPlay,
  HandOutcome,
} from "@/lib/mindiEngine";

interface MindiGameClientProps {
  /** "ai": you (seat 0) + 3 bots. "passplay": you + a local partner (seats 0 & 2) vs 2 bots. */
  mode: "ai" | "passplay";
}

const SEAT_LABELS_AI = ["You", "West", "Partner", "East"];
const SEAT_LABELS_PASSPLAY = ["Player 1", "West (bot)", "Player 2 (Partner)", "East (bot)"];

function pickBotNames(): string[] {
  const shuffled = [...BOT_NAMES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

export function MindiGameClient({ mode }: MindiGameClientProps) {
  const router = useRouter();
  const { processMatchEnd } = useEconomy();

  const humanSeats: SeatIndex[] = useMemo(() => (mode === "ai" ? [0] : [0, 2]), [mode]);
  const isHuman = useCallback((seat: SeatIndex) => humanSeats.includes(seat), [humanSeats]);
  const seatLabels = mode === "ai" ? SEAT_LABELS_AI : SEAT_LABELS_PASSPLAY;
  const botNamesRef = useRef(pickBotNames());

  const [deal, setDeal] = useState(() => dealMindiHand(3));
  const [hands, setHands] = useState(() => deal.hands);
  const [turnSeat, setTurnSeat] = useState<SeatIndex>(deal.leader);
  const [trick, setTrick] = useState<TrickPlay[]>([]);
  const [tensCaptured, setTensCaptured] = useState<Record<Team, number>>({ A: 0, B: 0 });
  const [tricksWon, setTricksWon] = useState<Record<Team, number>>({ A: 0, B: 0 });
  const [tricksPlayed, setTricksPlayed] = useState(0);
  const [outcome, setOutcome] = useState<HandOutcome | null>(null);
  const [resolvingTrick, setResolvingTrick] = useState(false);
  const [showRewardPopup, setShowRewardPopup] = useState(false);

  // Pass & Play: which human seat is currently allowed to see their hand.
  const [revealedSeat, setRevealedSeat] = useState<SeatIndex | null>(mode === "ai" ? 0 : null);

  const ledSuit = trick.length > 0 ? trick[0].card.suit : null;

  const needsPassScreen =
    mode === "passplay" && isHuman(turnSeat) && !outcome && revealedSeat !== turnSeat;

  // Bot auto-play
  useEffect(() => {
    if (outcome || resolvingTrick) return;
    if (isHuman(turnSeat)) return;

    const timer = setTimeout(() => {
      const hand = hands[turnSeat];
      const card = chooseBotPlay(hand, trick, deal.trumpSuit, turnSeat);
      playCard(turnSeat, card);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 700 + Math.random() * 900);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnSeat, trick, outcome, resolvingTrick]);

  function playCard(seat: SeatIndex, card: Card) {
    setHands((prev) => ({ ...prev, [seat]: prev[seat].filter((c) => cardId(c) !== cardId(card)) }));
    setTrick((prev) => [...prev, { seat, card }]);
    if (trick.length < 3) {
      const upcoming = nextSeat(seat);
      setTurnSeat(upcoming);
      if (mode === "passplay" && isHuman(upcoming)) setRevealedSeat(null);
    }
  }

  // Once all 4 seats have played, pause briefly so everyone can see the
  // trick, then resolve it.
  useEffect(() => {
    if (trick.length !== 4) return;
    setResolvingTrick(true);
    const timer = setTimeout(() => resolveCurrentTrick(trick), 1100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trick.length]);

  function resolveCurrentTrick(plays: TrickPlay[]) {
    const winnerSeat = resolveTrick(plays, deal.trumpSuit);
    const winnerTeam = teamOf(winnerSeat);
    const tensInTrick = plays.filter((p) => isTen(p.card)).length;

    const newTens = { ...tensCaptured, [winnerTeam]: tensCaptured[winnerTeam] + tensInTrick };
    const newTricks = { ...tricksWon, [winnerTeam]: tricksWon[winnerTeam] + 1 };
    const newTricksPlayed = tricksPlayed + 1;

    setTensCaptured(newTens);
    setTricksWon(newTricks);
    setTricksPlayed(newTricksPlayed);
    setTrick([]);
    setResolvingTrick(false);

    const result = checkHandOutcome(newTens, newTricks, newTricksPlayed);
    if (result) {
      setOutcome(result);
    } else {
      setTurnSeat(winnerSeat);
      if (mode === "passplay" && isHuman(winnerSeat)) setRevealedSeat(null);
    }
  }

  function handleCardSelect(card: Card) {
    if (outcome || resolvingTrick) return;
    if (!isHuman(turnSeat)) return;
    if (mode === "passplay" && revealedSeat !== turnSeat) return;

    const legal = getLegalPlays(hands[turnSeat], ledSuit);
    if (!legal.some((c) => cardId(c) === cardId(card))) return;

    playCard(turnSeat, card);
  }

  function startNewHand() {
    const newDeal = dealMindiHand(3);
    botNamesRef.current = pickBotNames();
    setDeal(newDeal);
    setHands(newDeal.hands);
    setTurnSeat(newDeal.leader);
    setTrick([]);
    setTensCaptured({ A: 0, B: 0 });
    setTricksWon({ A: 0, B: 0 });
    setTricksPlayed(0);
    setOutcome(null);
    setRevealedSeat(mode === "ai" ? 0 : null);
  }

  function handleShowRewards() {
    const isVictory = outcome?.winner === "A";
    processMatchEnd(!!isVictory, "mindi");
    setShowRewardPopup(true);
  }

  const yourHand = hands[0] ?? [];
  const legalForYou = isHuman(turnSeat) ? getLegalPlays(hands[turnSeat], ledSuit) : [];

  if (outcome) {
    const youWon = outcome.winner === "A";
    return (
      <>
        <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${
                youWon
                  ? "bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] shadow-[0_0_40px_rgba(212,175,55,0.3)]"
                  : "bg-[#1A1A1A] border border-[#2A2A2A]"
              }`}
            >
              <Sparkles size={40} className={youWon ? "text-[#0F0F0F]" : "text-[#3A3A3A]"} />
            </motion.div>

            <div>
              <h1 className={`text-3xl font-bold ${youWon ? "gold-text-gradient" : "text-[#3A3A3A]"}`}>
                {youWon ? "You Won!" : "You Lost"}
              </h1>
              {outcome.special && (
                <p className="text-[#D4AF37] text-sm font-semibold mt-1 uppercase tracking-wide">
                  {outcome.special === "baga" ? "Baga — all 4 Tens!" : "Hukunbunye — clean sweep!"}
                </p>
              )}
            </div>

            <div className="glass-card rounded-2xl p-6 max-w-xs mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#3A3A3A] text-xs">Your team — Tens</span>
                <span className="text-white font-bold">{outcome.tensCaptured.A} / 4</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#3A3A3A] text-xs">Opponents — Tens</span>
                <span className="text-white font-bold">{outcome.tensCaptured.B} / 4</span>
              </div>
              <div className="h-px bg-[#2A2A2A]" />
              <div className="flex items-center justify-between">
                <span className="text-[#3A3A3A] text-xs">Your team — Tricks</span>
                <span className="text-white font-bold">{outcome.tricksWon.A}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#3A3A3A] text-xs">Opponents — Tricks</span>
                <span className="text-white font-bold">{outcome.tricksWon.B}</span>
              </div>
            </div>

            <div className="flex gap-3 max-w-xs mx-auto">
              <Link href="/play" className="flex-1">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="w-full py-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-white text-sm font-medium flex items-center justify-center gap-2"
                >
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
          isVictory={outcome.winner === "A"}
          coinsEarned={outcome.winner === "A" ? 10 : 2}
          trophyChange={outcome.winner === "A" ? 15 : -5}
          newCoinBalance={0}
        />
      </>
    );
  }

  if (needsPassScreen) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-6 text-center">
        <Smartphone size={40} className="text-[#D4AF37] mb-4" />
        <h2 className="text-white text-xl font-bold mb-2">Pass the device to</h2>
        <p className="text-[#D4AF37] text-2xl font-bold mb-6">{seatLabels[turnSeat]}</p>
        <p className="text-[#3A3A3A] text-xs mb-8">Make sure no one else can see the screen</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setRevealedSeat(turnSeat)}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F] font-semibold"
        >
          I&apos;m ready — show my hand
        </motion.button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <LeaveMatchButton exitHref="/play" isOnlineMatch={false} />
        <div className="text-center">
          <p className="text-white text-sm font-semibold">Mindi — Casual</p>
          <p className="text-[#3A3A3A] text-[10px] flex items-center justify-center gap-1">
            Trump: <span className={SUIT_COLOR[deal.trumpSuit] === "red" ? "text-red-400" : "text-white"}>{SUIT_SYMBOLS[deal.trumpSuit]}</span>
          </p>
        </div>
        <div className="w-10" />
      </div>

      {/* Score strip */}
      <div className="px-4 py-2">
        <div className="glass-card rounded-2xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-[#D4AF37]" />
            <span className="text-white font-medium">Your team</span>
            <span className="text-[#D4AF37] font-bold">{tensCaptured.A} tens</span>
            <span className="text-[#3A3A3A]">· {tricksWon.A} tricks</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#3A3A3A]">{tricksWon.B} tricks ·</span>
            <span className="text-[#D4AF37] font-bold">{tensCaptured.B} tens</span>
            <span className="text-white font-medium">Opponents</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 flex flex-col items-center justify-between py-4 px-4">
        <SeatBadge
          name={mode === "ai" ? botNamesRef.current[2] : seatLabels[2]}
          cardCount={hands[2].length}
          active={turnSeat === 2 && !resolvingTrick}
          isPartner
        />

        <div className="flex items-center justify-between w-full max-w-sm">
          <SeatBadge
            name={mode === "ai" ? botNamesRef.current[1] : seatLabels[1]}
            cardCount={hands[1].length}
            active={turnSeat === 1 && !resolvingTrick}
          />

          {/* Trick area */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            <AnimatePresence>
              {trick.map((play) => (
                <motion.div
                  key={cardId(play.card)}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute"
                  style={seatOffset(play.seat)}
                >
                  <MiniCard card={play.card} trumpSuit={deal.trumpSuit} />
                </motion.div>
              ))}
            </AnimatePresence>
            {trick.length === 0 && (
              <span className="text-[#2A2A2A] text-xs">
                {resolvingTrick ? "" : `${seatLabels[turnSeat]}'s turn`}
              </span>
            )}
          </div>

          <SeatBadge
            name={mode === "ai" ? botNamesRef.current[3] : seatLabels[3]}
            cardCount={hands[3].length}
            active={turnSeat === 3 && !resolvingTrick}
          />
        </div>

        {/* Your hand */}
        <div className="w-full">
          <p className="text-[#3A3A3A] text-xs mb-2 text-center">
            {isHuman(turnSeat) && (mode === "ai" || revealedSeat === turnSeat)
              ? "Select a card to play"
              : `Waiting for ${seatLabels[turnSeat]}…`}
          </p>
          <div className="flex justify-center gap-1.5 flex-wrap">
            {(mode === "ai" ? yourHand : hands[turnSeat] ?? []).map((card) => {
              const canPlay =
                isHuman(turnSeat) &&
                (mode === "ai" || revealedSeat === turnSeat) &&
                !resolvingTrick &&
                legalForYou.some((c) => cardId(c) === cardId(card));
              return (
                <motion.button
                  key={cardId(card)}
                  whileHover={canPlay ? { y: -8, scale: 1.05 } : {}}
                  whileTap={canPlay ? { scale: 0.95 } : {}}
                  onClick={() => canPlay && handleCardSelect(card)}
                  disabled={!canPlay}
                  className="w-12 h-16 rounded-lg bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] border border-[#D4AF37]/30 flex flex-col items-center justify-center disabled:opacity-40 disabled:border-[#2A2A2A]"
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
        </div>
      </div>
    </div>
  );
}

function seatOffset(seat: SeatIndex): React.CSSProperties {
  switch (seat) {
    case 0:
      return { bottom: 0 };
    case 2:
      return { top: 0 };
    case 1:
      return { left: 0 };
    case 3:
      return { right: 0 };
  }
}

function MiniCard({ card, trumpSuit }: { card: Card; trumpSuit: Card["suit"] }) {
  const isTrump = card.suit === trumpSuit;
  return (
    <div
      className={`w-10 h-14 rounded-md flex flex-col items-center justify-center border ${
        isTrump ? "bg-[#D4AF37]/10 border-[#D4AF37]/60" : "bg-[#1A1A1A] border-[#2A2A2A]"
      }`}
    >
      <span className={`text-xs font-bold ${SUIT_COLOR[card.suit] === "red" ? "text-red-400" : "text-white"}`}>
        {rankLabel(card.rank)}
      </span>
      <span className={`text-[10px] ${SUIT_COLOR[card.suit] === "red" ? "text-red-400" : "text-white"}`}>
        {SUIT_SYMBOLS[card.suit]}
      </span>
    </div>
  );
}

function SeatBadge({
  name,
  cardCount,
  active,
  isPartner,
}: {
  name: string;
  cardCount: number;
  active: boolean;
  isPartner?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-colors ${
        active ? "border-[#D4AF37] bg-[#D4AF37]/10" : "border-[#2A2A2A] bg-[#1A1A1A]"
      }`}
    >
      <span className={`text-[10px] font-medium ${active ? "text-[#D4AF37]" : "text-[#888888]"}`}>
        {name} {isPartner ? "· Partner" : ""}
      </span>
      <span className="text-[#3A3A3A] text-[10px]">{cardCount} cards</span>
    </div>
  );
}
