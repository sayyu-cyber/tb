"use client";

import { motion } from "framer-motion";
import { User, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RankBadge } from "@/components/ui/RankBadge";
import { Badge } from "@/components/ui/Badge";
import { useTranslation } from "@/hooks/useTranslation";
import { riseIn } from "@/lib/motion";

/**
 * The player's identity block, and the anchor of the Home screen.
 *
 * Previously it was styled exactly like the six stat cards beneath it, so
 * nothing on Home read as "this is you" — the eye had no entry point. It
 * now carries more weight: a raised surface, a gold-lit top edge and a
 * larger trophy figure, so the hierarchy is legible before you read a word.
 */
export function ProfileCard() {
  const { user, playerStats } = useAuth();
  const t = useTranslation();

  if (!user) return null;

  return (
    <motion.div
      variants={riseIn}
      initial="hidden"
      animate="show"
      className="surface-raised edge-light relative overflow-hidden rounded-2xl p-5"
    >
      {/* Soft gold bloom behind the trophy figure - suggests depth without
          another border. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full
                   bg-[rgb(var(--gold)/12%)] blur-2xl"
      />

      <div className="relative flex items-center gap-4">
        <motion.div whileHover={{ scale: 1.04 }} className="relative shrink-0">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[rgb(var(--gold-bright))] to-[rgb(var(--gold-deep))] p-[2px]">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[rgb(var(--c2))]">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
              ) : (
                <User size={28} className="text-[rgb(var(--gold))]" aria-hidden="true" />
              )}
            </div>
          </div>
          {user.isGuest && (
            <Badge tone="neutral" className="absolute -bottom-1 left-1/2 -translate-x-1/2">
              {t("home_guestBadge")}
            </Badge>
          )}
        </motion.div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold tracking-tight text-[rgb(var(--text-primary))]">
            {user.displayName || t("profile_player")}
          </h2>
          <div className="mt-1.5 flex items-center gap-2">
            <RankBadge rank={playerStats?.currentRank || "Unranked"} size="sm" />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end">
          <div className="flex items-baseline gap-1.5">
            <Trophy size={16} className="translate-y-[1px] text-[rgb(var(--gold))]" aria-hidden="true" />
            <span className="gold-text-gradient text-2xl font-black leading-none">
              {playerStats?.trophies?.toLocaleString() || 0}
            </span>
          </div>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--c4))]">
            {t("home_trophiesLabel")}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
