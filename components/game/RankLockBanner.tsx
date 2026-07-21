"use client";

import { motion } from "framer-motion";
import { Lock, Clock } from "lucide-react";
import { useRankLock } from "@/hooks/useRankLock";

export function RankLockBanner() {
  const { isLocked, nextUnlockTime } = useRankLock();

  if (!isLocked) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl p-4 border border-[#D4AF37]/20 bg-[#D4AF37]/5"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
          <Lock size={20} className="text-[#D4AF37]" />
        </div>
        <div className="flex-1">
          <h3 className="text-[#D4AF37] font-semibold text-sm">Ranks Locked</h3>
          <p className="text-[#3A3A3A] text-xs">Weekend League is active. Ranked matches resume Sunday.</p>
        </div>
        <div className="flex items-center gap-1 text-[#3A3A3A]">
          <Clock size={12} />
          <span className="text-[10px]">{nextUnlockTime}</span>
        </div>
      </div>
    </motion.div>
  );
}
