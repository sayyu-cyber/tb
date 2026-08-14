"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Trophy, Crown, Medal } from "lucide-react";
import { LeaderboardEntry } from "@/types";

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  index: number;
  isCurrentUser?: boolean;
}

export function LeaderboardRow({ entry, index, isCurrentUser }: LeaderboardRowProps) {
  const rank = entry.rank;

  const getRankStyle = () => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-[rgb(var(--gold)/20%)] to-transparent border-l-2 border-[rgb(var(--gold))]";
      case 2:
        return "bg-gradient-to-r from-[#C0C0C0]/10 to-transparent border-l-2 border-[#C0C0C0]";
      case 3:
        return "bg-gradient-to-r from-[#CD7F32]/10 to-transparent border-l-2 border-[#CD7F32]";
      default:
        return "border-l-2 border-transparent hover:bg-[rgb(var(--c2)/50%)]";
    }
  };

  const getRankIcon = () => {
    switch (rank) {
      case 1:
        return <Crown size={18} className="text-[rgb(var(--gold))]" />;
      case 2:
        return <Medal size={18} className="text-[#C0C0C0]" />;
      case 3:
        return <Medal size={18} className="text-[#CD7F32]" />;
      default:
        return (
          <span className="text-[rgb(var(--c4))] font-bold text-sm w-5 text-center">
            {rank}
          </span>
        );
    }
  };

  return (
    <Link href={`/player?uid=${entry.uid}`}>
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${getRankStyle()} ${
        isCurrentUser ? "bg-[rgb(var(--gold)/5%)] border-[rgb(var(--gold)/30%)]" : ""
      }`}
    >
      {/* Rank */}
      <div className="w-8 flex justify-center">{getRankIcon()}</div>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[rgb(var(--gold))] to-[rgb(var(--gold-deep))] p-[1.5px]">
        <div className="w-full h-full rounded-full bg-[rgb(var(--c2))] flex items-center justify-center">
          <span className="text-[rgb(var(--gold))] text-sm font-bold">
            {entry.username.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Username */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${rank <= 3 ? "text-[rgb(var(--text-primary))]" : "text-[rgb(var(--c5))]"}`}>
          {entry.username}
        </p>
        {isCurrentUser && (
          <span className="text-[9px] text-[rgb(var(--gold))] uppercase tracking-wider">You</span>
        )}
      </div>

      {/* Trophies */}
      <div className="flex items-center gap-1.5">
        <Trophy size={14} className={rank <= 3 ? "text-[rgb(var(--gold))]" : "text-[rgb(var(--c4))]"} />
        <span className={`text-sm font-semibold ${rank <= 3 ? "text-[rgb(var(--gold))]" : "text-[rgb(var(--c5))]"}`}>
          {entry.trophies.toLocaleString()}
        </span>
      </div>
    </motion.div>
    </Link>
  );
}
