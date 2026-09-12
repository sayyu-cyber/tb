"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, ChevronRight, X, Megaphone, Sparkles, PartyPopper } from "lucide-react";
import { useNews } from "@/hooks/useNews";
import { NewsItem } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";

const typeColors = {
  announcement: "text-[rgb(var(--gold-ink))]",
  update: "text-[rgb(var(--lagoon-ink))]",
  event: "text-[rgb(var(--coral-ink))]",
};

const typeAccent = {
  announcement: "var(--gold)",
  update: "var(--lagoon)",
  event: "var(--coral)",
};

const typeIcon = {
  announcement: Megaphone,
  update: Sparkles,
  event: PartyPopper,
};

const typeLabels = {
  announcement: "ANNOUNCEMENT",
  update: "UPDATE",
  event: "EVENT",
};

function NewsCard({ item, index, onClick }: { item: NewsItem; index: number; onClick: () => void }) {
  const Icon = typeIcon[item.type];
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      style={{ ["--accent" as string]: typeAccent[item.type] } as React.CSSProperties}
      className="w-full flex items-start gap-3 p-3 rounded-xl bg-[rgb(var(--c2)/70%)] border border-[rgb(var(--c3))]
                 border-l-2 border-l-[rgb(var(--accent)/60%)]
                 hover:border-[rgb(var(--accent)/45%)] hover:bg-[rgb(var(--accent)/6%)] transition-colors cursor-pointer group text-left"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--accent)/14%)]">
        <Icon size={14} className="text-[rgb(var(--accent))]" aria-hidden="true" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[9px] font-bold tracking-wider ${typeColors[item.type]}`}>
            {typeLabels[item.type]}
          </span>
          <span className="text-[rgb(var(--c4))] text-[9px]">
            {item.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
        <h4 className="text-[rgb(var(--text-primary))] text-sm font-semibold truncate group-hover:text-[rgb(var(--accent))] transition-colors">
          {item.title}
        </h4>
        <p className="text-[rgb(var(--c4))] text-xs mt-0.5 line-clamp-1">{item.content}</p>
      </div>
      <ChevronRight size={16} className="text-[rgb(var(--c3))] group-hover:text-[rgb(var(--accent))] transition-colors mt-1 shrink-0" />
    </motion.button>
  );
}

export function NewsSection() {
  const { news, loading } = useNews();
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const t = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 34, delay: 0.25 }}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <Newspaper size={16} className="text-[rgb(var(--gold-ink))]" />
        <h3 className="text-[rgb(var(--text-primary))] font-semibold text-sm">{t("home_newsUpdates")}</h3>
      </div>

      <div className="space-y-2">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-[rgb(var(--c2))] rounded-xl animate-pulse" />
          ))
        ) : (
          news.map((item, index) => (
            <NewsCard key={item.id} item={item} index={index} onClick={() => setSelected(item)} />
          ))
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card rounded-2xl p-5 w-full max-w-sm border border-[rgb(var(--gold)/20%)]"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className={`text-[9px] font-bold tracking-wider ${typeColors[selected.type]}`}>
                    {typeLabels[selected.type]}
                  </span>
                  <p className="text-[rgb(var(--c3))] text-[10px] mt-0.5">
                    {selected.date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <button aria-label={t("a11y_close")} onClick={() => setSelected(null)} className="p-1.5 rounded-lg bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
                  <X size={16} className="text-[rgb(var(--c4))]" />
                </button>
              </div>
              <h3 className="text-[rgb(var(--text-primary))] font-bold text-lg mb-2">{selected.title}</h3>
              <p className="text-[rgb(var(--c5))] text-sm leading-relaxed">{selected.content}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
