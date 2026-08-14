"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Copy, Check, LogOut, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getRankFromTrophies } from "@/constants/ranks";
import { useRankLock } from "@/hooks/useRankLock";
import { isQualified } from "@/lib/weekendLeague";
import { GameType, Pool, joinDuoQueue, leaveQueue, tryFormDuoMatch, watchForMatch } from "@/lib/matchmaking";
import { createRoom, joinRoom, leaveRoom, watchRoom, RoomDoc } from "@/lib/rooms";
import { dealMindiHand } from "@/lib/mindiEngine";
import { dealGinHand } from "@/lib/ginRummyEngine";
import type { MindiOnlineState } from "@/components/game/MindiOnlineClient";
import type { GinOnlineState } from "@/components/game/GinRummyOnlineClient";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/contexts/ToastContext";

function gameTypeFor(gameId: string): GameType {
  return gameId === "mindi" ? "mindi" : "gin_rummy";
}

function buildInitialState(gameType: GameType, players: string[]): MindiOnlineState | GinOnlineState {
  if (gameType === "mindi") {
    const deal = dealMindiHand(3);
    const handsByUid: Record<string, ReturnType<typeof dealMindiHand>["hands"][0]> = {};
    for (let seat = 0; seat < 4; seat++) handsByUid[players[seat]] = deal.hands[seat as 0 | 1 | 2 | 3];
    return {
      handsByUid,
      trumpSuit: deal.trumpSuit,
      turnSeat: deal.leader,
      trick: [],
      tensCaptured: { A: 0, B: 0 },
      tricksWon: { A: 0, B: 0 },
      tricksPlayed: 0,
      outcome: null,
    };
  }
  const deal = dealGinHand();
  return {
    hands: { [players[0]]: deal.playerHand, [players[1]]: deal.opponentHand },
    stock: deal.stock,
    discard: deal.discard,
    turn: players[0],
    phase: "draw",
    result: null,
  };
}

export function RankedDuoClient({ gameId }: { gameId: string }) {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const code = searchParams.get("code");

  if (!code) {
    return <PartyChooser gameId={gameId} />;
  }
  return <DuoLobby gameId={gameId} code={code} myUid={user?.uid ?? ""} />;
}

function PartyChooser({ gameId }: { gameId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<"choose" | "join">("choose");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useTranslation();

  async function handleCreate() {
    if (!user?.uid) return;
    setBusy(true);
    setError(null);
    try {
      const code = await createRoom(user.uid, user.displayName ?? "Player", gameTypeFor(gameId), null, "rankedDuo");
      router.push(`/play/${gameId}/ranked-duo?code=${code}`);
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!user?.uid || !joinCode.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await joinRoom(joinCode, user.uid, user.displayName ?? "Player", "");
      router.push(`/play/${gameId}/ranked-duo?code=${joinCode.trim().toUpperCase()}`);
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6">
      <Link href="/play" className="absolute top-6 left-4">
        <motion.button aria-label={t("a11y_goBack")} whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
          <ArrowLeft size={20} className="text-[#D4AF37]" />
        </motion.button>
      </Link>

      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))]">{t("rankedduo_title")}</h1>
          <p className="text-[rgb(var(--c4))] text-sm mt-1">{t("rankedduo_subtitle")}</p>
        </div>

        {error && (
          <p className="text-red-400 text-xs break-words bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">{error}</p>
        )}

        {mode === "choose" && (
          <div className="space-y-3">
            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={busy}
              onClick={handleCreate}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F] font-semibold disabled:opacity-50"
            >
              {busy ? t("common_creating") : t("rankedduo_startParty")}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode("join")}
              className="w-full py-3 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--text-primary))] font-medium"
            >
              {t("rankedduo_joinWithCode")}
            </motion.button>
          </div>
        )}

        {mode === "join" && (
          <div className="space-y-3 glass-card rounded-2xl p-5">
            <input
              aria-label={t("rankedduo_partyCode")}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder={t("rankedduo_partyCode")}
              maxLength={6}
              className="w-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-3 text-[rgb(var(--text-primary))] text-sm tracking-widest text-center font-bold outline-none focus:border-[#D4AF37]/50"
            />
            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={busy}
              onClick={handleJoin}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F] font-semibold disabled:opacity-50"
            >
              {busy ? t("common_joining") : t("rankedduo_joinParty")}
            </motion.button>
            <button onClick={() => setMode("choose")} className="w-full text-center text-[rgb(var(--c4))] text-sm">
              {t("common_back")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DuoLobby({ gameId, code, myUid }: { gameId: string; code: string; myUid: string }) {
  const router = useRouter();
  const { playerStats } = useAuth();
  const { isWeekendLeague } = useRankLock();
  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [copied, setCopied] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigatedRef = useRef(false);
  const t = useTranslation();
  const { showToast } = useToast();

  const gameType = gameTypeFor(gameId);
  const trophies = playerStats?.trophies || 0;
  const rank = getRankFromTrophies(trophies);
  const qualified = isQualified(rank);
  const weekendMode = isWeekendLeague;
  const canQueue = !weekendMode || qualified;
  const pool: Pool = weekendMode ? "weekend" : "ranked";

  useEffect(() => watchRoom(code, setRoom), [code]);

  const handleCopy = useCallback(() => {
    // Previously this flipped to the "copied" checkmark unconditionally and
    // swallowed the rejection, so on an insecure origin or with clipboard
    // permission denied the player saw a tick but had nothing to paste.
    navigator.clipboard
      ?.writeText(code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => showToast(t("toast_copyFailed"), "error"));
  }, [code, showToast, t]);

  useEffect(() => {
    if (!queueing || !canQueue) return;
    let cancelled = false;

    function goToMatch(matchId: string) {
      if (navigatedRef.current || cancelled) return;
      navigatedRef.current = true;
      router.push(`/play/${gameId}/ranked/live?m=${matchId}`);
    }

    const unwatch = watchForMatch(
      myUid,
      gameType,
      (matchId) => goToMatch(matchId),
      (err) => setError(`Match lookup error: ${String(err)}`),
      pool
    );

    const attempt = async () => {
      if (navigatedRef.current || cancelled) return;
      try {
        await tryFormDuoMatch(myUid, code, gameType, (players) => buildInitialState(gameType, players), pool);
      } catch (err) {
        setError(`Matchmaking error: ${String(err)}`);
      }
    };
    attempt();
    const interval = setInterval(attempt, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
      unwatch();
      if (!navigatedRef.current) leaveQueue(myUid);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueing, canQueue, pool, myUid, gameType, gameId, code]);

  async function handleJoinQueue() {
    setError(null);
    try {
      await joinDuoQueue(myUid, code, gameType, pool);
      setQueueing(true);
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleLeave() {
    // Intentionally silent: we navigate away on the next line, so a toast
    // would flash and vanish. Both are best-effort cleanup - a stale queue
    // entry is reaped by the matchmaker's own staleness check.
    if (queueing) await leaveQueue(myUid).catch(() => {});
    await leaveRoom(code, myUid).catch(() => {});
    router.push("/play");
  }

  if (room === null) {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center px-6 text-center">
        <p className="text-[rgb(var(--c4))] text-sm">{t("rankedduo_loadingParty")}</p>
      </div>
    );
  }

  if (room.status === "closed") {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6 text-center space-y-4">
        <p className="text-[rgb(var(--text-primary))]">{t("rankedduo_closed")}</p>
        <Link href="/play" className="text-[#D4AF37] text-sm underline">
          {t("roomlobby_backToPlay")}
        </Link>
      </div>
    );
  }

  const isFull = room.players.length === room.maxPlayers;

  if (!canQueue) {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6 text-center space-y-3">
        <p className="text-[rgb(var(--text-primary))]">{t("rankedduo_weekendReq")}</p>
        <p className="text-[rgb(var(--c4))] text-sm">{t("rankedduo_climbMsg").replace("{rank}", String(rank)).replace("{trophies}", String(trophies))}</p>
        <button onClick={handleLeave} className="text-[#D4AF37] text-sm underline">
          {t("roomlobby_backToPlay")}
        </button>
      </div>
    );
  }

  if (queueing) {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6 text-center space-y-6">
        <div className="relative w-24 h-24 mx-auto">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Search size={28} className="text-[#D4AF37]" />
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-[rgb(var(--text-primary))]">{t("rankedduo_findingDuo")}</h2>
          <p className="text-[rgb(var(--c4))] text-sm mt-1">{t("rankedduo_faceTeam")}</p>
        </div>
        {error && (
          <p className="text-red-400 text-xs break-words bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 max-w-xs">{error}</p>
        )}
        <button onClick={handleLeave} className="text-[rgb(var(--c4))] text-sm underline">
          {t("rankedq_cancel")}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col px-4 pt-4 pb-6">
      <div className="flex items-center justify-between mb-6">
        <button aria-label={t("a11y_goBack")} onClick={handleLeave} className="p-2 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
          <ArrowLeft size={20} className="text-[#D4AF37]" />
        </button>
        <p className="text-[rgb(var(--text-primary))] text-sm font-semibold">
          {t("rankedduo_title2").replace("{game}", gameType === "mindi" ? "Mindi" : "Gin Rummy")}
        </p>
        <div className="w-10" />
      </div>

      <div className="glass-card rounded-2xl p-5 mb-4 text-center">
        <p className="text-[rgb(var(--c4))] text-xs uppercase tracking-wider mb-2">{t("rankedduo_partyCodeLabel")}</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl font-bold text-[#D4AF37] tracking-widest">{code}</span>
          <button aria-label={t("a11y_copyCode")} onClick={handleCopy} className="p-2 rounded-lg bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-[rgb(var(--c4))]" />}
          </button>
        </div>
        <p className="text-[rgb(var(--c4))] text-xs mt-2">{t("rankedduo_shareWithPartner")}</p>
      </div>

      {error && (
        <p className="text-red-400 text-xs break-words bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="glass-card rounded-2xl p-4 mb-4 flex-1">
        <p className="text-[rgb(var(--c4))] text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users size={14} /> {t("rankedduo_party").replace("{n}", String(room.players.length)).replace("{m}", String(room.maxPlayers))}
        </p>
        <div className="space-y-2">
          {room.players.map((uid) => (
            <div key={uid} className="flex items-center justify-between bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-3">
              <span className="text-[rgb(var(--text-primary))] text-sm">{room.playerNames[uid] || t("profile_player")}</span>
              {uid === myUid && <span className="text-[rgb(var(--c4))] text-xs">{t("common_you")}</span>}
            </div>
          ))}
          {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex items-center justify-center bg-[rgb(var(--c1))] border border-dashed border-[rgb(var(--c3))] rounded-xl px-4 py-3">
              <span className="text-[rgb(var(--c3))] text-xs">{t("rankedduo_waitingForPartner")}</span>
            </div>
          ))}
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        disabled={!isFull}
        onClick={handleJoinQueue}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F] font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
      >
        <Search size={16} />
        {isFull ? t("rankedduo_findMatchTogether") : t("rankedduo_waitingPartnerBtn")}
      </motion.button>
      <button onClick={handleLeave} className="w-full py-3 mt-2 text-[rgb(var(--c4))] text-sm flex items-center justify-center gap-2">
        <LogOut size={14} /> {t("rankedduo_leaveParty")}
      </button>
    </div>
  );
}
