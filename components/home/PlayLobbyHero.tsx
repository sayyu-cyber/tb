"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING, SPRING_SOFT } from "@/lib/motion";
import { Trophy, Package, ShoppingBag, Users, Play, UserPlus, Bot, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { TOKEN } from "@/constants/theme";
import { LobbyScene } from "@/components/home/LobbyScene";
import { cn } from "@/lib/utils";

const GAMES = [
  { id: "mindi", name: "Mindi", glyph: "♠", accent: TOKEN.lagoon },
  { id: "gin-rummy", name: "Gin Rummy", glyph: "♦", accent: TOKEN.deep },
] as const;

const QUICK_LINKS = [
  { href: "/friends", key: "nav_friends", icon: Users },
  { href: "/leaderboard", key: "nav_leaderboard", icon: Trophy },
  { href: "/inventory", key: "home_shortcutInventory", icon: Package },
  { href: "/shop", key: "nav_shop", icon: ShoppingBag },
] as const;

/**
 * PUBG-style lobby banner: a full-bleed scene with the primary "drop into
 * a match" action front and centre, instead of opening straight onto a
 * settings-style list of options. The detailed per-mode cards (ranked,
 * room, pass & play...) still exist below this on the Play page - this is
 * just the fast path for "I want to play right now".
 */
export function PlayLobbyHero() {
  const { isGuest } = useAuth();
  const t = useTranslation();
  const [selected, setSelected] = useState<(typeof GAMES)[number]["id"]>("mindi");
  const game = GAMES.find((g) => g.id === selected)!;
  const startHref = `/play/${game.id}/casual/${isGuest ? "ai" : "online"}`;

  return (
    <div
      style={{ ["--accent" as string]: game.accent } as React.CSSProperties}
      className="relative overflow-hidden rounded-3xl border border-[rgb(var(--accent)/25%)] shadow-[var(--shadow-lg)]"
    >
      <LobbyScene className="absolute inset-0 w-full h-full" />

      {/* The selected game washes the whole scene in its own hue, so
          switching games is a visible change of room rather than just a
          different label. A plain translucent gradient rather than a
          blend mode: mix-blend-* composites against whatever shares its
          stacking context, and this element's ancestors don't isolate one. */}
      <motion.div
        key={game.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
        className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--accent)/28%)] via-[rgb(var(--accent)/10%)] to-transparent"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/25" aria-hidden="true" />

      {/* Oversized suit mark for the selected game - same device the game
          cards below use, so the hero and the cards speak the same language. */}
      <AnimatePresence mode="wait">
        <motion.span
          key={game.id}
          initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
          animate={{ opacity: 0.14, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={SPRING_SOFT}
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 top-2 select-none font-serif leading-none
                     text-[11rem] text-[rgb(var(--accent))]"
        >
          {game.glyph}
        </motion.span>
      </AnimatePresence>

      <div className="relative z-10 flex flex-col min-h-[19rem] p-4">
        {/* Quick links row, mirroring CREW / RANK / INVENTORY / SHOP.
            Sat on a blurred pill: small white text directly over an
            illustrated sky was legible on some parts of the scene and not
            others, which is exactly the case a scrim is for. */}
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-3 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 px-3 py-1.5">
            {QUICK_LINKS.map(({ href, key, icon: Icon }) => (
              <Link
                key={key}
                href={href}
                aria-label={t(key)}
                className="flex items-center gap-1.5 text-white/85 hover:text-white transition-colors"
              >
                <Icon size={15} aria-hidden="true" />
                <span className="text-[11px] font-semibold uppercase tracking-wide hidden sm:inline">{t(key)}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        {/* Game switcher */}
        <div className="flex gap-2 mb-3">
          {GAMES.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelected(g.id)}
              style={{ ["--accent" as string]: g.accent } as React.CSSProperties}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold border transition-colors",
                selected === g.id
                  ? "bg-[rgb(var(--accent)/22%)] border-[rgb(var(--accent)/60%)] text-white"
                  : "bg-black/25 border-white/15 text-white/70"
              )}
            >
              <span className="font-serif text-sm" aria-hidden="true">{g.glyph}</span>
              {g.name}
            </button>
          ))}
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-white/70 text-[11px] font-semibold uppercase tracking-widest mb-1">{t("play_title")}</p>
            <AnimatePresence mode="wait">
              <motion.h1
                key={game.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={SPRING}
                className="text-3xl font-black text-white drop-shadow-md truncate"
              >
                {game.name}
              </motion.h1>
            </AnimatePresence>
          </div>

          <Link href={startHref} className="relative shrink-0">
            {/* Slow breathing halo. The one action the screen exists for
                should be the only thing on it that moves by itself. */}
            <motion.span
              aria-hidden="true"
              className="absolute -inset-2 rounded-[1.4rem] bg-[rgb(var(--gold)/35%)] blur-lg"
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
              <Play size={20} fill="#0C0E12" aria-hidden="true" />
              {t("gamesel_startButton")}
            </motion.button>
          </Link>
        </div>

        {/* Bottom dock, mirroring INVITE / TRAINING / ROOM / ARMORY */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <Link
            href="/friends"
            className="flex flex-col items-center gap-1 rounded-xl bg-black/30 border border-white/10 py-2 backdrop-blur-sm"
          >
            <UserPlus size={16} className="text-white/85" aria-hidden="true" />
            <span className="text-[10px] font-semibold text-white/85">{t("gamesel_dockInvite")}</span>
          </Link>
          <Link
            href={`/play/${game.id}/casual/ai`}
            className="flex flex-col items-center gap-1 rounded-xl bg-black/30 border border-white/10 py-2 backdrop-blur-sm"
          >
            <Bot size={16} className="text-white/85" aria-hidden="true" />
            <span className="text-[10px] font-semibold text-white/85">{t("gamesel_dockPractice")}</span>
          </Link>
          <Link
            href={`/play/${game.id}/room`}
            className="flex flex-col items-center gap-1 rounded-xl bg-black/30 border border-white/10 py-2 backdrop-blur-sm"
          >
            <KeyRound size={16} className="text-white/85" aria-hidden="true" />
            <span className="text-[10px] font-semibold text-white/85">{t("gamesel_privateRoom")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
