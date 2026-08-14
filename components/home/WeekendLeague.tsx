"use client";

import { motion } from "framer-motion";
import { Timer } from "lucide-react";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { useTranslation } from "@/hooks/useTranslation";
import { riseIn } from "@/lib/motion";

export function WeekendLeague() {
  const t = useTranslation();
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
      variants={riseIn}
      initial="hidden"
      animate="show"
      style={{ ["--accent" as string]: "var(--coral)" } as React.CSSProperties}
      className="surface-accent edge-light rounded-2xl p-5 relative overflow-hidden"
    >
      {/* Decorative corner */}
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-[rgb(var(--accent)/14%)] rounded-full blur-xl" />

      <div className="flex items-center gap-2 mb-4">
        <Timer size={18} className="text-[rgb(var(--accent))]" aria-hidden="true" />
        <h3 className="text-[rgb(var(--text-primary))] font-semibold text-sm">{t("home_weekendLeagueTitle")}</h3>
      </div>

      <CountdownTimer
        targetDate={nextFriday}
        label={t("home_startsIn")}
      />

      <div className="mt-4 flex items-center gap-2 text-[rgb(var(--c4))] text-[10px]">
        <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--gold))] animate-pulse" />
        {t("home_doubleTrophiesDuring")}
      </div>
    </motion.div>
  );
}
