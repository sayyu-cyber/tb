"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useRankLock } from "@/hooks/useRankLock";
import { useTranslation } from "@/hooks/useTranslation";

export function WeekendLeagueBadge() {
  const { isWeekendLeague } = useRankLock();
  const t = useTranslation();

  if (!isWeekendLeague) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 bg-gradient-to-r from-[rgb(var(--coral)/20%)] to-[rgb(var(--coral)/20%)] border border-[rgb(var(--coral)/30%)] rounded-full px-3 py-1"
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <Flame size={14} className="text-[rgb(var(--coral-ink))]" />
      </motion.div>
      <span className="text-[rgb(var(--coral-ink))] text-xs font-semibold">{t("home_weekendLeagueBadge")}</span>
      <span className="text-[rgb(var(--c4))] text-[10px]">{t("home_doubleTrophies")}</span>
    </motion.div>
  );
}
