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

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, X, Users2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { joinQueue, leaveQueue, tryFormMatch, watchForMatch, GameType } from "@/lib/matchmaking";
import { dealMindiHand } from "@/lib/mindiEngine";
import { dealGinHand } from "@/lib/ginRummyEngine";
import type { MindiOnlineState } from "@/components/game/MindiOnlineClient";
import type { GinOnlineState } from "@/components/game/GinRummyOnlineClient";
import { useTranslation } from "@/hooks/useTranslation";

function gameConfig(gameId: string): { gameType: GameType; neededPlayers: number; label: string } {
  if (gameId === "mindi") return { gameType: "mindi", neededPlayers: 4, label: "Mindi" };
  return { gameType: "gin_rummy", neededPlayers: 2, label: "Gin Rummy" };
}

function buildInitialState(gameType: GameType, players: string[]): MindiOnlineState | GinOnlineState {
  if (gameType === "mindi") {
    const deal = dealMindiHand(3);
    const handsByUid: Record<string, ReturnType<typeof dealMindiHand>["hands"][0]> = {};
    for (let seat = 0; seat < 4; seat++) handsByUid[players[seat]] = deal.hands[seat as 0 | 1 | 2 | 3];
    const state: MindiOnlineState = {
      handsByUid,
      trumpSuit: deal.trumpSuit,
      turnSeat: deal.leader,
      trick: [],
      tensCaptured: { A: 0, B: 0 },
      tricksWon: { A: 0, B: 0 },
      tricksPlayed: 0,
      outcome: null,
    };
    return state;
  }

  const deal = dealGinHand();
  const state: GinOnlineState = {
    hands: { [players[0]]: deal.playerHand, [players[1]]: deal.opponentHand },
    stock: deal.stock,
    discard: deal.discard,
    turn: players[0],
    phase: "draw",
    result: null,
  };
  return state;
}

export function CasualOnlineClient({ gameId }: { gameId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [dots, setDots] = useState("");
  const [matchFound, setMatchFound] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);
  const navigatedRef = useRef(false);
  const t = useTranslation();

  const { gameType, neededPlayers, label } = gameConfig(gameId);

  useEffect(() => {
    const interval = setInterval(() => setDots((prev) => (prev.length >= 3 ? "" : prev + ".")), 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const uid = user.uid;
    let cancelled = false;

    function goToMatch(matchId: string) {
      if (navigatedRef.current || cancelled) return;
      navigatedRef.current = true;
      setMatchFound(true);
      setTimeout(() => {
        router.push(`/play/${gameId}/casual/online/live?m=${matchId}`);
      }, 900);
    }

    joinQueue(uid, gameType, "casual").catch((err) => setDebugError(`Couldn't join queue: ${String(err)}`));

    const unwatch = watchForMatch(
      uid,
      gameType,
      (matchId) => {
        leaveQueue(uid);
        goToMatch(matchId);
      },
      (err) => setDebugError(`Match lookup error: ${String(err)}`),
      "casual"
    );

    const attempt = async () => {
      if (navigatedRef.current || cancelled) return;
      try {
        const matchId = await tryFormMatch(uid, gameType, neededPlayers, (players) => buildInitialState(gameType, players), "casual");
        if (matchId) goToMatch(matchId);
      } catch (err) {
        setDebugError(`Matchmaking error: ${String(err)}`);
      }
    };
    attempt();
    const interval = setInterval(attempt, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
      unwatch();
      if (!navigatedRef.current) leaveQueue(uid);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, gameType, neededPlayers, gameId]);

  if (matchFound) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200 }} className="text-center space-y-6">
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-16 h-16 rounded-full border-2 border-[#D4AF37] mx-auto flex items-center justify-center">
            <span className="text-[#D4AF37] text-xs font-bold">VS</span>
          </motion.div>
          <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">{t("rankedq_matchFound")}</h2>
          <p className="text-[rgb(var(--c4))] text-sm">{t("rankedq_starting").replace("{label}", label)}</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6 relative">
      <Link href="/play" className="absolute top-6 left-4">
        <motion.button aria-label={t("a11y_cancel")} whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
          <X size={20} className="text-[rgb(var(--c4))]" />
        </motion.button>
      </Link>

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-8 w-full max-w-sm">
        <div className="relative w-32 h-32 mx-auto">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-3 rounded-full border-2 border-[#D4AF37]/10 border-b-[#D4AF37]/50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Search size={32} className="text-[#D4AF37]" />
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
            <Users2 size={14} className="text-[#D4AF37]" />
            <span>{t("casual_noStakes")}</span>
          </div>
          {debugError && (
            <p className="text-red-400 text-xs mt-3 break-words bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
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
