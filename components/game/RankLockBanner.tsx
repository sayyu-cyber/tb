"use client";

import { motion } from "framer-motion";
import { Lock, Clock } from "lucide-react";
import { useRankLock } from "@/hooks/useRankLock";
import { useTranslation } from "@/hooks/useTranslation";

export function RankLockBanner() {
  const { isLocked, nextUnlockTime } = useRankLock();
  const t = useTranslation();

  if (!isLocked) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl p-4 border border-[rgb(var(--gold)/20%)] bg-[rgb(var(--gold)/5%)]"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[rgb(var(--gold)/10%)] flex items-center justify-center">
          <Lock size={20} className="text-[rgb(var(--gold))]" />
        </div>
        <div className="flex-1">
          <h3 className="text-[rgb(var(--gold))] font-semibold text-sm">{t("home_ranksLocked")}</h3>
          <p className="text-[rgb(var(--c4))] text-xs">{t("home_ranksLockedDesc")}</p>
        </div>
        <div className="flex items-center gap-1 text-[rgb(var(--c4))]">
          <Clock size={12} />
          <span className="text-[10px]">{nextUnlockTime}</span>
        </div>
      </div>
    </motion.div>
  );
}
