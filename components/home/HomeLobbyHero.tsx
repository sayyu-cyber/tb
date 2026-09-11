"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { LobbyScene } from "@/components/home/LobbyScene";
import { WeekendLeagueBadge } from "@/components/game/WeekendLeagueBadge";
import CoinBalance from "@/components/economy/CoinBalance";

/**
 * Home's lobby banner - the same scene/composition as PlayLobbyHero, but
 * doing Home's job: a welcoming anchor with the coin balance, season
 * status and a one-tap route into Play, rather than mode selection.
 * Everything Home already had (rank progress, daily matches, shortcuts...)
 * stays exactly as it was, underneath this.
 */
export function HomeLobbyHero() {
  const { state } = useEconomy();
  const t = useTranslation();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[rgb(var(--gold)/25%)] shadow-[var(--shadow-lg)]">
      <LobbyScene className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/20" aria-hidden="true" />

      <div className="relative z-10 flex flex-col min-h-[15rem] p-4">
        <div className="flex items-center justify-between">
          <WeekendLeagueBadge />
          <CoinBalance size="sm" />
        </div>

        <div className="flex-1" />

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-white/70 text-[11px] font-semibold uppercase tracking-widest mb-1">
              {t("home_tagline")}
            </p>
            <h1 className="text-2xl font-black text-white drop-shadow-md">
              {t("home_welcomeBack").replace("{name}", state.profile.displayName || "Player")}
            </h1>
          </div>

          <Link href="/play" className="relative shrink-0">
            {/* Matches PlayLobbyHero's START - the two screens' primary
                action should look and behave like the same button. */}
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
      </div>
    </div>
  );
}
