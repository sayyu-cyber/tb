"use client";

import { motion } from "framer-motion";
import { Shield, Award, Crown, Gem } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getRankFromTrophies, RANKS } from "@/constants/ranks";
import { useTranslation } from "@/hooks/useTranslation";
import { VividCard } from "@/components/ui/VividCard";

/** One distinct icon per tier, on top of RANKS' existing distinct colour
 *  (constants/ranks.ts) - so Bronze/Silver/Gold/Platinum read as visually
 *  different badges, not the same shield recoloured. */
const TIER_ICON: Record<string, typeof Shield> = {
  Bronze: Shield,
  Silver: Award,
  Gold: Crown,
  Platinum: Gem,
};

export function RankProgress() {
  const { playerStats } = useAuth();
  const t = useTranslation();
  const trophies = playerStats?.trophies || 0;
  const currentRank = getRankFromTrophies(trophies);
  const rankData = RANKS[currentRank.toUpperCase() as keyof typeof RANKS];
  const TierIcon = TIER_ICON[currentRank] ?? Shield;

  const nextRank = Object.values(RANKS).find((r) => r.min > trophies);
  const progress = nextRank
    ? ((trophies - rankData.min) / (nextRank.min - rankData.min)) * 100
    : 100;

  return (
    <VividCard accent="var(--gold)">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Tier badge - real colour per rank (rankData.color), distinct
              icon per tier, so Bronze/Silver/Gold/Platinum are legible at a
              glance rather than only distinguishable by reading the text. */}
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg shadow-[inset_0_1px_0_rgb(255_255_255/40%)]"
            style={{ backgroundColor: `${rankData.color}33`, border: `1px solid ${rankData.color}66` }}
          >
            <TierIcon size={16} style={{ color: rankData.color }} aria-hidden="true" />
          </span>
          <h3 className="text-white font-semibold text-sm">{t("home_currentRank")}</h3>
        </div>
        <span className="text-white font-bold text-sm tabular-nums">{currentRank}</span>
      </div>

      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-2xl font-bold text-white">{trophies}</span>
        <span className="text-white/70 text-xs">{t("profile_trophies").toLowerCase()}</span>
      </div>

      <div className="h-2 bg-white/25 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-white rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
        />
      </div>

      {nextRank && (
        <p className="text-white/70 text-[10px] mt-2">
          {t("home_trophiesToNext").replace("{n}", String(nextRank.min - trophies)).replace("{rank}", nextRank.name)}
        </p>
      )}
    </VividCard>
  );
}
