"use client";

import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { LeaderboardEntry } from "@/types";

interface PodiumProps {
  topThree: LeaderboardEntry[];
}

export function Podium({ topThree }: PodiumProps) {
  const positions = [
    { index: 1, height: "h-28", order: 2 }, // 2nd place
    { index: 0, height: "h-36", order: 1 }, // 1st place
    { index: 2, height: "h-24", order: 3 }, // 3rd place
  ];

  return (
    <div className="flex items-end justify-center gap-4 mb-8 px-4">
      {positions.map(({ index, height, order }) => {
        const player = topThree[index];
        if (!player) return null;

        const isFirst = order === 1;
        const crownColor = order === 1 ? "#D4AF37" : order === 2 ? "#C0C0C0" : "#CD7F32";

        return (
          <motion.div
            key={player.rank}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: order * 0.15, duration: 0.5 }}
            className="flex flex-col items-center"
            style={{ order }}
          >
            {/* Player info */}
            <div className="text-center mb-3">
              {isFirst && (
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mb-1"
                >
                  <Crown size={20} style={{ color: crownColor }} />
                </motion.div>
              )}
              <div
                className={`w-12 h-12 rounded-full mx-auto mb-1.5 flex items-center justify-center ${
                  isFirst
                    ? "bg-gradient-to-br from-[#D4AF37] to-[#B8962E]"
                    : "bg-[#1A1A1A] border border-[#2A2A2A]"
                }`}
              >
                <span className={`font-bold text-sm ${isFirst ? "text-[#0F0F0F]" : "text-[#888888]"}`}>
                  {player.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className={`text-xs font-medium truncate max-w-[80px] ${isFirst ? "text-[#D4AF37]" : "text-[#888888]"}`}>
                {player.username}
              </p>
              <p className="text-[10px] text-[#3A3A3A]">{player.trophies.toLocaleString()}</p>
            </div>

            {/* Podium block */}
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              transition={{ delay: 0.3 + order * 0.1, duration: 0.5 }}
              className={`w-20 ${height} rounded-t-xl relative overflow-hidden`}
              style={{
                background: isFirst
                  ? "linear-gradient(180deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.05) 100%)"
                  : "linear-gradient(180deg, rgba(42,42,42,0.5) 0%, rgba(26,26,26,0.3) 100%)",
                borderTop: isFirst ? "2px solid rgba(212,175,55,0.5)" : "1px solid rgba(58,58,58,0.3)",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`text-2xl font-bold ${
                    isFirst ? "text-[#D4AF37]" : "text-[#3A3A3A]"
                  }`}
                >
                  {order}
                </span>
              </div>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
