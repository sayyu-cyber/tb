"use client";

import { motion } from "framer-motion";
import { Crown, Calendar } from "lucide-react";
import { useSeasonInfo } from "@/hooks/useSeasonInfo";
import { useCountdown } from "@/hooks/useCountdown";
import { useTranslation } from "@/hooks/useTranslation";
import { VividCard } from "@/components/ui/VividCard";

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
    <VividCard accent="var(--orchid)">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown size={18} className="text-white" aria-hidden="true" />
          <h3 className="text-white font-semibold">{season.name}</h3>
        </div>
        <div className="flex items-center gap-1 text-white/70">
          <Calendar size={14} />
          <span className="text-xs">{t("home_seasonEndsIn")}</span>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <span className="text-4xl font-black text-white tabular-nums">{days}</span>
        <span className="text-white/70 text-sm mb-1">{t("home_days")}</span>
        <span className="text-4xl font-bold text-white/90 ml-2 tabular-nums">{hours}</span>
        <span className="text-white/70 text-sm mb-1">{t("home_hours")}</span>
      </div>

      <div className="mt-4 h-1.5 bg-white/25 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-white rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
        />
      </div>
      <p className="text-white/70 text-[10px] mt-1.5">{t("home_seasonProgress")}</p>
    </VividCard>
  );
}
