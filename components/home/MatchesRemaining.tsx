"use client";

import { motion } from "framer-motion";
import { Swords } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { VividCard } from "@/components/ui/VividCard";

interface MatchesRemainingProps {
  remaining: number;
  total: number;
}

export function MatchesRemaining({ remaining, total }: MatchesRemainingProps) {
  const t = useTranslation();

  return (
    <VividCard accent="var(--deep)">
      <div className="flex items-center gap-2 mb-3">
        <Swords size={18} className="text-white" aria-hidden="true" />
        <h3 className="text-white font-semibold text-sm">{t("home_rankedMatches")}</h3>
      </div>

      <div className="flex items-baseline gap-1 mb-3">
        <motion.span
          className="text-3xl font-black text-white tabular-nums"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {remaining}
        </motion.span>
        <span className="text-white/70 text-sm">{t("home_remainingOf").replace("{n}", String(total))}</span>
      </div>

      <div className="flex gap-1.5">
        {[...Array(total)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 + i * 0.1, type: "spring" }}
            className={`flex-1 h-2 rounded-full ${i < remaining ? "bg-white" : "bg-white/20"}`}
          />
        ))}
      </div>
    </VividCard>
  );
}
