"use client";

import Link from "next/link";
import { Users, KeyRound, Flame, Award, Package, Shield, Crown, ShoppingBag } from "lucide-react";
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
      <motion.div
        variants={staggerParent(0.05)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-min items-start"
      >
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
          variants={riseIn}
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2 md:col-span-2 lg:col-span-1"
        >
          {SHORTCUTS.map(({ href, key, icon: Icon, accent }) => (
            <Link key={key} href={href}>
              <div
                style={{ ["--accent" as string]: accent } as React.CSSProperties}
                className="h-full min-h-[72px] rounded-xl border border-[rgb(var(--c3))] bg-[rgb(var(--c2))]
                           flex flex-col items-center justify-center gap-1.5 p-2 transition-colors
                           hover:border-[rgb(var(--accent)/45%)] hover:bg-[rgb(var(--accent)/8%)]"
              >
                <Icon size={17} className="text-[rgb(var(--accent))]" aria-hidden="true" />
                <p className="text-[rgb(var(--c5))] text-[10px] text-center font-semibold tracking-wide leading-tight">
                  {t(key)}
                </p>
              </div>
            </Link>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
