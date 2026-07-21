"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useRankLock } from "@/hooks/useRankLock";

export function WeekendLeagueBadge() {
  const { isWeekendLeague } = useRankLock();

  if (!isWeekendLeague) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full px-3 py-1"
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <Flame size={14} className="text-orange-400" />
      </motion.div>
      <span className="text-orange-400 text-xs font-semibold">Weekend League</span>
      <span className="text-[#3A3A3A] text-[10px]">Double Trophies!</span>
    </motion.div>
  );
}
