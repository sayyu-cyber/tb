"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Home, RotateCcw, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getRankFromTrophies, TROPHY_WIN, TROPHY_LOSS } from "@/constants/ranks";
import { useAuth } from "@/contexts/AuthContext";
import { updateMatchResult } from "@/lib/trophyUpdates";
import { useTranslation } from "@/hooks/useTranslation";
import { Crown } from "@/components/ui/icons";

export default function PostMatchPage() {
  const t = useTranslation();
  const [showPromotion, setShowPromotion] = useState(false);
  const [updating, setUpdating] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const isVictory = searchParams.get("win") === "true";
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
          isPromoted: false,
        });
        setUpdating(false);
        return;
      }

      try {
        const result = await updateMatchResult(user.uid, isVictory, gameType);
        const oldTrophies = result.newTrophies - (isVictory ? TROPHY_WIN : TROPHY_LOSS);
        const safeOldRank = result.oldRank || getRankFromTrophies(Math.max(0, oldTrophies));
        const safeNewRank = result.newRank || safeOldRank;

        setMatchData({
          oldTrophies: Math.max(0, oldTrophies),
          newTrophies: result.newTrophies,
          trophyChange: isVictory ? TROPHY_WIN : TROPHY_LOSS,
          oldRank: safeOldRank,
          newRank: safeNewRank,
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
      <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-2 border-[rgb(var(--gold)/20%)] border-t-[rgb(var(--gold))] rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {isVictory && <VictoryParticles />}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6 relative z-10 w-full max-w-sm"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${
            isVictory 
              ? "bg-gradient-to-br from-[rgb(var(--gold))] to-[rgb(var(--gold-bright))] shadow-[0_0_40px_rgba(212,175,55,0.3)]" 
              : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]"
          }`}
        >
          {isVictory ? (
            <Sparkles size={40} className="text-[#0F0F0F]" />
          ) : (
            <TrendingDown size={40} className="text-[rgb(var(--c4))]" />
          )}
        </motion.div>

        <h1 className={`text-3xl font-bold ${isVictory ? "gold-text-gradient" : "text-[rgb(var(--c4))]"}`}>
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
            <span className="text-[rgb(var(--c4))]">{matchData.oldTrophies}</span>
            <div className="flex-1 h-px bg-[rgb(var(--c3))] mx-3" />
            <div className="flex items-center gap-1">
              <Trophy size={14} className="text-[rgb(var(--gold))]" />
              <span className="text-[rgb(var(--gold))] font-bold">{matchData.newTrophies}</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[rgb(var(--c3))]">
            <p className="text-[rgb(var(--c4))] text-xs">Current Rank</p>
            <p className="text-[rgb(var(--text-primary))] font-semibold">{matchData.newRank}</p>
          </div>

          {user?.isGuest && (
            <p className="text-[rgb(var(--c3))] text-[10px] mt-2">{t("postmatch_signInToEarn")}</p>
          )}
        </div>

        {matchData.isPromoted && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            onClick={() => setShowPromotion(true)}
            className="text-[rgb(var(--gold))] text-sm underline"
          >
            View Promotion
          </motion.button>
        )}

        <div className="flex gap-3">
          <Link href="/home" className="flex-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-full py-3 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--text-primary))] text-sm font-medium flex items-center justify-center gap-2"
            >
              <Home size={16} />
              Home
            </motion.button>
          </Link>
          <Link href="/play" className="flex-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] text-sm font-semibold flex items-center justify-center gap-2"
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
          className="absolute w-1 h-1 bg-[rgb(var(--gold))] rounded-full"
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
      className="fixed inset-0 z-50 bg-[rgb(var(--c1)/95%)] flex items-center justify-center px-6"
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
          <Crown size={48} className="text-[rgb(var(--gold))]" />
        </motion.div>
        <h2 className="text-3xl font-bold gold-text-gradient mb-2">PROMOTED!</h2>
        <p className="text-[rgb(var(--text-primary))] text-xl mb-6">{rank}</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] font-semibold"
        >
          Continue
        </motion.button>
      </motion.div>
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-[rgb(var(--gold))] rounded-full"
          initial={{ x: "50%", y: "50%", opacity: 1 }}
          animate={{ x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%`, opacity: 0 }}
          transition={{ duration: 2, delay: Math.random() * 0.5 }}
        />
      ))}
    </motion.div>
  );
}
