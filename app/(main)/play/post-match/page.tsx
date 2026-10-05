"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Home, RotateCcw, TrendingDown, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getMatch } from "@/lib/matchmaking";
import { teamOf, type SeatIndex } from "@/lib/mindiEngine";

interface CompletedState {
  outcome?: { winner: "A" | "B" } | null;
  result?: { winnerUid: string } | null;
}

export default function PostMatchPage() {
  const { user, playerStats, loading, profileLoading, profileError } = useAuth();
  const searchParams = useSearchParams();
  const matchId = searchParams.get("m");
  const uid = user?.uid;
  const [result, setResult] = useState<{
    matchId: string | null;
    uid: string | undefined;
    victory: boolean | null;
    error: string;
  } | null>(null);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    const loadResult = async () => {
      let victory: boolean | null = null;
      let error = "";
      try {
        if (!uid || !matchId) throw new Error("missing match");
        const match = await getMatch<CompletedState>(matchId);
        if (!match || match.status !== "completed" || !match.players.includes(uid)) {
          throw new Error("unverified result");
        }
        if (match.gameType === "mindi" && [2, 4].includes(match.players.length)
          && (match.state?.outcome?.winner === "A" || match.state?.outcome?.winner === "B")) {
          victory = match.state.outcome.winner === teamOf(match.players.indexOf(uid) as SeatIndex);
        } else if (match.gameType === "gin_rummy" && match.players.length === 2
          && match.state?.result && match.players.includes(match.state.result.winnerUid)) {
          victory = match.state.result.winnerUid === uid;
        } else {
          throw new Error("missing outcome");
        }
      } catch {
        error = "A completed match result could not be verified.";
      }
      if (!cancelled) setResult({ matchId, uid, victory, error });
    };
    void loadResult();
    return () => { cancelled = true; };
  }, [loading, uid, matchId]);

  // Never show a previous match or account's result while a new read is pending.
  const currentResult = result?.matchId === matchId && result?.uid === uid ? result : null;
  if (loading || !currentResult) {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center" role="status" aria-label="Loading match result">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-2 border-[rgb(var(--gold)/20%)] border-t-[rgb(var(--gold))] rounded-full"
        />
      </div>
    );
  }

  const isVictory = currentResult.victory === true;
  const verified = currentResult.victory !== null;
  return (
    <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {isVictory && <VictoryParticles />}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="result-card text-center space-y-6 relative z-10 w-full max-w-sm"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className={`result-icon w-24 h-24 rounded-full mx-auto flex items-center justify-center ${
            isVictory
              ? "bg-gradient-to-br from-[rgb(var(--gold))] to-[rgb(var(--gold-bright))] shadow-[0_0_40px_rgb(var(--gold)/30%)]"
              : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]"
          }`}
        >
          {isVictory ? <Sparkles size={40} className="text-[#0F0F0F]" />
            : verified ? <TrendingDown size={40} className="text-[rgb(var(--c4))]" />
              : <Trophy size={40} className="text-[rgb(var(--c4))]" />}
        </motion.div>
        <h1 className={`result-title text-3xl font-bold ${isVictory ? "gold-text-gradient" : "text-[rgb(var(--c4))]"}`}>
          {verified ? isVictory ? "Victory!" : "Defeat" : "Result unavailable"}
        </h1>
        {currentResult.error && <p role="alert" className="result-error text-[rgb(var(--coral-ink))] text-xs">{currentResult.error}</p>}

        {verified && (
          <div className="result-stats py-6 border-y border-[rgb(var(--c3))]">
            {playerStats && !profileLoading && !profileError ? (
              <>
                <p className="text-[rgb(var(--c4))] text-xs mb-2">Current Trophies</p>
                <div className="flex items-center justify-center gap-2">
                  <Trophy size={20} className="text-[rgb(var(--gold-ink))]" />
                  <span className="text-2xl font-bold text-[rgb(var(--gold-ink))]">{playerStats.trophies}</span>
                </div>
                <p className="text-[rgb(var(--c4))] text-xs mt-4">Current Rank</p>
                <p className="text-[rgb(var(--text-primary))] font-semibold">{playerStats.currentRank}</p>
              </>
            ) : <p className="text-[rgb(var(--c4))] text-sm">{profileLoading ? "Loading current stats..." : "Current stats unavailable."}</p>}
          </div>
        )}

        <div className="result-actions flex gap-3">
          <Link href="/home" className="flex-1 py-3 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--text-primary))] text-sm font-medium flex items-center justify-center gap-2">
            <Home size={16} /> Home
          </Link>
          <Link href="/play" className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] text-sm font-semibold flex items-center justify-center gap-2">
            <RotateCcw size={16} /> Play Again
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function VictoryParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-[rgb(var(--gold))] rounded-full"
          initial={{ x: "50%", y: "50%", opacity: 1, scale: 0 }}
          animate={{
            x: `${20 + Math.random() * 60}%`,
            y: `${20 + Math.random() * 60}%`,
            opacity: 0,
            scale: Math.random() * 2 + 1,
          }}
          transition={{ duration: 1.5 + Math.random(), delay: Math.random() * 0.5, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
