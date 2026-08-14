"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

const games = [
  {
    id: "mindi",
    name: "Mindi",
    subtitle: "Maldivian Classic",
    color: "from-[rgb(var(--gold)/20%)] to-[rgb(var(--gold-deep)/10%)]",
    borderColor: "border-[rgb(var(--gold)/30%)]",
    icon: "♠",
  },
  {
    id: "gin-rummy",
    name: "Gin Rummy",
    subtitle: "Strategic Fun",
    color: "from-[rgb(var(--gold)/10%)] to-[rgb(var(--gold-deep)/5%)]",
    borderColor: "border-[rgb(var(--gold)/20%)]",
    icon: "♥",
  },
];

export function QuickPlayButtons() {
  const t = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <Sparkles size={16} className="text-[rgb(var(--gold))]" />
        <h3 className="text-[rgb(var(--text-primary))] font-semibold text-sm">{t("home_quickPlay")}</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {games.map((game, index) => (
          <Link key={game.id} href="/play">
            <motion.div
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + index * 0.1 }}
              className={`relative overflow-hidden rounded-2xl p-4 border ${game.borderColor} bg-gradient-to-br ${game.color} cursor-pointer group`}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 bg-[rgb(var(--gold)/0%)] group-hover:bg-[rgb(var(--gold)/5%)] transition-colors duration-300" />

              <div className="relative z-10">
                <span className="text-3xl mb-2 block">{game.icon}</span>
                <h4 className="text-[rgb(var(--text-primary))] font-semibold text-sm">{game.name}</h4>
                <p className="text-[rgb(var(--c4))] text-[10px] mt-0.5">{game.subtitle}</p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
