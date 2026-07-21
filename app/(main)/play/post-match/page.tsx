"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Home, RotateCcw, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getRankFromTrophies, TROPHY_WIN, TROPHY_LOSS } from "@/constants/ranks";
import { useAuth } from "@/contexts/AuthContext";
import { updateMatchResult } from "@/lib/trophyUpdates";

export default function PostMatchPage() {
  const [showPromotion, setShowPromotion] = useState(false);
  const [updating, setUpdating] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Get from URL params or defaults
  const isVictory = searchParams.get("win") === "true" || true;
  const gameType = (searchParams.get("game") as "mindi" | "gin-rummy") || "mindi";

  const [matchData, setMatchData] = useState({
    oldTrophies: 48,
    newTrophies: 48,
    trophyChange: 0,
    oldRank: "Silver",
    newRank: "Silver",
    isPromoted: false,
  });

  useEffect(() => {
    const processResult = async () => {
      if (!user?.uid || user.isGuest) {
        // Guest mode — no trophy updates
        const oldTrophies = 48;
        const trophyChange = isVictory ? TROPHY_WIN : TROPHY_LOSS;
        const newTrophies = Math.max(0, oldTrophies + trophyChange);
        const oldRank = getRankFromTrophies(oldTrophies);
        const newRank = getRankFromTrophies(newTrophies);

        setMatchData({
          oldTrophies,
          newTrophies,
          trophyChange,
          oldRank,
          newRank,
          isPromoted: false, // Guests don't rank up
        });
        setUpdating(false);
        return;
      }

      try {
        const result = await updateMatchResult(user.uid, isVictory, gameType);
        const oldTrophies = result.newTrophies - (isVictory ? TROPHY_WIN : TROPHY_LOSS);

        setMatchData({
          oldTrophies: Math.max(0, oldTrophies),
          newTrophies: result.newTrophies,
          trophyChange: isVictory ? TROPHY_WIN : TROPHY_LOSS,
          oldRank: result.oldRank || getRankFromTrophies(Math.max(0, oldTrophies)),
          newRank: result.newRank,
          isPromoted: result.rankChanged || false,
        });
      } catch (err) {
        setError("Failed to update trophies");
      } finally {
        setUpdating(false);
      }
    };

    processResult();
  }, [user, isVictory, gameType]);

  if (updating) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {isVictory && <VictoryParticles />}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6 relative z-10 w-full max-w-sm"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${
            isVictory 
              ? "bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] shadow-[0_0_40px_rgba(212,175,55,0.3)]" 
              : "bg-[#1A1A1A] border border-[#2A2A2A]"
          }`}
        >
          {isVictory ? (
            <Sparkles size={40} className="text-[#0F0F0F]" />
          ) : (
            <TrendingDown size={40} className="text-[#3A3A3A]" />
          )}
        </motion.div>

        <h1 className={`text-3xl font-bold ${isVictory ? "gold-text-gradient" : "text-[#3A3A3A]"}`}>
          {isVictory ? "Victory!" : "Defeat"}
        </h1>

        {error && (
          <p className="text-red-400 text-xs">{error}</p>
        )}

        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            {isVictory ? (
              <TrendingUp size={20} className="text-green-400" />
            ) : (
              <TrendingDown size={20} className="text-red-400" />
            )}
            <span className={`text-2xl font-bold ${isVictory ? "text-green-400" : "text-red-400"}`}>
              {matchData.trophyChange > 0 ? "+" : ""}{matchData.trophyChange}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-[#3A3A3A]">{matchData.oldTrophies}</span>
            <div className="flex-1 h-px bg-[#2A2A2A] mx-3" />
            <div className="flex items-center gap-1">
              <Trophy size={14} className="text-[#D4AF37]" />
              <span className="text-[#D4AF37] font-bold">{matchData.newTrophies}</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#2A2A2A]">
            <p className="text-[#3A3A3A] text-xs">Current Rank</p>
            <p className="text-white font-semibold">{matchData.newRank}</p>
          </div>

          {user?.isGuest && (
            <p className="text-[#2A2A2A] text-[10px] mt-2">Sign in to earn trophies</p>
          )}
        </div>

        {matchData.isPromoted && (
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

        <div className="flex gap-3">
          <Link href="/home" className="flex-1">
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
        </div>
      </motion.div>

      {showPromotion && (
        <PromotionAnimation rank={matchData.newRank} onClose={() => setShowPromotion(false)} />
      )}
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
          initial={{ x: "50%", y: "50%", opacity: 1, scale: 0 }}
          animate={{
            x: `${20 + Math.random() * 60}%`,
            y: `${20 + Math.random() * 60}%`,
            opacity: 0,
            scale: Math.random() * 2 + 1,
          }}
          transition={{ duration: 1.5 + Math.random(), delay: Math.random() * 0.5, ease: "easeOut" }}
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
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-[#D4AF37] rounded-full"
          initial={{ x: "50%", y: "50%", opacity: 1 }}
          animate={{ x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%`, opacity: 0 }}
          transition={{ duration: 2, delay: Math.random() * 0.5 }}
        />
      ))}
    </motion.div>
  );
}
