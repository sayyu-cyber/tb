"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Home, RotateCcw, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { getRankFromTrophies, RANKS, TROPHY_WIN, TROPHY_LOSS } from "@/constants/ranks";

export default function PostMatchPage() {
  const [showPromotion, setShowPromotion] = useState(false);

  // TODO: Get from match result
  const isVictory = true;
  const oldTrophies = 48;
  const trophyChange = isVictory ? TROPHY_WIN : TROPHY_LOSS;
  const newTrophies = oldTrophies + trophyChange;
  const oldRank = getRankFromTrophies(oldTrophies);
  const newRank = getRankFromTrophies(newTrophies);
  const isPromoted =
    RANKS[newRank.toUpperCase() as keyof typeof RANKS].min >
    RANKS[oldRank.toUpperCase() as keyof typeof RANKS].min;

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background particles on victory */}
      {isVictory && <VictoryParticles />}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6 relative z-10"
      >
        {/* Result */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        >
          {isVictory ? (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.3)]">
              <Trophy size={40} className="text-[#0F0F0F]" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] mx-auto flex items-center justify-center">
              <TrendingDown size={40} className="text-[#3A3A3A]" />
            </div>
          )}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className={`text-4xl font-bold ${isVictory ? "gold-text-gradient" : "text-[#3A3A3A]"}`}
        >
          {isVictory ? "Victory!" : "Defeat"}
        </motion.h1>

        {/* Trophy change */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card rounded-2xl p-6 max-w-xs mx-auto"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            {isVictory ? (
              <TrendingUp size={20} className="text-green-400" />
            ) : (
              <TrendingDown size={20} className="text-red-400" />
            )}
            <span className={`text-2xl font-bold ${isVictory ? "text-green-400" : "text-red-400"}`}>
              {trophyChange > 0 ? "+" : ""}
              {trophyChange}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[#3A3A3A]">{oldTrophies}</span>
            <div className="flex-1 h-px bg-[#2A2A2A] mx-3" />
            <div className="flex items-center gap-1">
              <Trophy size={14} className="text-[#D4AF37]" />
              <span className="text-[#D4AF37] font-bold">{newTrophies}</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#2A2A2A]">
            <p className="text-[#3A3A3A] text-xs">Current Rank</p>
            <p className="text-white font-semibold">{newRank}</p>
          </div>
        </motion.div>

        {/* Promotion trigger */}
        {isPromoted && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            onClick={() => setShowPromotion(true)}
            className="text-[#D4AF37] text-sm underline"
          >
            View Promotion
          </motion.button>
        )}

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex gap-3 max-w-xs mx-auto"
        >
          <Link href="/play" className="flex-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-full py-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-white text-sm font-medium flex items-center justify-center gap-2"
            >
              <Home size={16} />
              Home
            </motion.button>
          </Link>
          <Link href="/play/matchmaking" className="flex-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F] text-sm font-semibold flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              Play Again
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Promotion overlay */}
      {showPromotion && <PromotionAnimation rank={newRank} onClose={() => setShowPromotion(false)} />}
    </div>
  );
}

function VictoryParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-[#D4AF37] rounded-full"
          initial={{
            x: "50%",
            y: "50%",
            opacity: 1,
            scale: 0,
          }}
          animate={{
            x: `${20 + Math.random() * 60}%`,
            y: `${20 + Math.random() * 60}%`,
            opacity: 0,
            scale: Math.random() * 2 + 1,
          }}
          transition={{
            duration: 1.5 + Math.random(),
            delay: Math.random() * 0.5,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

function PromotionAnimation({ rank, onClose }: { rank: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-[#0F0F0F]/95 flex items-center justify-center px-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-6xl mb-4"
        >
          👑
        </motion.div>
        <h2 className="text-3xl font-bold gold-text-gradient mb-2">PROMOTED!</h2>
        <p className="text-white text-xl mb-6">{rank}</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F] font-semibold"
        >
          Continue
        </motion.button>
      </motion.div>

      {/* Gold particles */}
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-[#D4AF37] rounded-full"
          initial={{ x: "50%", y: "50%", opacity: 1 }}
          animate={{
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
            opacity: 0,
          }}
          transition={{ duration: 2, delay: Math.random() * 0.5 }}
        />
      ))}
    </motion.div>
  );
}
