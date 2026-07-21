"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, User, User2, Crown } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface GameState {
  p1Score: number;
  p2Score: number;
  currentPlayer: 1 | 2;
  round: number;
  maxRounds: number;
  gameOver: boolean;
  winner: 1 | 2 | null;
}

export default function PassPlayPage() {
  const params = useParams();
  const gameId = params.game as string;

  const [gameState, setGameState] = useState<GameState>({
    p1Score: 0,
    p2Score: 0,
    currentPlayer: 1,
    round: 1,
    maxRounds: 5,
    gameOver: false,
    winner: null,
  });

  const [p1Cards, setP1Cards] = useState<number[]>([]);
  const [p2Cards, setP2Cards] = useState<number[]>([]);
  const [playedCards, setPlayedCards] = useState<{p1: number | null, p2: number | null}>({p1: null, p2: null});
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [showPassDevice, setShowPassDevice] = useState(false);

  useEffect(() => {
    const cards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setP1Cards(shuffled.slice(0, 5));
    setP2Cards(shuffled.slice(5, 10));
  }, []);

  const handleCardSelect = (card: number) => {
    if (gameState.gameOver) return;

    const isP1 = gameState.currentPlayer === 1;
    setSelectedCard(card);

    if (isP1) {
      setPlayedCards(prev => ({ ...prev, p1: card }));
      setP1Cards(prev => prev.filter(c => c !== card));
      setShowPassDevice(true);
    } else {
      setPlayedCards(prev => ({ ...prev, p2: card }));
      setP2Cards(prev => prev.filter(c => c !== card));

      // Resolve round
      setTimeout(() => {
        setGameState(prev => {
          const p1Won = (playedCards.p1 || 0) > card;
          const newP1Score = p1Won ? prev.p1Score + 1 : prev.p1Score;
          const newP2Score = !p1Won ? prev.p2Score + 1 : prev.p2Score;
          const newRound = prev.round + 1;
          const isOver = newRound > prev.maxRounds;

          return {
            ...prev,
            p1Score: newP1Score,
            p2Score: newP2Score,
            round: newRound,
            currentPlayer: 1,
            gameOver: isOver,
            winner: isOver ? (newP1Score > newP2Score ? 1 : 2) : null,
          };
        });
        setSelectedCard(null);
        setPlayedCards({ p1: null, p2: null });
      }, 1000);
    }
  };

  const handlePassComplete = () => {
    setShowPassDevice(false);
    setGameState(prev => ({ ...prev, currentPlayer: 2 }));
  };

  if (gameState.gameOver) {
    return (
      <GameOverScreen 
        winner={gameState.winner}
        p1Score={gameState.p1Score}
        p2Score={gameState.p2Score}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <Link href="/play">
          <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A]">
            <ArrowLeft size={20} className="text-[#D4AF37]" />
          </motion.button>
        </Link>
        <div className="text-center">
          <p className="text-white text-sm font-semibold capitalize">{gameId} — Pass & Play</p>
          <p className="text-[#3A3A3A] text-[10px]">Offline Multiplayer</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Score Board */}
      <div className="px-4 py-3">
        <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
          <div className={`flex items-center gap-3 ${gameState.currentPlayer === 1 ? "opacity-100" : "opacity-50"}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8962E] flex items-center justify-center">
              <User size={18} className="text-[#0F0F0F]" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Player 1</p>
              <p className="text-[#D4AF37] text-lg font-bold">{gameState.p1Score}</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[#3A3A3A] text-xs">Round {gameState.round}/{gameState.maxRounds}</p>
            {gameState.currentPlayer === 1 ? (
              <p className="text-[#D4AF37] text-[10px] mt-1">P1 Turn</p>
            ) : (
              <p className="text-[#3A3A3A] text-[10px] mt-1">P2 Turn</p>
            )}
          </div>

          <div className={`flex items-center gap-3 ${gameState.currentPlayer === 2 ? "opacity-100" : "opacity-50"}`}>
            <div className="text-right">
              <p className="text-white text-sm font-medium">Player 2</p>
              <p className="text-[#D4AF37] text-lg font-bold">{gameState.p2Score}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center">
              <User2 size={18} className="text-[#3A3A3A]" />
            </div>
          </div>
        </div>
      </div>

      {/* Pass Device Overlay */}
      <AnimatePresence>
        {showPassDevice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0F0F0F]/95 flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-center space-y-6"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <SmartphoneIcon />
              </motion.div>
              <h2 className="text-2xl font-bold text-white">Pass the Device</h2>
              <p className="text-[#3A3A3A] text-sm">Player 2, it&apos;s your turn!</p>
              <p className="text-[#2A2A2A] text-xs">Don&apos;t let Player 1 see your cards</p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handlePassComplete}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F] font-semibold"
              >
                I&apos;m Player 2 — Continue
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Played Cards */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="flex items-center gap-8">
          <motion.div
            animate={playedCards.p1 ? { scale: [0.5, 1.1, 1] } : {}}
            className="w-20 h-28 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B8962E]/10 border border-[#D4AF37]/30 flex items-center justify-center"
          >
            {playedCards.p1 ? (
              <span className="text-2xl text-[#D4AF37] font-bold">{playedCards.p1}</span>
            ) : (
              <span className="text-[#2A2A2A] text-xs">P1</span>
            )}
          </motion.div>

          <div className="text-[#3A3A3A] text-xs font-bold">VS</div>

          <motion.div
            animate={playedCards.p2 ? { scale: [0.5, 1.1, 1] } : {}}
            className="w-20 h-28 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center"
          >
            {playedCards.p2 ? (
              <span className="text-2xl text-white font-bold">{playedCards.p2}</span>
            ) : (
              <span className="text-[#2A2A2A] text-xs">P2</span>
            )}
          </motion.div>
        </div>
      </div>

      {/* Current Player Cards */}
      <div className="px-4 pb-6">
        <p className="text-[#3A3A3A] text-xs mb-3 text-center">
          {gameState.currentPlayer === 1 ? "Player 1 — Select a card" : "Waiting for Player 2..."}
        </p>
        <div className="flex justify-center gap-3">
          {(gameState.currentPlayer === 1 ? p1Cards : p2Cards).map((card, index) => (
            <motion.button
              key={`${card}-${index}`}
              whileHover={{ y: -8, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCardSelect(card)}
              disabled={gameState.currentPlayer === 2}
              className={`w-14 h-20 rounded-xl border flex items-center justify-center disabled:opacity-50 ${
                gameState.currentPlayer === 1
                  ? "bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] border-[#D4AF37]/30"
                  : "bg-[#1A1A1A] border-[#2A2A2A]"
              }`}
            >
              <span className={`text-lg font-bold ${
                gameState.currentPlayer === 1 ? "text-[#D4AF37]" : "text-[#3A3A3A]"
              }`}>
                {card}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

function GameOverScreen({ winner, p1Score, p2Score }: { winner: 1 | 2 | null; p1Score: number; p2Score: number }) {
  return (
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
          className="w-24 h-24 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.3)]"
        >
          <Crown size={40} className="text-[#0F0F0F]" />
        </motion.div>

        <h1 className="text-3xl font-bold gold-text-gradient">
          Player {winner} Wins!
        </h1>

        <div className="glass-card rounded-2xl p-6 max-w-xs mx-auto">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-[#3A3A3A] text-xs">Player 1</p>
              <p className="text-white text-2xl font-bold">{p1Score}</p>
            </div>
            <div className="text-[#2A2A2A] text-lg font-bold">-</div>
            <div className="text-center">
              <p className="text-[#3A3A3A] text-xs">Player 2</p>
              <p className="text-white text-2xl font-bold">{p2Score}</p>
            </div>
          </div>
          <p className="text-[#3A3A3A] text-xs mt-4">No trophies in Pass & Play</p>
        </div>

        <div className="flex gap-3 max-w-xs mx-auto">
          <Link href="/play" className="flex-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-full py-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-white text-sm font-medium"
            >
              Exit
            </motion.button>
          </Link>
          <Link href={`/play/mindi/casual/passplay`} className="flex-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F] text-sm font-semibold"
            >
              Play Again
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function SmartphoneIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}
