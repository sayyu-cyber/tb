"use client";

import { motion } from "framer-motion";
import { Newspaper, ChevronRight } from "lucide-react";
import { useNews } from "@/hooks/useNews";
import { NewsItem } from "@/types";

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
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

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.1 }}
      whileHover={{ x: 4 }}
      className="flex items-start gap-3 p-3 rounded-xl bg-[#1A1A1A]/50 border border-[#2A2A2A] hover:border-[#D4AF37]/20 transition-colors cursor-pointer group"
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
    </motion.div>
  );
}

export function NewsSection() {
  const { news, loading } = useNews();

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
            <NewsCard key={item.id} item={item} index={index} />
          ))
        )}
      </div>
    </motion.div>
  );
}
