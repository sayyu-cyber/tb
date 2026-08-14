"use client";

import { motion } from "framer-motion";
import { Award } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getRankFromTrophies, RANKS } from "@/constants/ranks";
import { useTranslation } from "@/hooks/useTranslation";
import { riseIn } from "@/lib/motion";

export function RankProgress() {
  const { playerStats } = useAuth();
  const t = useTranslation();
  const trophies = playerStats?.trophies || 0;
  const currentRank = getRankFromTrophies(trophies);
  const rankData = RANKS[currentRank.toUpperCase() as keyof typeof RANKS];

  const nextRank = Object.values(RANKS).find((r) => r.min > trophies);
  const progress = nextRank
    ? ((trophies - rankData.min) / (nextRank.min - rankData.min)) * 100
    : 100;

  return (
    <motion.div
      variants={riseIn}
      initial="hidden"
      animate="show"
      style={{ ["--accent" as string]: "var(--gold)" } as React.CSSProperties}
      className="surface-accent edge-light rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Award size={18} className="text-[rgb(var(--accent))]" aria-hidden="true" />
          <h3 className="text-[rgb(var(--text-primary))] font-semibold text-sm">{t("home_currentRank")}</h3>
        </div>
        <span className="text-[rgb(var(--accent))] font-bold text-sm tabular-nums">{currentRank}</span>
      </div>

      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-2xl font-bold text-[rgb(var(--text-primary))]">{trophies}</span>
        <span className="text-[rgb(var(--c4))] text-xs">{t("profile_trophies").toLowerCase()}</span>
      </div>

      <div className="h-2 bg-[rgb(var(--c2))] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[rgb(var(--accent)/70%)] to-[rgb(var(--accent))] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
        />
      </div>

      {nextRank && (
        <p className="text-[rgb(var(--c4))] text-[10px] mt-2">
          {t("home_trophiesToNext").replace("{n}", String(nextRank.min - trophies)).replace("{rank}", nextRank.name)}
        </p>
      )}
    </motion.div>
  );
}
