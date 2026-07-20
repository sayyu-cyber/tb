"use client";

import { motion } from "framer-motion";
import { User, Trophy, Swords, Target, Star, TrendingUp, Award, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RankBadge } from "@/components/ui/RankBadge";
import { StatCard } from "@/components/profile/StatCard";

export default function ProfilePage() {
  const { user, playerStats } = useAuth();

  if (!user) return null;

  const stats = [
    { icon: Swords, label: "Matches", value: playerStats?.totalMatches || 0 },
    { icon: Trophy, label: "Wins", value: playerStats?.wins || 0, highlight: true },
    { icon: Target, label: "Losses", value: playerStats?.losses || 0 },
    { icon: TrendingUp, label: "Win %", value: `${playerStats?.winPercentage || 0}%` },
  ];

  const extraStats = [
    { icon: Star, label: "Highest Rank", value: playerStats?.highestRank || "Unranked" },
    { icon: Heart, label: "Favorite Game", value: playerStats?.favoriteGame || "None" },
    { icon: Award, label: "Trophies", value: (playerStats?.trophies || 0).toLocaleString(), highlight: true },
  ];

  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
          <User size={20} className="text-[#D4AF37]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Profile</h1>
          <p className="text-[#3A3A3A] text-xs">Your stats & achievements</p>
        </div>
      </motion.div>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-6 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

        {/* Avatar */}
        <div className="relative inline-block mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8962E] p-[2px] mx-auto">
            <div className="w-full h-full rounded-full bg-[#1A1A1A] flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ""} className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-[#D4AF37]" />
              )}
            </div>
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
            <RankBadge rank={playerStats?.currentRank || "Unranked"} size="sm" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-white mt-2">{user.displayName || "Player"}</h2>
        <p className="text-[#3A3A3A] text-sm">{user.email || "Guest Player"}</p>

        {/* Trophy display */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <Trophy size={18} className="text-[#D4AF37]" />
          <span className="text-[#D4AF37] font-bold text-lg">
            {(playerStats?.trophies || 0).toLocaleString()}
          </span>
          <span className="text-[#3A3A3A] text-xs">trophies</span>
        </div>
      </motion.div>

      {/* Main Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-white font-semibold text-sm mb-3 px-1">Statistics</h3>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => (
            <StatCard key={stat.label} {...stat} delay={0.25 + index * 0.05} />
          ))}
        </div>
      </motion.div>

      {/* Extra Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <h3 className="text-white font-semibold text-sm mb-3 px-1">Achievements</h3>
        <div className="space-y-2">
          {extraStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              className="flex items-center justify-between p-4 rounded-xl bg-[#1A1A1A]/50 border border-[#2A2A2A]"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  stat.highlight ? "bg-[#D4AF37]/10" : "bg-[#1A1A1A]"
                }`}>
                  <stat.icon size={18} className={stat.highlight ? "text-[#D4AF37]" : "text-[#3A3A3A]"} />
                </div>
                <span className="text-[#3A3A3A] text-sm">{stat.label}</span>
              </div>
              <span className={`font-semibold text-sm ${stat.highlight ? "text-[#D4AF37]" : "text-white"}`}>
                {stat.value}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Placeholder for future features */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center py-4"
      >
        <p className="text-[#2A2A2A] text-[10px] tracking-wider uppercase">More features coming soon</p>
      </motion.div>
    </div>
  );
}
