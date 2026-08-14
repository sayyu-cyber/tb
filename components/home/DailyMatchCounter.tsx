"use client";

import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { riseIn } from "@/lib/motion";

export function DailyMatchCounter() {
  const used = 1;
  const total = 3;
  const remaining = total - used;
  const t = useTranslation();

  return (
    <motion.div
      variants={riseIn}
      initial="hidden"
      animate="show"
      style={{ ["--accent" as string]: "var(--lagoon)" } as React.CSSProperties}
      className="surface-accent edge-light rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-[rgb(var(--accent))]" aria-hidden="true" />
          <h3 className="text-[rgb(var(--text-primary))] font-semibold text-sm">{t("home_dailyMatches")}</h3>
        </div>
        <span className="text-[rgb(var(--accent))] font-bold text-sm tabular-nums">{remaining} / {total}</span>
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
                ? "bg-gradient-to-r from-[rgb(var(--accent)/70%)] to-[rgb(var(--accent))]"
                : "bg-[rgb(var(--c3))]"
            }`}
          />
        ))}
      </div>

      <p className="text-[rgb(var(--c4))] text-[10px] mt-2">
        {t("home_resetsMidnight")}
      </p>
    </motion.div>
  );
}
