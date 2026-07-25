"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, X, Trophy, Swords, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getRankFromTrophies } from "@/constants/ranks";
import { useRankLock } from "@/hooks/useRankLock";
import { useMatchLimits } from "@/hooks/useMatchLimits";
import { RankLockBanner } from "@/components/game/RankLockBanner";
import { joinQueue, leaveQueue, tryFormMatch, watchForMatch, GameType } from "@/lib/matchmaking";
import { dealMindiHand } from "@/lib/mindiEngine";
import { dealGinHand } from "@/lib/ginRummyEngine";
import type { MindiOnlineState } from "@/components/game/MindiOnlineClient";
import type { GinOnlineState } from "@/components/game/GinRummyOnlineClient";

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

export function RankedQueueClient({ gameId }: { gameId: string }) {
  const router = useRouter();
  const { playerStats, user } = useAuth();
  const { isLocked } = useRankLock();
  const matchLimits = useMatchLimits(user?.uid);
  const [dots, setDots] = useState("");
  const [matchFound, setMatchFound] = useState(false);
  const navigatedRef = useRef(false);

  const trophies = playerStats?.trophies || 0;
  const rank = getRankFromTrophies(trophies);
  const { gameType, neededPlayers, label } = gameConfig(gameId);

  useEffect(() => {
    const interval = setInterval(() => setDots((prev) => (prev.length >= 3 ? "" : prev + ".")), 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isLocked || !user?.uid) return;

    const uid = user.uid;
    let cancelled = false;

    function goToMatch(matchId: string) {
      if (navigatedRef.current || cancelled) return;
      navigatedRef.current = true;
      setMatchFound(true);
      matchLimits.recordMatch();
      setTimeout(() => {
        router.push(`/play/${gameId}/ranked/live?m=${matchId}`);
      }, 900);
    }

    joinQueue(uid, gameType);

    const unwatch = watchForMatch(uid, gameType, (matchId) => {
      leaveQueue(uid);
      goToMatch(matchId);
    });

    const attempt = async () => {
      if (navigatedRef.current || cancelled) return;
      const matchId = await tryFormMatch(uid, gameType, neededPlayers, (players) => buildInitialState(gameType, players));
      if (matchId) goToMatch(matchId);
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
  }, [isLocked, user?.uid, gameType, neededPlayers, gameId]);

  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-6">
        <Link href="/play" className="absolute top-6 left-4">
          <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A]">
            <X size={20} className="text-[#3A3A3A]" />
          </motion.button>
        </Link>
        <RankLockBanner />
      </div>
    );
  }

  if (matchFound) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200 }} className="text-center space-y-6">
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-16 h-16 rounded-full border-2 border-[#D4AF37] mx-auto flex items-center justify-center">
            <span className="text-[#D4AF37] text-xs font-bold">VS</span>
          </motion.div>
          <h2 className="text-xl font-bold text-white">Match Found!</h2>
          <p className="text-[#3A3A3A] text-sm">Starting {label}…</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-6 relative">
      <Link href="/play" className="absolute top-6 left-4">
        <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A]">
          <X size={20} className="text-[#3A3A3A]" />
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
          <h2 className="text-2xl font-bold text-white">Finding {label} Match{dots}</h2>
          <p className="text-[#3A3A3A] text-sm mt-2">
            {gameType === "mindi" ? "Needs 4 real players — this can take a while" : "Waiting for another real player"}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[#3A3A3A] text-sm">Rank</span>
            <span className="text-[#D4AF37] font-semibold text-sm">{rank}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#3A3A3A] text-sm">Trophies</span>
            <div className="flex items-center gap-1">
              <Trophy size={14} className="text-[#D4AF37]" />
              <span className="text-[#D4AF37] font-semibold text-sm">{trophies}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#3A3A3A] text-sm">Daily Left</span>
            <div className="flex items-center gap-1">
              <Swords size={14} className="text-[#D4AF37]" />
              <span className="text-white font-semibold text-sm">{matchLimits.dailyRemaining} / {matchLimits.dailyTotal}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#3A3A3A] text-sm">Weekly Left</span>
            <div className="flex items-center gap-1">
              <Clock size={14} className="text-[#D4AF37]" />
              <span className="text-white font-semibold text-sm">{matchLimits.weeklyRemaining} / {matchLimits.weeklyTotal}</span>
            </div>
          </div>
        </div>

        <Link href="/play">
          <motion.button whileTap={{ scale: 0.95 }} className="px-6 py-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-[#3A3A3A] text-sm font-medium hover:text-white transition-colors">
            Cancel
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
