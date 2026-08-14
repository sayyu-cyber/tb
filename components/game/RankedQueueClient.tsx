"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, X, Trophy, Swords, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getRankFromTrophies, VIP_DAILY_MATCHES } from "@/constants/ranks";
import { useRankLock } from "@/hooks/useRankLock";
import { useMatchLimits } from "@/hooks/useMatchLimits";
import { RankLockBanner } from "@/components/game/RankLockBanner";
import { joinQueue, leaveQueue, tryFormMatch, watchForMatch, GameType, Pool } from "@/lib/matchmaking";
import { dealMindiHand } from "@/lib/mindiEngine";
import { dealGinHand } from "@/lib/ginRummyEngine";
import { isQualified } from "@/lib/weekendLeague";
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

export function RankedQueueClient({ gameId }: { gameId: string }) {
  const router = useRouter();
  const { playerStats, user } = useAuth();
  const { isLocked, isWeekendLeague } = useRankLock();
  const matchLimits = useMatchLimits(user?.uid);
  const [dots, setDots] = useState("");
  const [matchFound, setMatchFound] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);
  const navigatedRef = useRef(false);
  const t = useTranslation();

  const trophies = playerStats?.trophies || 0;
  const rank = getRankFromTrophies(trophies);
  const { gameType, neededPlayers, label } = gameConfig(gameId);
  const qualified = isQualified(rank);
  // Casual Ranked is closed during the Weekend League window; qualified
  // players (Silver+) queue into the Weekend League pool instead.
  const weekendMode = isWeekendLeague;
  // The daily/weekly free-match caps were previously shown on this screen
  // but never actually enforced - a player could keep queueing past 0
  // remaining. Now queueing is blocked once either cap is hit.
  const outOfMatches = matchLimits.dailyRemaining <= 0 || matchLimits.weeklyRemaining <= 0;
  // Mindi's non-weekend Ranked queue is duo-only now (see RankedDuoClient) -
  // players must bring a chosen partner instead of being randomly paired
  // with a stranger into a partnership. Weekend League Mindi is untouched
  // and still queues solo, since that's a separate, higher-stakes mode the
  // user didn't ask to change.
  const requiresDuo = gameType === "mindi" && !weekendMode;
  const canQueue = (!weekendMode || qualified) && !outOfMatches && !requiresDuo;
  const pool: Pool = weekendMode ? "weekend" : "ranked";

  useEffect(() => {
    const interval = setInterval(() => setDots((prev) => (prev.length >= 3 ? "" : prev + ".")), 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!canQueue || !user?.uid) return;

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

    joinQueue(uid, gameType, pool).catch((err) => setDebugError(`Couldn't join queue: ${String(err)}`));

    const unwatch = watchForMatch(
      uid,
      gameType,
      (matchId) => {
        leaveQueue(uid);
        goToMatch(matchId);
      },
      (err) => setDebugError(`Match lookup error: ${String(err)}`),
      pool
    );

    const attempt = async () => {
      if (navigatedRef.current || cancelled) return;
      try {
        const matchId = await tryFormMatch(uid, gameType, neededPlayers, (players) => buildInitialState(gameType, players), pool);
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
  }, [canQueue, pool, user?.uid, gameType, neededPlayers, gameId]);

  if (outOfMatches) {
    const reason = matchLimits.weeklyRemaining <= 0 ? "weekly" : "daily";
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6">
        <Link href="/play" className="absolute top-6 left-4">
          <motion.button aria-label={t("a11y_cancel")} whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
            <X size={20} className="text-[rgb(var(--c4))]" />
          </motion.button>
        </Link>
        <div className="text-center space-y-3 max-w-xs">
          <Clock size={32} className="text-[rgb(var(--gold))] mx-auto" />
          <h2 className="text-lg font-bold text-[rgb(var(--text-primary))]">{t("rankedq_outOfMatches").replace("{reason}", reason)}</h2>
          <p className="text-[rgb(var(--c4))] text-sm">
            {matchLimits.isVip
              ? t("rankedq_vipMsg")
                  .replace("{reason}", reason)
                  .replace("{total}", String(reason === "weekly" ? matchLimits.weeklyTotal : matchLimits.dailyTotal))
                  .replace("{when}", reason === "weekly" ? t("rankedq_nextWeek") : t("rankedq_tomorrow"))
              : t("rankedq_freeMsg")
                  .replace("{daily}", String(matchLimits.dailyTotal))
                  .replace("{weekly}", String(matchLimits.weeklyTotal))
                  .replace("{vip}", String(VIP_DAILY_MATCHES))
                  .replace("{when}", reason === "weekly" ? t("rankedq_nextWeek") : t("rankedq_tomorrow"))}
          </p>
        </div>
      </div>
    );
  }

  if (requiresDuo) {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6 text-center space-y-4">
        <Link href="/play" className="absolute top-6 left-4">
          <motion.button aria-label={t("a11y_cancel")} whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
            <X size={20} className="text-[rgb(var(--c4))]" />
          </motion.button>
        </Link>
        <h2 className="text-lg font-bold text-[rgb(var(--text-primary))]">{t("rankedq_needsPartner")}</h2>
        <p className="text-[rgb(var(--c4))] text-sm max-w-xs">
          {t("rankedq_needsPartnerDesc")}
        </p>
        <Link href={`/play/${gameId}/ranked-duo`}>
          <motion.button whileTap={{ scale: 0.95 }} className="px-6 py-3 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] font-semibold text-sm">
            {t("rankedq_goToRankedDuo")}
          </motion.button>
        </Link>
      </div>
    );
  }

  if (!canQueue) {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6">
        <Link href="/play" className="absolute top-6 left-4">
          <motion.button aria-label={t("a11y_cancel")} whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
            <X size={20} className="text-[rgb(var(--c4))]" />
          </motion.button>
        </Link>
        <RankLockBanner />
        {weekendMode && (
          <p className="text-[rgb(var(--c4))] text-xs mt-4 max-w-xs text-center">
            {t("rankedq_weekendReq").replace("{rank}", String(rank)).replace("{trophies}", String(trophies))}
          </p>
        )}
      </div>
    );
  }

  if (matchFound) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200 }} className="text-center space-y-6">
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-16 h-16 rounded-full border-2 border-[rgb(var(--gold))] mx-auto flex items-center justify-center">
            <span className="text-[rgb(var(--gold))] text-xs font-bold">VS</span>
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
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full border-2 border-[rgb(var(--gold)/20%)] border-t-[rgb(var(--gold))]" />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-3 rounded-full border-2 border-[rgb(var(--gold)/10%)] border-b-[rgb(var(--gold)/50%)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Search size={32} className="text-[rgb(var(--gold))]" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-[rgb(var(--text-primary))]">
            {t("rankedq_finding")
              .replace("{prefix}", weekendMode ? `${t("page_weekendLeague")} ` : "")
              .replace("{label}", label)
              .replace("{dots}", dots)}
          </h2>
          <p className="text-[rgb(var(--c4))] text-sm mt-2">
            {gameType === "mindi" ? t("rankedq_mindiNeeds4") : t("rankedq_waitingReal")}
          </p>
          {weekendMode && <p className="text-orange-400 text-xs mt-1">{t("rankedq_doubleTrophies")}</p>}
          {debugError && (
            <p className="text-red-400 text-xs mt-3 break-words bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
              {debugError}
            </p>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[rgb(var(--c4))] text-sm">{t("rankedq_rank")}</span>
            <span className="text-[rgb(var(--gold))] font-semibold text-sm">{rank}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[rgb(var(--c4))] text-sm">{t("rankedq_trophies")}</span>
            <div className="flex items-center gap-1">
              <Trophy size={14} className="text-[rgb(var(--gold))]" />
              <span className="text-[rgb(var(--gold))] font-semibold text-sm">{trophies}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[rgb(var(--c4))] text-sm">{t("rankedq_dailyLeft")}</span>
            <div className="flex items-center gap-1">
              <Swords size={14} className="text-[rgb(var(--gold))]" />
              <span className="text-[rgb(var(--text-primary))] font-semibold text-sm">{matchLimits.dailyRemaining} / {matchLimits.dailyTotal}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[rgb(var(--c4))] text-sm">{t("rankedq_weeklyLeft")}</span>
            <div className="flex items-center gap-1">
              <Clock size={14} className="text-[rgb(var(--gold))]" />
              <span className="text-[rgb(var(--text-primary))] font-semibold text-sm">{matchLimits.weeklyRemaining} / {matchLimits.weeklyTotal}</span>
            </div>
          </div>
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
