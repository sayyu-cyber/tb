"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Flame } from "lucide-react";
import { useEconomy } from "@/contexts/EconomyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRankLock } from "@/hooks/useRankLock";
import { useTranslation } from "@/hooks/useTranslation";
import { LobbyPhoto } from "@/components/home/LobbyPhoto";
import { Badge } from "@/components/ui/Badge";
import CoinBalance from "@/components/economy/CoinBalance";

/**
 * Cinematic featured banner for Home - the single biggest visual swing in
 * the gaming-hub redesign. Two real slides rather than one static welcome
 * banner: "Play Now" (the always-true default) and "Weekend League" (the
 * app's actual recurring event, genuinely LIVE on Fri/Sat via useRankLock -
 * not a fabricated status). No fake "TRENDING" games or invented events;
 * both slides route to real destinations (/play, /tournament).
 */
function useNextFriday8pm() {
  const [target] = useState(() => {
    const now = new Date();
    const next = new Date(now);
    next.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7));
    next.setHours(20, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 7);
    return next;
  });
  return target;
}

export function HomeLobbyHero() {
  const { state } = useEconomy();
  const { user } = useAuth();
  const { isWeekendLeague } = useRankLock();
  const t = useTranslation();
  const [slide, setSlide] = useState(0);
  const nextFriday = useNextFriday8pm();

  const username = user?.displayName || state.profile.displayName || "Player";

  const slides = [
    {
      id: "play",
      badge: { tone: "gold" as const, label: t("home_heroBadgePlay") },
      category: t("home_heroCategory"),
      title: t("home_welcomeBack").replace("{name}", username),
      description: t("home_heroTagline"),
      cta: { label: t("gamesel_startButton"), href: "/play", icon: Play },
      accent: "var(--gold)",
    },
    {
      id: "weekend",
      badge: {
        tone: "coral" as const,
        label: isWeekendLeague ? t("home_heroBadgeLive") : t("home_heroBadgeEvent"),
      },
      category: t("home_heroCategoryEvent"),
      title: t("home_weekendLeagueTitle"),
      description: t("home_doubleTrophiesDuring"),
      cta: { label: t("home_enterLeague"), href: "/tournament", icon: Flame },
      accent: "var(--coral)",
    },
  ];

  // Auto-advance every 7s; a 2-slide carousel is still a carousel, and this
  // is genuinely all the real, distinct featured content the app has today.
  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), 7000);
    return () => clearInterval(id);
  }, [slides.length]);

  const current = slides[slide];

  return (
    <div
      style={{ ["--accent" as string]: current.accent } as React.CSSProperties}
      className="relative overflow-hidden rounded-3xl border border-[rgb(var(--accent)/30%)] shadow-[var(--shadow-lg)]"
    >
      <LobbyPhoto className="absolute inset-0 w-full h-full" />

      {/* Per-slide colour wash, same device PlayLobbyHero uses for its game
          switcher - makes the Weekend League slide read as its own "room"
          rather than a re-tinted copy of the welcome slide. */}
      <motion.div
        key={current.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--accent)/20%)] via-transparent to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col min-h-[17rem] p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id + "-badge"}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2"
            >
              <Badge tone={current.badge.tone} live={current.badge.label === t("home_heroBadgeLive")}>
                {current.badge.label}
              </Badge>
              <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-white/70 [text-shadow:0_1px_4px_rgb(0_0_0/70%)]">
                {current.category}
              </span>
            </motion.div>
          </AnimatePresence>
          <CoinBalance size="sm" />
        </div>

        <div className="flex-1" />

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id + "-body"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="text-white/85 text-[11px] font-semibold uppercase tracking-widest mb-1 [text-shadow:0_1px_4px_rgb(0_0_0/70%)] sm:hidden">
                {current.category}
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-white drop-shadow-lg [text-shadow:0_2px_10px_rgb(0_0_0/60%)] truncate">
                {current.title}
              </h1>
              <p className="mt-1 max-w-md text-sm text-white/80 [text-shadow:0_1px_6px_rgb(0_0_0/60%)] line-clamp-2">
                {current.description}
              </p>
            </div>

            <Link href={current.cta.href} className="relative shrink-0">
              <motion.span
                aria-hidden="true"
                className="absolute -inset-2 rounded-[1.4rem] bg-[rgb(var(--accent)/35%)] blur-lg"
                animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.97, 1.03, 0.97] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="relative flex items-center gap-2 pl-5 pr-6 py-3.5 rounded-2xl
                           bg-gradient-to-b from-[rgb(var(--gold-bright))] to-[rgb(var(--gold-deep))]
                           text-[#0C0E12] font-black text-base tracking-wide
                           border border-[rgb(var(--gold-bright))]
                           shadow-[0_6px_24px_-4px_rgb(var(--gold)/60%),inset_0_1px_0_rgb(255_255_255/45%)]"
              >
                <current.cta.icon size={20} fill="#0C0E12" aria-hidden="true" />
                {current.cta.label}
              </motion.button>
            </Link>
          </motion.div>
        </AnimatePresence>

        {/* Carousel indicators */}
        <div className="mt-4 flex items-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setSlide(i)}
              aria-label={`Slide ${i + 1}`}
              aria-current={i === slide}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === slide ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
