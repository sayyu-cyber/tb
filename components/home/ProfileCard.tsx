"use client";

import { motion } from "framer-motion";
import { User, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RankBadge } from "@/components/ui/RankBadge";

export function ProfileCard() {
  const { user, playerStats } = useAuth();

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card rounded-2xl p-5 relative overflow-hidden"
    >
      {/* Decorative gold line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

      <div className="flex items-center gap-4">
        {/* Avatar */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="relative"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8962E] p-[2px]">
            <div className="w-full h-full rounded-full bg-[#1A1A1A] flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={28} className="text-[#D4AF37]" />
              )}
            </div>
          </div>
          {user.isGuest && (
            <div className="absolute -bottom-1 -right-1 bg-[#2A2A2A] text-[#888888] text-[9px] px-1.5 py-0.5 rounded-full border border-[#3A3A3A]">
              GUEST
            </div>
          )}
        </motion.div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-lg truncate">
            {user.displayName || "Player"}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <RankBadge rank={playerStats?.currentRank || "Unranked"} size="sm" />
          </div>
        </div>

        {/* Trophy count */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5">
            <Trophy size={16} className="text-[#D4AF37]" />
            <span className="text-[#D4AF37] font-bold text-lg">
              {playerStats?.trophies?.toLocaleString() || 0}
            </span>
          </div>
          <span className="text-[#3A3A3A] text-[10px] uppercase tracking-wider">Trophies</span>
        </div>
      </div>
    </motion.div>
  );
}
