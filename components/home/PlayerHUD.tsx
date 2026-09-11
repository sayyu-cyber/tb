"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { User, Trophy, Calendar, Crown, Swords } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSeasonInfo } from "@/hooks/useSeasonInfo";
import { useCountdown } from "@/hooks/useCountdown";
import { getRankFromTrophies, RANKS } from "@/constants/ranks";
import { RankBadge } from "@/components/ui/RankBadge";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Compact horizontal "gaming profile HUD" - identity plus every real stat
 * Home already tracked (rank, trophies, daily matches, season), read from
 * the same hooks the old separate cards used, condensed into one dense
 * strip instead of five equal-weight tiles. Deliberately has no Level/XP
 * bar: the app has no level or XP system (see SideNav's IdentityCard for
 * the same reasoning), so this shows only numbers the rest of the app
 * already agrees on.
 */
export function PlayerHUD() {
  const { user, playerStats } = useAuth();
  const season = useSeasonInfo();
  const fallbackEndDate = useMemo(() => new Date(), []);
  const { days: seasonDays } = useCountdown(season?.endDate ?? fallbackEndDate);
  const t = useTranslation();

  if (!user) return null;

  const trophies = playerStats?.trophies || 0;
  const currentRank = getRankFromTrophies(trophies);
  const rankData = RANKS[currentRank.toUpperCase() as keyof typeof RANKS];
  const nextRank = Object.values(RANKS).find((r) => r.min > trophies);


  const stats = [
    {
      icon: Trophy,
      accent: "var(--gold)",
      label: t("home_trophiesLabel"),
      value: trophies.toLocaleString(),
      sub: currentRank,
    },
    {
      icon: Calendar,
      accent: "var(--lagoon)",
      label: t("profile_matches"),
      value: String(playerStats?.totalMatches ?? 0),
      sub: null,
    },
    {
      icon: Swords,
      accent: "var(--deep)",
      label: t("profile_wins"),
      value: String(playerStats?.wins ?? 0),
      sub: null,
    },
    {
      icon: Crown,
      accent: "var(--orchid)",
      label: season?.name ?? t("home_seasonEndsIn"),
      value: season ? `${seasonDays} ${t("home_days")}` : "0",
      sub: null,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className="player-hud relative border-y border-[rgb(var(--c3))] px-1 py-3.5"
    >

      <div className="relative flex flex-wrap items-center gap-x-4 gap-y-3">
        {/* Identity */}
        <div className="flex w-full sm:w-auto min-w-0 items-center gap-3 pr-4 sm:border-r border-[rgb(var(--c3))]">
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[rgb(var(--gold-bright))] to-[rgb(var(--gold-deep))] p-[2px]">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[rgb(var(--c2))]">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
              ) : (
                <User size={20} className="text-[rgb(var(--gold-ink))]" aria-hidden="true" />
              )}
            </div>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[rgb(var(--text-primary))] leading-tight">
              {user.displayName || t("profile_player")}
            </p>
            <RankBadge rank={playerStats?.currentRank || "Unranked"} size="sm" />
          </div>
        </div>

        {/* Stats */}
        {stats.map((s, i) => (
          <div
            key={s.label + i}
            style={{ ["--accent" as string]: s.accent } as React.CSSProperties}
            className="flex shrink-0 items-center gap-2.5 pr-4 last:pr-0 border-r last:border-r-0 border-[rgb(var(--c3))]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(var(--accent)/14%)]">
              <s.icon size={15} className="text-[rgb(var(--accent))]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black tabular-nums text-[rgb(var(--text-primary))] leading-tight">{s.value}</p>
              <p className="truncate max-w-[6rem] text-[9px] font-bold uppercase tracking-wider text-[rgb(var(--c4))]">
                {s.sub ?? s.label}
              </p>
            </div>
          </div>
        ))}

        {nextRank && (
          <div className="hidden lg:flex shrink-0 flex-col justify-center min-w-[7rem]">
            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[rgb(var(--c4))] mb-1">
              <span>{currentRank}</span>
              <span>{nextRank.name}</span>
            </div>
            <div className="h-1.5 w-28 rounded-full bg-[rgb(var(--c3))] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: rankData.color }}
                initial={{ width: 0 }}
                animate={{ width: `${((trophies - rankData.min) / (nextRank.min - rankData.min)) * 100}%` }}
                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
