"use client";

import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { VividCard } from "@/components/ui/VividCard";

export function DailyMatchCounter() {
  const used = 1;
  const total = 3;
  const remaining = total - used;
  const t = useTranslation();

  return (
    <VividCard accent="var(--lagoon)">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-white" aria-hidden="true" />
          <h3 className="text-white font-semibold text-sm">{t("home_dailyMatches")}</h3>
        </div>
        <span className="text-white font-bold text-sm tabular-nums">{remaining} / {total}</span>
      </div>

      <div className="flex gap-2">
        {[...Array(total)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15 + i * 0.1, type: "spring" }}
            className={`flex-1 h-3 rounded-full ${i < remaining ? "bg-white" : "bg-white/20"}`}
          />
        ))}
      </div>

      <p className="text-white/70 text-[10px] mt-2">
        {t("home_resetsMidnight")}
      </p>
    </VividCard>
  );
}
