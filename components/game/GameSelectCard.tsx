"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Swords, Lock, Bot, Smartphone, KeyRound, UsersRound, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { riseIn, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface GameSelectCardProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  players: string;
  index: number;
}

export function GameSelectCard({ id, name, description, icon, color, players, index }: GameSelectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { isGuest } = useAuth();
  const t = useTranslation();

  return (
    <motion.div
      variants={riseIn}
      initial="hidden"
      animate="show"
      transition={{ ...SPRING, delay: index * 0.06 }}
      // `color` is the game's accent token; every tint below derives from
      // it, so Mindi and Gin Rummy no longer render identically in gold.
      style={{ ["--accent" as string]: color } as React.CSSProperties}
      className="surface-accent edge-light relative overflow-hidden rounded-3xl"
    >
      {/* Oversized suit glyph bled off the corner - gives each game a
          distinct silhouette at a glance rather than relying on the title. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-4 -top-6 select-none text-[7rem] leading-none
                   font-serif text-[rgb(var(--accent))] opacity-[0.10]"
      >
        {icon}
      </span>

      <div className="relative p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <span
              aria-hidden="true"
              className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl
                         bg-[rgb(var(--accent)/14%)] border border-[rgb(var(--accent)/28%)]
                         text-2xl font-serif text-[rgb(var(--accent))]"
            >
              {icon}
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-[rgb(var(--text-primary))]">{name}</h2>
            <p className="text-[rgb(var(--c5))] text-sm mt-1 leading-relaxed">{description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-[rgb(var(--accent)/28%)]
                          bg-[rgb(var(--accent)/10%)] px-3 py-1.5">
            <Users size={13} className="text-[rgb(var(--accent))]" aria-hidden="true" />
            <span className="text-[rgb(var(--accent))] text-xs font-semibold whitespace-nowrap">{players}</span>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              {/* Casual Mode */}
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-[rgb(var(--c4))] text-[10px] font-bold uppercase tracking-widest"><span className="h-3 w-0.5 rounded bg-[rgb(var(--accent))]" />{t("gamesel_casualMode")}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Link href={`/play/${id}/casual/ai`}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-[rgb(var(--c3))] bg-[rgb(var(--c2))] text-[rgb(var(--text-primary))] text-sm font-medium transition-colors hover:border-[rgb(var(--accent)/45%)] hover:bg-[rgb(var(--accent)/8%)]"
                    >
                      <Bot size={16} className="text-[rgb(var(--accent))]" aria-hidden="true" />
                      <span className="text-sm">{t("gamesel_vsAI")}</span>
                    </motion.button>
                  </Link>
                  <Link href={`/play/${id}/casual/passplay`}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-[rgb(var(--c3))] bg-[rgb(var(--c2))] text-[rgb(var(--text-primary))] text-sm font-medium transition-colors hover:border-[rgb(var(--accent)/45%)] hover:bg-[rgb(var(--accent)/8%)]"
                    >
                      <Smartphone size={16} className="text-[rgb(var(--accent))]" aria-hidden="true" />
                      <span className="text-sm">{t("gamesel_passPlay")}</span>
                    </motion.button>
                  </Link>
                </div>
                {isGuest ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
                    <Lock size={16} className="text-[rgb(var(--c4))]" />
                    <p className="text-[rgb(var(--c4))] text-sm">{t("gamesel_signInCasualOnline")}</p>
                  </div>
                ) : (
                  <Link href={`/play/${id}/casual/online`}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-[rgb(var(--c3))] bg-[rgb(var(--c2))] text-[rgb(var(--text-primary))] text-sm font-medium transition-colors hover:border-[rgb(var(--accent)/45%)] hover:bg-[rgb(var(--accent)/8%)]"
                    >
                      <Globe size={16} className="text-[rgb(var(--accent))]" aria-hidden="true" />
                      <span className="text-sm">{id === "mindi" ? t("gamesel_onlineMindi") : t("gamesel_online")}</span>
                    </motion.button>
                  </Link>
                )}
              </div>

              {/* Ranked Mode */}
              <div className="space-y-2 pt-2">
                <p className="flex items-center gap-2 text-[rgb(var(--c4))] text-[10px] font-bold uppercase tracking-widest"><span className="h-3 w-0.5 rounded bg-[rgb(var(--gold))]" />{t("gamesel_rankedMode")}</p>
                {isGuest ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
                    <Lock size={16} className="text-[rgb(var(--c4))]" />
                    <p className="text-[rgb(var(--c4))] text-sm">{t("gamesel_signInRanked")}</p>
                  </div>
                ) : id === "mindi" ? (
                  <Link href={`/play/${id}/ranked-duo`}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[rgb(var(--gold-bright))] to-[rgb(var(--gold-deep))] text-[#0C0E12] font-bold text-sm shadow-[0_4px_18px_-4px_rgb(var(--gold)/50%)] hover:brightness-110 transition-[filter]"
                    >
                      <Swords size={16} />
                      <span>{t("gamesel_playRankedDuo")}</span>
                    </motion.button>
                  </Link>
                ) : (
                  <>
                    <Link href={`/play/${id}/ranked`}>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[rgb(var(--gold-bright))] to-[rgb(var(--gold-deep))] text-[#0C0E12] font-bold text-sm shadow-[0_4px_18px_-4px_rgb(var(--gold)/50%)] hover:brightness-110 transition-[filter]"
                      >
                        <Swords size={16} />
                        <span>{t("gamesel_ranked1v1")}</span>
                      </motion.button>
                    </Link>
                    <Link href={`/play/${id}/ranked-duo`}>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center justify-center gap-2 bg-[rgb(var(--c2))] border border-[rgb(var(--gold)/30%)] text-[rgb(var(--text-primary))] font-medium rounded-xl py-3 mt-2"
                      >
                        <UsersRound size={16} className="text-[rgb(var(--gold))]" aria-hidden="true" />
                        <span className="text-sm">{t("gamesel_ranked2v2")}</span>
                      </motion.button>
                    </Link>
                  </>
                )}
              </div>

              {/* Private Room */}
              <div className="space-y-2 pt-2">
                <p className="flex items-center gap-2 text-[rgb(var(--c4))] text-[10px] font-bold uppercase tracking-widest"><span className="h-3 w-0.5 rounded bg-[rgb(var(--orchid))]" />{t("gamesel_playWithFriends")}</p>
                {isGuest ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
                    <Lock size={16} className="text-[rgb(var(--c4))]" />
                    <p className="text-[rgb(var(--c4))] text-sm">{t("gamesel_signInPrivateRooms")}</p>
                  </div>
                ) : (
                  <Link href={`/play/${id}/room`}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-[rgb(var(--c3))] bg-[rgb(var(--c2))] text-[rgb(var(--text-primary))] text-sm font-medium transition-colors hover:border-[rgb(var(--accent)/45%)] hover:bg-[rgb(var(--accent)/8%)]"
                    >
                      <KeyRound size={16} className="text-[rgb(var(--orchid))]" aria-hidden="true" />
                      <span className="text-sm">{t("gamesel_privateRoom")}</span>
                    </motion.button>
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-4 min-h-[44px] rounded-xl border border-[rgb(var(--accent)/28%)]
                     text-[rgb(var(--accent))] text-sm font-semibold
                     hover:bg-[rgb(var(--accent)/10%)] transition-colors"
        >
          {expanded ? t("gamesel_close") : t("gamesel_selectMode")}
        </motion.button>
      </div>
    </motion.div>
  );
}
