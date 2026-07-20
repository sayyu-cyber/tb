"use client";

import { motion } from "framer-motion";
import { Timer } from "lucide-react";
import { CountdownTimer } from "@/components/ui/CountdownTimer";

export function WeekendLeague() {
  // Next Friday at 20:00
  const now = new Date();
  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7));
  nextFriday.setHours(20, 0, 0, 0);
  if (nextFriday <= now) {
    nextFriday.setDate(nextFriday.getDate() + 7);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="glass-card rounded-2xl p-5 relative overflow-hidden"
    >
      {/* Decorative corner */}
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-xl" />

      <div className="flex items-center gap-2 mb-4">
        <Timer size={18} className="text-[#D4AF37]" />
        <h3 className="text-white font-semibold text-sm">Weekend League</h3>
      </div>

      <CountdownTimer
        targetDate={nextFriday}
        label="Starts in"
      />

      <div className="mt-4 flex items-center gap-2 text-[#3A3A3A] text-[10px]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
        Double trophies during Weekend League
      </div>
    </motion.div>
  );
}
