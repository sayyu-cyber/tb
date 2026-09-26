"use client";

// Casual Online matchmaking - a no-stakes real-multiplayer queue, distinct
// from Ranked. Built specifically so a player without a friend to party up
// with can still get a real 2v2 Mindi match: this reuses the same random
// tryFormMatch() primitive Ranked used before Mindi went duo-only (see
// lib/matchmaking.ts's Pool type) - queued players are seated in wait-time
// order, and mindiEngine's teamOf() pairs seats 0&2 against 1&3, so a
// 4-player casual match auto-assigns a random teammate with no extra
// logic. No rank lock, no daily/weekly match caps, no trophy stakes (see
// MindiOnlineClient/GinRummyOnlineClient's `pool === "casual"` guard around
// updateMatchResult) - just a real opponent (and, for Mindi, a real
// teammate) when you want to play online without organizing a group.
//
// The queue itself now lives in hooks/useCasualQueue, because the Play
// lobby queues from its own CTA (the board's "Finding a table" state) and
// the two must not drift into two different queues. This screen is the
// same queue with its own full-screen UI, and is where the lobby's older
// direct link still lands.

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, X, Users2 } from "lucide-react";
import Link from "next/link";
import { useCasualQueue, gameConfig } from "@/hooks/useCasualQueue";
import { useTranslation } from "@/hooks/useTranslation";

export function CasualOnlineClient({ gameId }: { gameId: string }) {
  const [dots, setDots] = useState("");
  const t = useTranslation();

  const { gameType } = gameConfig(gameId);
  const { matchFound, error: debugError, label } = useCasualQueue(gameId, true);

  useEffect(() => {
    const interval = setInterval(() => setDots((prev) => (prev.length >= 3 ? "" : prev + ".")), 500);
    return () => clearInterval(interval);
  }, []);

  if (matchFound) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="match-lobby min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200 }} className="text-center space-y-6">
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-16 h-16 rounded-full border-2 border-[rgb(var(--gold))] mx-auto flex items-center justify-center">
            <span className="text-[rgb(var(--gold-ink))] text-xs font-bold">VS</span>
          </motion.div>
          <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">{t("rankedq_matchFound")}</h2>
          <p className="text-[rgb(var(--c4))] text-sm">{t("rankedq_starting").replace("{label}", label)}</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="match-lobby min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6 relative">
      <Link href="/play" className="absolute top-6 left-4">
        <motion.button aria-label={t("a11y_cancel")} whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
          <X size={20} className="text-[rgb(var(--c4))]" />
        </motion.button>
      </Link>

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-8 w-full max-w-sm">
        <div className="relative w-32 h-32 mx-auto">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full border-2 border-[rgb(var(--gold)/20%)] border-t-[rgb(var(--gold))]" />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-3 rounded-full border-2 border-[rgb(var(--gold)/10%)] border-b-[rgb(var(--gold)/50%)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Search size={32} className="text-[rgb(var(--gold-ink))]" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-[rgb(var(--text-primary))]">
            {t("casual_finding").replace("{label}", label).replace("{dots}", dots)}
          </h2>
          <p className="text-[rgb(var(--c4))] text-sm mt-2">
            {gameType === "mindi" ? t("casual_mindiNeeds4") : t("rankedq_waitingReal")}
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 text-[rgb(var(--c4))] text-xs">
            <Users2 size={14} className="text-[rgb(var(--gold-ink))]" />
            <span>{t("casual_noStakes")}</span>
          </div>
          {debugError && (
            <p className="text-[rgb(var(--coral-ink))] text-xs mt-3 break-words bg-[rgb(var(--coral)/10%)] border border-[rgb(var(--coral)/30%)] rounded-lg px-3 py-2">
              {debugError}
            </p>
          )}
        </div>

        <Link href="/play">
          <motion.button whileTap={{ scale: 0.95 }} className="px-6 py-3 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))] text-sm font-medium hover:text-[rgb(var(--text-primary))] transition-colors">
            {t("rankedq_cancel")}
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
