"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, X, Trophy, Swords } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getRankFromTrophies, BOT_NAMES } from "@/constants/ranks";
import Link from "next/link";

export default function MatchmakingPage() {
  const { playerStats } = useAuth();
  const [searching, setSearching] = useState(true);
  const [dots, setDots] = useState("");
  const [matchFound, setMatchFound] = useState(false);

  const trophies = playerStats?.trophies || 0;
  const rank = getRankFromTrophies(trophies);
  const matchesRemaining = 2; // TODO: fetch from context/state

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMatchFound(true);
      setSearching(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (matchFound) {
    return <MatchFoundScreen rank={rank} trophies={trophies} />;
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-6 relative">
      <Link href="/play" className="absolute top-6 left-4">
        <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A]">
          <X size={20} className="text-[#3A3A3A]" />
        </motion.button>
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-8"
      >
        {/* Searching animation */}
        <div className="relative w-32 h-32 mx-auto">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-3 rounded-full border-2 border-[#D4AF37]/10 border-b-[#D4AF37]/50"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Search size={32} className="text-[#D4AF37]" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white">Finding Match{dots}</h2>
          <p className="text-[#3A3A3A] text-sm mt-2">Estimated wait: ~30s</p>
        </div>

        {/* Stats */}
        <div className="glass-card rounded-2xl p-5 space-y-3 max-w-xs mx-auto">
          <div className="flex items-center justify-between">
            <span className="text-[#3A3A3A] text-sm">Rank</span>
            <span className="text-[#D4AF37] font-semibold text-sm">{rank}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#3A3A3A] text-sm">Trophies</span>
            <div className="flex items-center gap-1">
              <Trophy size={14} className="text-[#D4AF37]" />
              <span className="text-[#D4AF37] font-semibold text-sm">{trophies}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#3A3A3A] text-sm">Matches Left</span>
            <div className="flex items-center gap-1">
              <Swords size={14} className="text-[#D4AF37]" />
              <span className="text-white font-semibold text-sm">{matchesRemaining} / 3</span>
            </div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => window.history.back()}
          className="px-6 py-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-[#3A3A3A] text-sm font-medium hover:text-white transition-colors"
        >
          Cancel
        </motion.button>
      </motion.div>
    </div>
  );
}

function MatchFoundScreen({ rank, trophies }: { rank: string; trophies: number }) {
  const opponentName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-6"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="text-center space-y-6"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8962E] mx-auto flex items-center justify-center">
          <span className="text-[#0F0F0F] text-2xl font-bold">{opponentName.charAt(0)}</span>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white">{opponentName}</h2>
          <p className="text-[#D4AF37] text-sm">{rank} • {trophies} trophies</p>
        </div>

        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="w-12 h-12 rounded-full border-2 border-[#D4AF37] mx-auto flex items-center justify-center"
        >
          <span className="text-[#D4AF37] text-xs font-bold">VS</span>
        </motion.div>

        <p className="text-[#3A3A3A] text-sm">Starting match...</p>
      </motion.div>
    </motion.div>
  );
}
