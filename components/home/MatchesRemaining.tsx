"use client";

import { motion } from "framer-motion";
import { Swords } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { riseIn } from "@/lib/motion";

interface MatchesRemainingProps {
  remaining: number;
  total: number;
}

export function MatchesRemaining({ remaining, total }: MatchesRemainingProps) {
  const percentage = ((total - remaining) / total) * 100;
  const t = useTranslation();

  return (
    <motion.div
      variants={riseIn}
      initial="hidden"
      animate="show"
      style={{ ["--accent" as string]: "var(--deep)" } as React.CSSProperties}
      className="surface-accent edge-light rounded-2xl p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <Swords size={18} className="text-[rgb(var(--accent))]" aria-hidden="true" />
        <h3 className="text-[rgb(var(--text-primary))] font-semibold text-sm">{t("home_rankedMatches")}</h3>
      </div>

      <div className="flex items-baseline gap-1 mb-3">
        <motion.span
          className="text-3xl font-black text-[rgb(var(--accent))] tabular-nums"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {remaining}
        </motion.span>
        <span className="text-[rgb(var(--c4))] text-sm">{t("home_remainingOf").replace("{n}", String(total))}</span>
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
                ? "bg-gradient-to-r from-[rgb(var(--accent)/70%)] to-[rgb(var(--accent))]"
                : "bg-[rgb(var(--c3))]"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}
