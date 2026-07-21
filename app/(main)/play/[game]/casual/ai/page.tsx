"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bot, User, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BOT_NAMES } from "@/constants/ranks";

interface GameState {
  playerScore: number;
  botScore: number;
  currentTurn: "player" | "bot";
  round: number;
  maxRounds: number;
  gameOver: boolean;
  winner: "player" | "bot" | null;
  botThinking: boolean;
  botName: string;
}

export default function AIGamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.game as string;

  const [gameState, setGameState] = useState<GameState>({
    playerScore: 0,
    botScore: 0,
    currentTurn: "player",
    round: 1,
    maxRounds: 5,
    gameOver: false,
    winner: null,
    botThinking: false,
    botName: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
  });

  const [playerCards, setPlayerCards] = useState<number[]>([]);
  const [botCards, setBotCards] = useState<number[]>([]);
  const [playedCards, setPlayedCards] = useState<{player: number | null, bot: number | null}>({player: null, bot: null});
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [roundResult, setRoundResult] = useState<string | null>(null);

  // Initialize cards
  useEffect(() => {
    const cards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setPlayerCards(shuffled.slice(0, 5));
    setBotCards(shuffled.slice(5, 10));
  }, []);

  // Bot turn logic
  const botPlay = useCallback(() => {
    setGameState(prev => ({ ...prev, botThinking: true }));

    setTimeout(() => {
      const botCard = botCards[Math.floor(Math.random() * botCards.length)];
      setPlayedCards(prev => ({ ...prev, bot: botCard }));

      setTimeout(() => {
        setGameState(prev => {
          const playerWon = (selectedCard || 0) > botCard;
          const newPlayerScore = playerWon ? prev.playerScore + 1 : prev.playerScore;
          const newBotScore = !playerWon ? prev.botScore + 1 : prev.botScore;
          const newRound = prev.round + 1;
          const isGameOver = newRound > prev.maxRounds;

          return {
            ...prev,
            playerScore: newPlayerScore,
            botScore: newBotScore,
            round: newRound,
            currentTurn: "player",
            botThinking: false,
            gameOver: isGameOver,
            winner: isGameOver 
              ? (newPlayerScore > newBotScore ? "player" : "bot")
              : null,
          };
        });

        setRoundResult(selectedCard && botCard ? 
          (selectedCard > botCard ? "You win this round!" : `${gameState.botName} wins this round!`) 
          : null
        );

        setSelectedCard(null);
        setPlayedCards({player: null, bot: null});
      }, 1000);
    }, 2000 + Math.random() * 2000); // 2-4 seconds "thinking"
  }, [botCards, selectedCard, gameState.botName]);

  const handleCardSelect = (card: number) => {
    if (gameState.currentTurn !== "player" || gameState.botThinking || gameState.gameOver) return;

    setSelectedCard(card);
    setPlayedCards(prev => ({ ...prev, player: card }));
    setPlayerCards(prev => prev.filter(c => c !== card));

    setGameState(prev => ({ ...prev, currentTurn: "bot" }));

    setTimeout(() => botPlay(), 500);
  };

  const handlePlayAgain = () => {
    router.refresh();
  };

  if (gameState.gameOver) {
    return (
      <GameOverScreen 
        winner={gameState.winner} 
        playerScore={gameState.playerScore} 
        botScore={gameState.botScore}
        botName={gameState.botName}
        onPlayAgain={handlePlayAgain}
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
          <p className="text-white text-sm font-semibold capitalize">{gameId} — vs AI</p>
          <p className="text-[#3A3A3A] text-[10px]">Casual Mode</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Score Board */}
      <div className="px-4 py-3">
        <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8962E] flex items-center justify-center">
              <User size={18} className="text-[#0F0F0F]" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">You</p>
              <p className="text-[#D4AF37] text-lg font-bold">{gameState.playerScore}</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[#3A3A3A] text-xs">Round {gameState.round}/{gameState.maxRounds}</p>
            <div className="flex items-center gap-1 mt-1">
              <Clock size={12} className="text-[#3A3A3A]" />
              <p className="text-[#3A3A3A] text-[10px]">Casual</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-white text-sm font-medium">{gameState.botName}</p>
              <p className="text-[#D4AF37] text-lg font-bold">{gameState.botScore}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center">
              <Bot size={18} className="text-[#3A3A3A]" />
            </div>
          </div>
        </div>
      </div>

      {/* Bot Thinking Indicator */}
      <AnimatePresence>
        {gameState.botThinking && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-4 py-2"
          >
            <div className="flex items-center justify-center gap-2 bg-[#1A1A1A] rounded-xl py-2 border border-[#2A2A2A]">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles size={14} className="text-[#D4AF37]" />
              </motion.div>
              <p className="text-[#D4AF37] text-sm">{gameState.botName} is thinking...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Played Cards Area */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="flex items-center gap-8">
          {/* Bot played card */}
          <motion.div
            animate={playedCards.bot ? { scale: [0.5, 1.1, 1] } : {}}
            className="w-20 h-28 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center"
          >
            {playedCards.bot ? (
              <span className="text-2xl text-white font-bold">{playedCards.bot}</span>
            ) : (
              <span className="text-[#2A2A2A] text-xs">?</span>
            )}
          </motion.div>

          <div className="text-[#3A3A3A] text-xs font-bold">VS</div>

          {/* Player played card */}
          <motion.div
            animate={playedCards.player ? { scale: [0.5, 1.1, 1] } : {}}
            className="w-20 h-28 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B8962E]/10 border border-[#D4AF37]/30 flex items-center justify-center"
          >
            {playedCards.player ? (
              <span className="text-2xl text-[#D4AF37] font-bold">{playedCards.player}</span>
            ) : (
              <span className="text-[#2A2A2A] text-xs">Play</span>
            )}
          </motion.div>
        </div>
      </div>

      {/* Round Result */}
      <AnimatePresence>
        {roundResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-2"
          >
            <p className="text-[#D4AF37] text-sm">{roundResult}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player Cards */}
      <div className="px-4 pb-6">
        <p className="text-[#3A3A3A] text-xs mb-3 text-center">Select a card to play</p>
        <div className="flex justify-center gap-3">
          {playerCards.map((card, index) => (
            <motion.button
              key={`${card}-${index}`}
              whileHover={{ y: -8, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCardSelect(card)}
              disabled={gameState.currentTurn !== "player" || gameState.botThinking}
              className="w-14 h-20 rounded-xl bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] border border-[#D4AF37]/30 flex items-center justify-center disabled:opacity-50 disabled:border-[#2A2A2A]"
            >
              <span className="text-[#D4AF37] text-lg font-bold">{card}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

function GameOverScreen({ 
  winner, 
  playerScore, 
  botScore, 
  botName,
  onPlayAgain 
}: { 
  winner: "player" | "bot" | null; 
  playerScore: number; 
  botScore: number;
  botName: string;
  onPlayAgain: () => void;
}) {
  const isWin = winner === "player";

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
          className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${
            isWin 
              ? "bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] shadow-[0_0_40px_rgba(212,175,55,0.3)]" 
              : "bg-[#1A1A1A] border border-[#2A2A2A]"
          }`}
        >
          {isWin ? (
            <Sparkles size={40} className="text-[#0F0F0F]" />
          ) : (
            <Bot size={40} className="text-[#3A3A3A]" />
          )}
        </motion.div>

        <h1 className={`text-3xl font-bold ${isWin ? "gold-text-gradient" : "text-[#3A3A3A]"}`}>
          {isWin ? "You Won!" : `${botName} Won!`}
        </h1>

        <div className="glass-card rounded-2xl p-6 max-w-xs mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="text-center">
              <p className="text-[#3A3A3A] text-xs">You</p>
              <p className="text-white text-2xl font-bold">{playerScore}</p>
            </div>
            <div className="text-[#2A2A2A] text-lg font-bold">-</div>
            <div className="text-center">
              <p className="text-[#3A3A3A] text-xs">{botName}</p>
              <p className="text-white text-2xl font-bold">{botScore}</p>
            </div>
          </div>
          <p className="text-[#3A3A3A] text-xs">No trophies awarded in Casual Mode</p>
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
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onPlayAgain}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F] text-sm font-semibold"
          >
            Play Again
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
