"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ProfileCard } from "@/components/home/ProfileCard";
import { SeasonCard } from "@/components/home/SeasonCard";
import { MatchesRemaining } from "@/components/home/MatchesRemaining";
import { QuickPlayButtons } from "@/components/home/QuickPlayButtons";
import { NewsSection } from "@/components/home/NewsSection";
import { WeekendLeague } from "@/components/home/WeekendLeague";
import { RankProgress } from "@/components/home/RankProgress";
import { DailyMatchCounter } from "@/components/home/DailyMatchCounter";
import { RankLockBanner } from "@/components/game/RankLockBanner";
import { WeekendLeagueBadge } from "@/components/game/WeekendLeagueBadge";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Secondary navigation tiles. Extracted from eight near-identical inline
 * blocks so the markup lives in one place and the labels can be
 * translated - they were hardcoded English until now.
 */
const SHORTCUTS = [
  { href: "/friends", key: "home_shortcutFriends" },
  { href: "/play", key: "home_shortcutRooms" },
  { href: "/tournament", key: "home_shortcutWeekend" },
  { href: "/hall-of-fame", key: "home_shortcutHof" },
  { href: "/inventory", key: "home_shortcutInventory" },
  { href: "/clubs", key: "home_shortcutClubs" },
  { href: "/shop", key: "home_shortcutVip" },
  { href: "/shop", key: "home_shortcutShop" },
] as const;

export default function HomePage() {
  const t = useTranslation();
  return (
    <div className="px-4 pt-6 pb-6 space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-bold text-[rgb(var(--text-primary))]">{t("home_title")}</h1>
          <p className="text-[rgb(var(--c4))] text-xs">{t("home_tagline")}</p>
        </div>
        <WeekendLeagueBadge />
      </motion.div>

      <RankLockBanner />

      {/*
        Below md this collapses to a single column and renders exactly as
        before. From md up the cards tile into 2 (then 3) columns so a
        desktop viewport shows the whole dashboard at once instead of
        demanding a long scroll through a phone-width ribbon.

        auto-rows-min stops a short card (Daily Matches) from being
        stretched to match a tall neighbour (News) in the same row.
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-min items-start">
        {/* Identity block reads as the page's anchor, so it spans the row. */}
        <div className="md:col-span-2 lg:col-span-3">
          <ProfileCard />
        </div>

        <RankProgress />
        <DailyMatchCounter />
        <SeasonCard />
        <MatchesRemaining remaining={2} total={3} />
        <WeekendLeague />

        {/* Quick Play is the primary action - give it a full row on md so
            the two game tiles stay large and thumb-friendly. */}
        <div className="md:col-span-2 lg:col-span-1">
          <QuickPlayButtons />
        </div>

        <div className="md:col-span-2 lg:col-span-2">
          <NewsSection />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2 md:col-span-2 lg:col-span-1"
        >
          {SHORTCUTS.map(({ href, key }) => (
            <Link key={key} href={href}>
              <div className="h-full glass-card rounded-xl p-3 flex items-center justify-center border border-[#D4AF37]/15 hover:border-[#D4AF37]/30 transition-colors">
                <p className="text-[#D4AF37] text-[10px] text-center tracking-wider uppercase leading-tight">
                  {t(key)}
                </p>
              </div>
            </Link>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
