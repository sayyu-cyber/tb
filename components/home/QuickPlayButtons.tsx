"use client";

import { motion } from "framer-motion";
import { Sparkles, Play } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { riseIn, staggerParent } from "@/lib/motion";
import { TOKEN } from "@/constants/theme";

/**
 * Each game keeps its own hue and suit, matching the Play screen and the
 * in-match table, so a player builds one consistent association rather
 * than seeing everything in gold.
 */
const games = [
  { id: "mindi", name: "Mindi", subtitle: "Maldivian Classic", suit: "♠", accent: TOKEN.lagoon },
  { id: "gin-rummy", name: "Gin Rummy", subtitle: "Strategic Fun", suit: "♦", accent: TOKEN.deep },
];

export function QuickPlayButtons() {
  const t = useTranslation();

  return (
    <motion.div variants={riseIn}>
      <div className="mb-3 flex items-center gap-2 px-1">
        <Sparkles size={15} className="text-[rgb(var(--gold))]" aria-hidden="true" />
        <h3 className="text-sm font-bold tracking-tight text-[rgb(var(--text-primary))]">{t("home_quickPlay")}</h3>
      </div>

      <motion.div variants={staggerParent(0.06)} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
        {games.map((game) => (
          <motion.div key={game.id} variants={riseIn}>
            <Link href="/play" className="block h-full">
              <motion.div
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                style={{ ["--accent" as string]: game.accent } as React.CSSProperties}
                className="group surface-accent edge-light relative h-full overflow-hidden rounded-2xl p-4"
              >
                {/* Suit sits behind the label as a watermark and brightens on
                    hover - gives the tile depth without extra chrome. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-5 -right-2 select-none font-serif text-[5rem]
                             leading-none text-[rgb(var(--accent))] opacity-[0.12]
                             transition-opacity duration-300 group-hover:opacity-25"
                >
                  {game.suit}
                </span>

                <span
                  aria-hidden="true"
                  className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl
                             bg-[rgb(var(--accent)/15%)] font-serif text-lg text-[rgb(var(--accent))]"
                >
                  {game.suit}
                </span>

                <h4 className="relative text-sm font-bold text-[rgb(var(--text-primary))]">{game.name}</h4>
                <p className="relative mt-0.5 text-[10px] text-[rgb(var(--c4))]">{game.subtitle}</p>

                <span className="relative mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--accent))]">
                  <Play size={10} fill="currentColor" aria-hidden="true" />
                  {t("nav_play")}
                </span>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
