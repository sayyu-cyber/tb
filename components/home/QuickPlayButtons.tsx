"use client";

import { motion } from "framer-motion";
import { Sparkles, Play, Users } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { riseIn, staggerParent } from "@/lib/motion";
import { TOKEN } from "@/constants/theme";
import { VividCard } from "@/components/ui/VividCard";

/**
 * Each game keeps its own hue and suit, matching the Play screen and the
 * in-match table, so a player builds one consistent association rather
 * than seeing everything in gold. `players` is the real seat count each
 * game supports (not a fabricated live player count - the app has no
 * concurrent-player metric to show here).
 */
const games = [
  { id: "mindi", name: "Mindi", subtitle: "Maldivian Classic", suit: "♠", accent: TOKEN.lagoon, players: "2-4 Players" },
  { id: "gin-rummy", name: "Gin Rummy", subtitle: "Strategic Fun", suit: "♦", accent: TOKEN.deep, players: "2 Players" },
];

/**
 * "Popular Games" / "Quick Play" - one wide artwork-style tile per game
 * rather than the small square icon tiles this used to be. There's no
 * uploaded game art to drop in, so each tile builds its own "artwork" from
 * an oversized suit glyph, a diagonal light sweep and the game's accent
 * colour - a real placeholder system (swap the glyph layer for an <Image>
 * later) rather than a flat colour block standing in for missing art.
 */
export function QuickPlayButtons() {
  const t = useTranslation();
  const { isGuest } = useAuth();

  return (
    <motion.div variants={riseIn}>
      <div className="mb-3 flex items-center gap-2 px-1">
        <Sparkles size={15} className="text-[rgb(var(--gold-ink))]" aria-hidden="true" />
        <h3 className="text-sm font-bold tracking-tight text-[rgb(var(--text-primary))]">{t("home_quickPlay")}</h3>
      </div>

      <motion.div variants={staggerParent(0.06)} initial="hidden" animate="show" className="flex flex-col gap-3">
        {games.map((game) => (
          <motion.div key={game.id} variants={riseIn}>
            <Link href={`/play/${game.id}/casual/${isGuest ? "ai" : "online"}`} className="block">
              <VividCard accent={game.accent} className="group !p-4 h-28 sm:h-32">
                <div className="flex h-full items-center gap-4">
                  {/* Oversized suit "artwork" - zooms slightly on hover, the
                      same micro-interaction real game tiles use for cover art. */}
                  <div className="relative h-full w-20 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-black/20">
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-0 flex items-center justify-center font-serif text-white leading-none"
                      style={{ fontSize: "3.5rem" }}
                      initial={{ scale: 1 }}
                      whileHover={{ scale: 1.12 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      {game.suit}
                    </motion.span>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" aria-hidden="true" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                        <Users size={9} aria-hidden="true" />
                        {game.players}
                      </span>
                    </div>
                    <h4 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">{game.name}</h4>
                    <p className="text-[11px] text-white/80 font-semibold truncate">{game.subtitle}</p>
                  </div>

                  <span
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider
                               bg-gradient-to-b from-[rgb(var(--gold-bright))] to-[rgb(var(--gold-deep))] text-[#0C0E12]
                               shadow-[0_4px_10px_-2px_rgb(0_0_0/45%),inset_0_1px_0_rgb(255_255_255/50%)]"
                  >
                    <Play size={11} fill="currentColor" aria-hidden="true" />
                    {t("nav_play")}
                  </span>
                </div>
              </VividCard>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
