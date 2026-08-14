"use client";

import { motion } from "framer-motion";
import { User, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RankBadge } from "@/components/ui/RankBadge";
import { useTranslation } from "@/hooks/useTranslation";

export function ProfileCard() {
  const { user, playerStats } = useAuth();
  const t = useTranslation();

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card rounded-2xl p-5 relative overflow-hidden"
    >
      {/* Decorative gold line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[rgb(var(--gold))] to-transparent" />

      <div className="flex items-center gap-4">
        {/* Avatar */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="relative"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[rgb(var(--gold))] to-[rgb(var(--gold-deep))] p-[2px]">
            <div className="w-full h-full rounded-full bg-[rgb(var(--c2))] flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={28} className="text-[rgb(var(--gold))]" />
              )}
            </div>
          </div>
          {user.isGuest && (
            <div className="absolute -bottom-1 -right-1 bg-[rgb(var(--c3))] text-[rgb(var(--c5))] text-[9px] px-1.5 py-0.5 rounded-full border border-[rgb(var(--c4))]">
              {t("home_guestBadge")}
            </div>
          )}
        </motion.div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[rgb(var(--text-primary))] font-semibold text-lg truncate">
            {user.displayName || t("profile_player")}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <RankBadge rank={playerStats?.currentRank || "Unranked"} size="sm" />
          </div>
        </div>

        {/* Trophy count */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5">
            <Trophy size={16} className="text-[rgb(var(--gold))]" />
            <span className="text-[rgb(var(--gold))] font-bold text-lg">
              {playerStats?.trophies?.toLocaleString() || 0}
            </span>
          </div>
          <span className="text-[rgb(var(--c4))] text-[10px] uppercase tracking-wider">{t("home_trophiesLabel")}</span>
        </div>
      </div>
    </motion.div>
  );
}
