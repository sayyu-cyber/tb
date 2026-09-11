"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Trophy, Play, Flame, KeyRound, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { riseIn, staggerParent } from "@/lib/motion";
import { TOKEN } from "@/constants/theme";

/**
 * Horizontal "Popular Modes" row - the reference this was built from scrolls
 * through many different games, which Thaasbai doesn't have (there are two:
 * Mindi and Gin Rummy). Real modes fill the same shape instead: Ranked,
 * Casual, Weekend League, Private Room and Pass & Play are all genuine,
 * playable destinations, so the row has enough real content to scroll
 * through rather than padding it out with placeholders.
 *
 * Every mode defaults to Mindi - the routes are per-game
 * (/play/[game]/...), and there's no mode-only route to send someone to
 * without picking a game first. The Play page itself still lets a player
 * choose Gin Rummy instead.
 */
export function PopularModes() {
  const { isGuest } = useAuth();
  const t = useTranslation();
  const scrollerRef = useRef<HTMLDivElement>(null);

  const modes = [
    { key: "gamesel_rankedMode", href: "/play/mindi/ranked", icon: Trophy, accent: TOKEN.gold },
    { key: "gamesel_casualMode", href: `/play/mindi/casual/${isGuest ? "ai" : "online"}`, icon: Play, accent: TOKEN.lagoon },
    { key: "home_weekendLeagueTitle", href: "/tournament", icon: Flame, accent: TOKEN.coral },
    { key: "gamesel_privateRoom", href: "/play/mindi/room", icon: KeyRound, accent: TOKEN.orchid },
    { key: "gamesel_passPlay", href: "/play/mindi/casual/passplay", icon: Users, accent: TOKEN.deep },
  ] as const;

  const scrollBy = (dir: 1 | -1) => scrollerRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });

  return (
    <motion.div variants={riseIn}>
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-sm font-bold tracking-tight text-[rgb(var(--text-primary))]">{t("home_popularModes")}</h3>
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c5))] hover:bg-[rgb(var(--c3))] transition-colors"
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c5))] hover:bg-[rgb(var(--c3))] transition-colors"
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <motion.div
        ref={scrollerRef}
        variants={staggerParent(0.06)}
        initial="hidden"
        animate="show"
        className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory"
      >
        {modes.map((mode) => (
          <motion.div key={mode.key} variants={riseIn} className="shrink-0 snap-start">
            <Link href={mode.href}>
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                style={{ ["--accent" as string]: mode.accent } as React.CSSProperties}
                className="group relative w-44 h-24 overflow-hidden rounded-2xl p-3 flex items-center justify-between gap-2
                           shadow-[0_10px_24px_-8px_rgb(var(--accent)/50%)] ring-1 ring-inset ring-white/15
                           transition-shadow duration-300 hover:shadow-[0_14px_32px_-6px_rgb(var(--accent)/65%)]"
              >
                <div className="absolute inset-0 bg-[rgb(var(--accent))]" aria-hidden="true" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" aria-hidden="true" />
                <div className="absolute inset-0 bg-gradient-to-br from-black/0 via-black/10 to-black/50" aria-hidden="true" />
                <mode.icon
                  size={34}
                  className="relative shrink-0 text-white/25 transition-transform duration-300 group-hover:scale-110 group-hover:text-white/35"
                  aria-hidden="true"
                />
                <div className="relative min-w-0 text-right">
                  <p className="text-white text-xs font-bold leading-tight truncate">{t(mode.key)}</p>
                  <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-white/80">
                    <Play size={8} fill="currentColor" aria-hidden="true" />
                    {t("nav_play")}
                  </span>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
