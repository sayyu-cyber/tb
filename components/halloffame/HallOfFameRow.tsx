"use client";

import { motion } from "framer-motion";
import { Crown, Medal, Star } from "lucide-react";
import { RANKS } from "@/constants/ranks";
import { HallOfFameEntry } from "@/lib/hallOfFame";

interface HallOfFameRowProps {
  entry: HallOfFameEntry;
  position: number;
  index: number;
}

function rankColor(rank: string): string {
  const match = Object.values(RANKS).find((r) => r.name === rank);
  return match?.color ?? "#3A3A3A";
}

export function HallOfFameRow({ entry, position, index }: HallOfFameRowProps) {
  const getRowStyle = () => {
    switch (position) {
      case 1:
        return "bg-gradient-to-r from-[#D4AF37]/20 to-transparent border-l-2 border-[#D4AF37]";
      case 2:
        return "bg-gradient-to-r from-[#C0C0C0]/10 to-transparent border-l-2 border-[#C0C0C0]";
      case 3:
        return "bg-gradient-to-r from-[#CD7F32]/10 to-transparent border-l-2 border-[#CD7F32]";
      default:
        return "border-l-2 border-transparent";
    }
  };

  const getRowIcon = () => {
    switch (position) {
      case 1:
        return <Crown size={18} className="text-[#D4AF37]" />;
      case 2:
        return <Medal size={18} className="text-[#C0C0C0]" />;
      case 3:
        return <Medal size={18} className="text-[#CD7F32]" />;
      default:
        return <span className="text-[#3A3A3A] font-bold text-sm w-5 text-center">{position}</span>;
    }
  };

  const winPct = entry.totalMatches > 0 ? Math.round((entry.wins / entry.totalMatches) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${getRowStyle()}`}
    >
      <div className="w-8 flex justify-center">{getRowIcon()}</div>

      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8962E] p-[1.5px]">
        <div className="w-full h-full rounded-full bg-[#1A1A1A] flex items-center justify-center">
          <span className="text-[#D4AF37] text-sm font-bold">{entry.displayName.charAt(0).toUpperCase()}</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${position <= 3 ? "text-white" : "text-[#888888]"}`}>
          {entry.displayName}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: rankColor(entry.highestRank) }}>
            {entry.highestRank}
          </span>
          <span className="text-[#2A2A2A] text-[10px]">•</span>
          <span className="text-[#3A3A3A] text-[10px]">{entry.wins} wins ({winPct}%)</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Star size={14} className={position <= 3 ? "text-[#D4AF37]" : "text-[#3A3A3A]"} />
        <span className={`text-sm font-semibold ${position <= 3 ? "text-[#D4AF37]" : "text-[#888888]"}`}>
          {entry.peakTrophies.toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
}
