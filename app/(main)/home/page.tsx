"use client";

import Link from "next/link";
import { Users, KeyRound, Flame, Award, Package, Shield, Crown, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { HomeLobbyHero } from "@/components/home/HomeLobbyHero";
import { PlayerHUD } from "@/components/home/PlayerHUD";
import { LoadoutPreview } from "@/components/home/LoadoutPreview";
import { QuickPlayButtons } from "@/components/home/QuickPlayButtons";
import { NewsSection } from "@/components/home/NewsSection";
import { WeekendLeague } from "@/components/home/WeekendLeague";
import { RankProgress } from "@/components/home/RankProgress";
import { RankLockBanner } from "@/components/game/RankLockBanner";
import { useTranslation } from "@/hooks/useTranslation";
import { riseIn, staggerParent } from "@/lib/motion";

/**
 * Secondary navigation tiles. Extracted from eight near-identical inline
 * blocks so the markup lives in one place and the labels can be
 * translated - they were hardcoded English until now.
 */
const SHORTCUTS = [
  { href: "/friends", key: "home_shortcutFriends", icon: Users, accent: "var(--deep)" },
  { href: "/play", key: "home_shortcutRooms", icon: KeyRound, accent: "var(--orchid)" },
  { href: "/tournament", key: "home_shortcutWeekend", icon: Flame, accent: "var(--coral)" },
  { href: "/hall-of-fame", key: "home_shortcutHof", icon: Award, accent: "var(--gold)" },
  { href: "/inventory", key: "home_shortcutInventory", icon: Package, accent: "var(--lagoon)" },
  { href: "/clubs", key: "home_shortcutClubs", icon: Shield, accent: "var(--deep)" },
  { href: "/shop", key: "home_shortcutVip", icon: Crown, accent: "var(--orchid)" },
  { href: "/shop", key: "home_shortcutShop", icon: ShoppingBag, accent: "var(--gold)" },
] as const;

export default function HomePage() {
  const t = useTranslation();
  return (
    <div className="px-4 pt-6 pb-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <HomeLobbyHero />
      </motion.div>

      {/* Compact gaming profile HUD - identity, trophies, daily matches,
          ranked matches and season, all in one dense strip. Replaces the
          old ProfileCard/DailyMatchCounter/SeasonCard tiles, which showed
          the same numbers again at full-card size further down. */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <PlayerHUD />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
        <QuickPlayButtons />
        <LoadoutPreview />
      </div>
      <RankLockBanner />
      <motion.div
        variants={staggerParent(0.05)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-min items-start"
      >
        <RankProgress />
        <WeekendLeague />

        <motion.div
          variants={riseIn}
          className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-4 gap-2 lg:col-span-1"
        >
          {SHORTCUTS.map(({ href, key, icon: Icon, accent }) => (
            <Link key={key} href={href}>
              <motion.div
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                style={{ ["--accent" as string]: accent } as React.CSSProperties}
                className="h-full min-h-[76px] rounded-lg border border-[rgb(var(--c3))] bg-[rgb(var(--c2))]
                           flex flex-col items-center justify-center gap-1.5 p-2 transition-colors
                           hover:border-[rgb(var(--accent)/50%)] hover:shadow-[0_6px_18px_-6px_rgb(var(--accent)/50%)]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(var(--accent)/14%)]">
                  <Icon size={16} className="text-[rgb(var(--accent))]" aria-hidden="true" />
                </span>
                <p className="text-[rgb(var(--c5))] text-[10px] text-center font-semibold tracking-wide leading-tight">
                  {t(key)}
                </p>
              </motion.div>
            </Link>
          ))}
        </motion.div>

        <div className="md:col-span-2 lg:col-span-3">
          <NewsSection />
        </div>
      </motion.div>

    </div>
  );
}
