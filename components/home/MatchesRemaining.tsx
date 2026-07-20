"use client";

import { motion } from "framer-motion";
import { Swords } from "lucide-react";

interface MatchesRemainingProps {
  remaining: number;
  total: number;
}

export function MatchesRemaining({ remaining, total }: MatchesRemainingProps) {
  const percentage = ((total - remaining) / total) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <Swords size={18} className="text-[#D4AF37]" />
        <h3 className="text-white font-semibold text-sm">Ranked Matches</h3>
      </div>

      <div className="flex items-baseline gap-1 mb-3">
        <motion.span
          className="text-3xl font-bold text-[#D4AF37]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {remaining}
        </motion.span>
        <span className="text-[#3A3A3A] text-sm">/ {total} remaining</span>
      </div>

      <div className="flex gap-1.5">
        {[...Array(total)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 + i * 0.1, type: "spring" }}
            className={`flex-1 h-2 rounded-full ${
              i < remaining
                ? "bg-gradient-to-r from-[#B8962E] to-[#D4AF37]"
                : "bg-[#2A2A2A]"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}
