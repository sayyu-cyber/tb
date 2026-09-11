"use client";

import { motion } from "framer-motion";
import { Award, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useHallOfFame } from "@/hooks/useHallOfFame";
import { HallOfFameRow } from "@/components/halloffame/HallOfFameRow";
import { useTranslation } from "@/hooks/useTranslation";

export default function HallOfFamePage() {
  const { entries, loading, error, refresh } = useHallOfFame();
  const t = useTranslation();

  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title={t("page_hallOfFame")} />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 mb-6 bg-[rgb(var(--gold)/5%)] border border-[rgb(var(--gold)/10%)] rounded-xl px-4 py-3"
      >
        <Award size={16} className="text-[rgb(var(--gold-ink))]" />
        <span className="text-[rgb(var(--gold-ink))] text-sm font-medium">{t("hof_allTimeGreats")}</span>
        <span className="text-[rgb(var(--c4))] text-xs ml-auto">{t("hof_rankedByPeak")}</span>
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-[rgb(var(--c2))] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-6 mx-auto max-w-xs text-center">
          <Award size={28} className="text-[rgb(var(--c3))] mx-auto mb-2" />
          <p className="text-[rgb(var(--c4))] text-sm text-balance">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[rgb(var(--c3))] px-4 py-2 text-xs font-semibold text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--c3)/70%)] transition-colors"
          >
            <RefreshCw size={13} aria-hidden="true" />
            {t("error_tryAgain")}
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-[rgb(var(--c4))] text-sm">
          {t("hof_noLegendsYet")}
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
