"use client";

import { motion } from "framer-motion";
import { Trophy, TrendingUp } from "lucide-react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { Podium } from "@/components/leaderboard/Podium";
import { LeaderboardRow } from "@/components/leaderboard/LeaderboardRow";
import { useAuth } from "@/contexts/AuthContext";

export default function LeaderboardPage() {
  const { entries, loading } = useLeaderboard();
  const { user } = useAuth();

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="px-4 pt-6 pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
          <Trophy size={20} className="text-[#D4AF37]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Leaderboard</h1>
          <p className="text-[#3A3A3A] text-xs">Top players this week</p>
        </div>
      </motion.div>

      {/* Weekly badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 mb-6 bg-[#D4AF37]/5 border border-[#D4AF37]/10 rounded-xl px-4 py-3"
      >
        <TrendingUp size={16} className="text-[#D4AF37]" />
        <span className="text-[#D4AF37] text-sm font-medium">Weekly Rankings</span>
        <span className="text-[#3A3A3A] text-xs ml-auto">Resets every Monday</span>
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-[#1A1A1A] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Podium for top 3 */}
          <Podium topThree={topThree} />

          {/* Rest of leaderboard */}
          <div className="space-y-1">
            {rest.map((entry, index) => (
              <LeaderboardRow
                key={entry.rank}
                entry={entry}
                index={index}
                isCurrentUser={user?.displayName === entry.username}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
