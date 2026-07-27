"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Trophy, Swords, Target, Star, TrendingUp, Award, Heart, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RankBadge } from "@/components/ui/RankBadge";
import { StatCard } from "@/components/profile/StatCard";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { getAvatarPreset, getBannerPreset } from "@/constants/profileCustomization";

export default function ProfilePage() {
  const { user, playerStats } = useAuth();
  const [editing, setEditing] = useState(false);

  if (!user) return null;

  const avatarPreset = getAvatarPreset(playerStats?.avatarPreset);
  const bannerPreset = getBannerPreset(playerStats?.bannerPreset);

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
          <h1 className="text-xl font-bold text-[rgb(var(--text-primary))]">Profile</h1>
          <p className="text-[rgb(var(--c4))] text-xs">Your stats & achievements</p>
        </div>
      </motion.div>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`glass-card rounded-2xl p-6 text-center relative overflow-hidden bg-gradient-to-b ${bannerPreset.gradient}`}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

        <button
          onClick={() => setEditing(true)}
          className="absolute top-3 right-3 p-2 rounded-lg bg-[rgb(var(--c2)/70%)] border border-[rgb(var(--c3))] z-10"
        >
          <Pencil size={14} className="text-[#D4AF37]" />
        </button>

        {/* Avatar */}
        <div className="relative inline-block mb-4">
          <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${avatarPreset.gradient} p-[2px] mx-auto`}>
            <div className="w-full h-full rounded-full bg-[rgb(var(--c2))] flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ""} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-[rgb(var(--text-primary))]">{(user.displayName || "P").charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
            <RankBadge rank={playerStats?.currentRank || "Unranked"} size="sm" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-[rgb(var(--text-primary))] mt-2">{user.displayName || "Player"}</h2>
        <p className="text-[rgb(var(--c4))] text-sm">{user.email || "Guest Player"}</p>

        {/* Trophy display */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <Trophy size={18} className="text-[#D4AF37]" />
          <span className="text-[#D4AF37] font-bold text-lg">
            {(playerStats?.trophies || 0).toLocaleString()}
          </span>
          <span className="text-[rgb(var(--c4))] text-xs">trophies</span>
        </div>
      </motion.div>

      {/* Main Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-[rgb(var(--text-primary))] font-semibold text-sm mb-3 px-1">Statistics</h3>
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
        <h3 className="text-[rgb(var(--text-primary))] font-semibold text-sm mb-3 px-1">Achievements</h3>
        <div className="space-y-2">
          {extraStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              className="flex items-center justify-between p-4 rounded-xl bg-[rgb(var(--c2)/50%)] border border-[rgb(var(--c3))]"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  stat.highlight ? "bg-[#D4AF37]/10" : "bg-[rgb(var(--c2))]"
                }`}>
                  <stat.icon size={18} className={stat.highlight ? "text-[#D4AF37]" : "text-[rgb(var(--c4))]"} />
                </div>
                <span className="text-[rgb(var(--c4))] text-sm">{stat.label}</span>
              </div>
              <span className={`font-semibold text-sm ${stat.highlight ? "text-[#D4AF37]" : "text-[rgb(var(--text-primary))]"}`}>
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
        <p className="text-[rgb(var(--c3))] text-[10px] tracking-wider uppercase">More features coming soon</p>
      </motion.div>

      <EditProfileModal
        isOpen={editing}
        onClose={() => setEditing(false)}
        currentName={user.displayName || ""}
        currentAvatar={playerStats?.avatarPreset}
        currentBanner={playerStats?.bannerPreset}
      />
    </div>
  );
}
