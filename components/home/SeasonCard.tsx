"use client";

import { motion } from "framer-motion";
import { Crown, Calendar } from "lucide-react";
import { useSeasonInfo } from "@/hooks/useSeasonInfo";
import { useCountdown } from "@/hooks/useCountdown";

export function SeasonCard() {
  const season = useSeasonInfo();
const { days, hours } = useCountdown(season?.endDate ?? new Date());

if (!season) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="glass-card rounded-2xl p-5 relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-2xl" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown size={18} className="text-[#D4AF37]" />
          <h3 className="text-white font-semibold">{season.name}</h3>
        </div>
        <div className="flex items-center gap-1 text-[#3A3A3A]">
          <Calendar size={14} />
          <span className="text-xs">Ends in</span>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-[#D4AF37]">{days}</span>
        <span className="text-[#3A3A3A] text-sm mb-1">days</span>
        <span className="text-4xl font-bold text-[#D4AF37] ml-2">{hours}</span>
        <span className="text-[#3A3A3A] text-sm mb-1">hours</span>
      </div>

      <div className="mt-4 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[#B8962E] via-[#D4AF37] to-[#E8C84A] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: "65%" }}
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
        />
      </div>
      <p className="text-[#3A3A3A] text-[10px] mt-1.5">Season progress</p>
    </motion.div>
  );
}
