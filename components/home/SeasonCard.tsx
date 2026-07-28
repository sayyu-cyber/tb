"use client";

import { motion } from "framer-motion";
import { Crown, Calendar } from "lucide-react";
import { useSeasonInfo } from "@/hooks/useSeasonInfo";
import { useCountdown } from "@/hooks/useCountdown";
import { useTranslation } from "@/hooks/useTranslation";

export function SeasonCard() {
  const season = useSeasonInfo();
  const { days, hours } = useCountdown(season?.endDate ?? new Date());
  const t = useTranslation();

  if (!season) return null;

  // Real progress through the current month-long season, replacing what
  // used to be a hardcoded 65% bar.
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthEnd = season.endDate.getTime();
  const progressPct = Math.min(
    100,
    Math.max(0, Math.round(((now.getTime() - monthStart) / (monthEnd - monthStart)) * 100))
  );

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
          <h3 className="text-[rgb(var(--text-primary))] font-semibold">{season.name}</h3>
        </div>
        <div className="flex items-center gap-1 text-[rgb(var(--c4))]">
          <Calendar size={14} />
          <span className="text-xs">{t("home_seasonEndsIn")}</span>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold text-[#D4AF37]">{days}</span>
        <span className="text-[rgb(var(--c4))] text-sm mb-1">{t("home_days")}</span>
        <span className="text-4xl font-bold text-[#D4AF37] ml-2">{hours}</span>
        <span className="text-[rgb(var(--c4))] text-sm mb-1">{t("home_hours")}</span>
      </div>

      <div className="mt-4 h-1.5 bg-[rgb(var(--c2))] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[#B8962E] via-[#D4AF37] to-[#E8C84A] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
        />
      </div>
      <p className="text-[rgb(var(--c4))] text-[10px] mt-1.5">{t("home_seasonProgress")}</p>
    </motion.div>
  );
}
