"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Timer, Trophy, ArrowRight } from "lucide-react";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { VividCard } from "@/components/ui/VividCard";
import { useRankLock } from "@/hooks/useRankLock";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Weekend League's dedicated section - one of the app's two headline
 * features (with the games themselves), so it gets an esports-event
 * treatment rather than reading as one more stat tile: a trophy mark, a
 * genuinely-live badge (useRankLock.isWeekendLeague - the same real signal
 * RankLockBanner and WeekendLeagueBadge use, not a fabricated "LIVE"), the
 * countdown, and an explicit "Enter League" route into the real ranked
 * queue.
 */
export function WeekendLeague() {
  const t = useTranslation();
  const { isWeekendLeague } = useRankLock();
  // Next Friday at 20:00
  const now = new Date();
  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7));
  nextFriday.setHours(20, 0, 0, 0);
  if (nextFriday <= now) {
    nextFriday.setDate(nextFriday.getDate() + 7);
  }

  return (
    <VividCard accent="var(--coral)" className="home-league-panel relative">
      {/* Big trophy mark bled into the corner - the event's "artwork" in
          the absence of an uploaded banner image. */}
      <Trophy
        size={96}
        className="league-trophy pointer-events-none absolute text-white/10"
        aria-hidden="true"
      />

      <div className="relative flex items-center gap-2 mb-4">
        <Timer size={18} className="text-white" aria-hidden="true" />
        <h3 className="text-white font-bold text-base tracking-tight">{t("home_weekendLeagueTitle")}</h3>
        {isWeekendLeague && (
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="ml-auto rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[rgb(var(--coral-deep))]"
          >
            {t("home_heroBadgeLive")}
          </motion.span>
        )}
      </div>

      {!isWeekendLeague && <div className="relative">
        <CountdownTimer targetDate={nextFriday} label={t("home_startsIn")} />
      </div>}

      <div className="relative mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-white/70 text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          {t("home_doubleTrophiesDuring")}
        </div>

        <Link
          href="/tournament"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wide text-[rgb(var(--coral-deep))] shadow-[0_4px_14px_-3px_rgb(0_0_0/35%)] hover:brightness-95 transition-[filter]"
        >
          {t("home_enterLeague")}
          <ArrowRight size={12} aria-hidden="true" />
        </Link>
      </div>
    </VividCard>
  );
}
