"use client";

import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

export function DailyMatchCounter() {
  const used = 1;
  const total = 3;
  const remaining = total - used;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-[#D4AF37]" />
          <h3 className="text-[rgb(var(--text-primary))] font-semibold text-sm">Daily Matches</h3>
        </div>
        <span className="text-[#D4AF37] font-bold text-sm">{remaining} / {total}</span>
      </div>

      <div className="flex gap-2">
        {[...Array(total)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15 + i * 0.1, type: "spring" }}
            className={`flex-1 h-3 rounded-full ${
              i < remaining
                ? "bg-gradient-to-r from-[#B8962E] to-[#D4AF37]"
                : "bg-[rgb(var(--c3))]"
            }`}
          />
        ))}
      </div>

      <p className="text-[rgb(var(--c4))] text-[10px] mt-2">
        Resets at midnight • Free users: 3/day
      </p>
    </motion.div>
  );
}
