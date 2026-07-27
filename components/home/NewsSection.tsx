"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, ChevronRight, X } from "lucide-react";
import { useNews } from "@/hooks/useNews";
import { NewsItem } from "@/types";

const typeColors = {
  announcement: "text-[#D4AF37]",
  update: "text-[#3EB489]",
  event: "text-[#E8C84A]",
};

const typeLabels = {
  announcement: "ANNOUNCEMENT",
  update: "UPDATE",
  event: "EVENT",
};

function NewsCard({ item, index, onClick }: { item: NewsItem; index: number; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.1 }}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      className="w-full flex items-start gap-3 p-3 rounded-xl bg-[#1A1A1A]/50 border border-[#2A2A2A] hover:border-[#D4AF37]/20 transition-colors cursor-pointer group text-left"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[9px] font-bold tracking-wider ${typeColors[item.type]}`}>
            {typeLabels[item.type]}
          </span>
          <span className="text-[#2A2A2A] text-[9px]">
            {item.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
        <h4 className="text-white text-sm font-medium truncate group-hover:text-[#D4AF37] transition-colors">
          {item.title}
        </h4>
        <p className="text-[#3A3A3A] text-xs mt-0.5 line-clamp-1">{item.content}</p>
      </div>
      <ChevronRight size={16} className="text-[#2A2A2A] group-hover:text-[#D4AF37] transition-colors mt-1 shrink-0" />
    </motion.button>
  );
}

export function NewsSection() {
  const { news, loading } = useNews();
  const [selected, setSelected] = useState<NewsItem | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <Newspaper size={16} className="text-[#D4AF37]" />
        <h3 className="text-white font-semibold text-sm">News & Updates</h3>
      </div>

      <div className="space-y-2">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-[#1A1A1A] rounded-xl animate-pulse" />
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
              className="glass-card rounded-2xl p-5 w-full max-w-sm border border-[#D4AF37]/20"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className={`text-[9px] font-bold tracking-wider ${typeColors[selected.type]}`}>
                    {typeLabels[selected.type]}
                  </span>
                  <p className="text-[#2A2A2A] text-[10px] mt-0.5">
                    {selected.date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A]">
                  <X size={16} className="text-[#3A3A3A]" />
                </button>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{selected.title}</h3>
              <p className="text-[#888888] text-sm leading-relaxed">{selected.content}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
