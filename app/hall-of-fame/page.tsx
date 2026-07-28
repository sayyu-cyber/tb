"use client";

import { motion } from "framer-motion";
import { Award } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useHallOfFame } from "@/hooks/useHallOfFame";
import { HallOfFameRow } from "@/components/halloffame/HallOfFameRow";
import { useTranslation } from "@/hooks/useTranslation";

export default function HallOfFamePage() {
  const { entries, loading, error } = useHallOfFame();
  const t = useTranslation();

  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title={t("page_hallOfFame")} />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 mb-6 bg-[#D4AF37]/5 border border-[#D4AF37]/10 rounded-xl px-4 py-3"
      >
        <Award size={16} className="text-[#D4AF37]" />
        <span className="text-[#D4AF37] text-sm font-medium">All-Time Greats</span>
        <span className="text-[rgb(var(--c4))] text-xs ml-auto">Ranked by peak trophies</span>
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-[rgb(var(--c2))] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-[rgb(var(--c4))] text-sm">{error}</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-[rgb(var(--c4))] text-sm">
          No legends yet — climb the ranks to be the first name in the Hall of Fame.
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry, index) => (
            <HallOfFameRow key={entry.uid} entry={entry} position={index + 1} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
