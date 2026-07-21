"use client";

import { motion } from "framer-motion";
import { Award } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getRankFromTrophies, RANKS } from "@/constants/ranks";

export function RankProgress() {
  const { playerStats } = useAuth();
  const trophies = playerStats?.trophies || 0;
  const currentRank = getRankFromTrophies(trophies);
  const rankData = RANKS[currentRank.toUpperCase() as keyof typeof RANKS];

  const nextRank = Object.values(RANKS).find((r) => r.min > trophies);
  const progress = nextRank
    ? ((trophies - rankData.min) / (nextRank.min - rankData.min)) * 100
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Award size={18} className="text-[#D4AF37]" />
          <h3 className="text-white font-semibold text-sm">Current Rank</h3>
        </div>
        <span className="text-[#D4AF37] font-bold text-sm">{currentRank}</span>
      </div>

      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-2xl font-bold text-white">{trophies}</span>
        <span className="text-[#3A3A3A] text-xs">trophies</span>
      </div>

      <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[#B8962E] via-[#D4AF37] to-[#E8C84A] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
        />
      </div>

      {nextRank && (
        <p className="text-[#3A3A3A] text-[10px] mt-2">
          {nextRank.min - trophies} trophies to {nextRank.name}
        </p>
      )}
    </motion.div>
  );
}
