"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Lock, Copy, Check, LogOut, Play, Crown } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { GameType } from "@/lib/matchmaking";
import { dealMindiHand, dealMindiHandFFA1v1 } from "@/lib/mindiEngine";
import { dealGinHand } from "@/lib/ginRummyEngine";
import type { MindiOnlineState } from "@/components/game/MindiOnlineClient";
import type { GinOnlineState } from "@/components/game/GinRummyOnlineClient";
import {
  createRoom,
  joinRoom,
  kickPlayer,
  banPlayer,
  leaveRoom,
  closeRoom,
  startRoomMatch,
  setSeatOrder,
  watchRoom,
  RoomDoc,
} from "@/lib/rooms";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/contexts/ToastContext";

function gameTypeFor(gameId: string): GameType {
  return gameId === "mindi" ? "mindi" : "gin_rummy";
}

function buildInitialState(
  gameType: GameType,
  players: string[],
  mindiMode: "team2v2" | "ffa1v1" = "team2v2"
): MindiOnlineState | GinOnlineState {
  if (gameType === "mindi") {
    if (mindiMode === "ffa1v1") {
      const deal = dealMindiHandFFA1v1(1);
      return {
        handsByUid: { [players[0]]: deal.hands[0], [players[1]]: deal.hands[1] },
        trumpSuit: deal.trumpSuit,
        turnSeat: deal.leader,
        trick: [],
        tensCaptured: { A: 0, B: 0 },
        tricksWon: { A: 0, B: 0 },
        tricksPlayed: 0,
        outcome: null,
        numPlayers: 2,
      };
    }
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
      numPlayers: 4,
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

export function RoomLobbyClient({ gameId }: { gameId: string }) {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const gameType = gameTypeFor(gameId);
  const code = searchParams.get("code");

  if (!code) {
    return <RoomChooser gameId={gameId} />;
  }
  return <RoomLobby gameId={gameId} gameType={gameType} code={code} myUid={user?.uid ?? ""} />;
}

function RoomChooser({ gameId }: { gameId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { getActiveRoomCards } = useEconomy();
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [password, setPassword] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [mindiMode, setMindiMode] = useState<"team2v2" | "ffa1v1">("team2v2");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useTranslation();

  // Rooms can only be opened while a Room Card is active - once activated,
  // any number of rooms can be created until it expires (see
  // components/roomcards/RoomCardManager.tsx and lib/rooms.ts's docs).
  const hasActiveRoomCard = getActiveRoomCards().length > 0;

  async function handleCreate() {
    if (!user?.uid || !hasActiveRoomCard) return;
    setBusy(true);
    setError(null);
    try {
      const code = await createRoom(
        user.uid,
        user.displayName ?? "Player",
        gameTypeFor(gameId),
        password || null,
        "casual",
        mindiMode
      );
      router.push(`/play/${gameId}/room?code=${code}`);
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
      await joinRoom(joinCode, user.uid, user.displayName ?? "Player", joinPassword);
      router.push(`/play/${gameId}/room?code=${joinCode.trim().toUpperCase()}`);
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6">
      <Link href="/play" className="absolute top-6 left-4">
        <motion.button aria-label={t("a11y_goBack")} whileTap={{ scale: 0.9 }} className="p-2 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
          <ArrowLeft size={20} className="text-[rgb(var(--gold))]" />
        </motion.button>
      </Link>

      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))]">{t("roomlobby_title")}</h1>
          <p className="text-[rgb(var(--c4))] text-sm mt-1">{t("roomlobby_subtitle")}</p>
        </div>

        {error && (
          <p className="text-red-400 text-xs break-words bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">{error}</p>
        )}

        {mode === "choose" && (
          <div className="space-y-3">
            {hasActiveRoomCard ? (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setMode("create")}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] font-semibold"
              >
                {t("roomlobby_createRoom")}
              </motion.button>
            ) : (
              <div className="space-y-2 p-4 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
                <p className="text-[rgb(var(--text-primary))] text-sm font-medium">{t("roomlobby_needCard")}</p>
                <p className="text-[rgb(var(--c4))] text-xs">{t("roomlobby_needCardDesc")}</p>
                <Link href="/room-cards">
                  <motion.button whileTap={{ scale: 0.98 }} className="w-full mt-1 py-2.5 rounded-lg bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] font-semibold text-sm">
                    {t("roomlobby_goToRoomCards")}
                  </motion.button>
                </Link>
              </div>
            )}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode("join")}
              className="w-full py-3 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--text-primary))] font-medium"
            >
              {t("roomlobby_joinWithCode")}
            </motion.button>
          </div>
        )}

        {mode === "create" && (
          <div className="space-y-3 glass-card rounded-2xl p-5">
            {gameId === "mindi" && (
              <div className="space-y-2">
                <p className="text-[rgb(var(--c4))] text-xs">{t("roomlobby_mode")}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMindiMode("team2v2")}
                    className={`py-2.5 rounded-lg text-sm font-medium border ${
                      mindiMode === "team2v2"
                        ? "bg-[rgb(var(--gold)/10%)] border-[rgb(var(--gold))] text-[rgb(var(--gold))]"
                        : "bg-[rgb(var(--c2))] border-[rgb(var(--c3))] text-[rgb(var(--c4))]"
                    }`}
                  >
                    {t("roomlobby_team2v2")}
                  </button>
                  <button
                    onClick={() => setMindiMode("ffa1v1")}
                    className={`py-2.5 rounded-lg text-sm font-medium border ${
                      mindiMode === "ffa1v1"
                        ? "bg-[rgb(var(--gold)/10%)] border-[rgb(var(--gold))] text-[rgb(var(--gold))]"
                        : "bg-[rgb(var(--c2))] border-[rgb(var(--c3))] text-[rgb(var(--c4))]"
                    }`}
                  >
                    {t("roomlobby_ffa1v1")}
                  </button>
                </div>
                <p className="text-[rgb(var(--c3))] text-[11px]">{t("roomlobby_ffaComingSoon")}</p>
              </div>
            )}
            <p className="text-[rgb(var(--c4))] text-xs">{t("roomlobby_optionalPassword")}</p>
            <input
              aria-label={t("roomlobby_passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("roomlobby_passwordPlaceholder")}
              maxLength={32}
              className="w-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-3 text-[rgb(var(--text-primary))] text-sm outline-none focus:border-[rgb(var(--gold)/50%)]"
            />
            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={busy}
              onClick={handleCreate}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] font-semibold disabled:opacity-50"
            >
              {busy ? t("common_creating") : t("roomlobby_createRoomBtn")}
            </motion.button>
          </div>
        )}

        {mode === "join" && (
          <div className="space-y-3 glass-card rounded-2xl p-5">
            <input
              aria-label={t("roomlobby_roomCodePlaceholder")}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder={t("roomlobby_roomCodePlaceholder")}
              maxLength={6}
              className="w-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-3 text-[rgb(var(--text-primary))] text-sm tracking-widest text-center font-bold outline-none focus:border-[rgb(var(--gold)/50%)]"
            />
            <input
              aria-label={t("roomlobby_passwordIfRequired")}
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              placeholder={t("roomlobby_passwordIfRequired")}
              maxLength={32}
              className="w-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-3 text-[rgb(var(--text-primary))] text-sm outline-none focus:border-[rgb(var(--gold)/50%)]"
            />
            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={busy}
              onClick={handleJoin}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] font-semibold disabled:opacity-50"
            >
              {busy ? t("common_joining") : t("roomlobby_joinRoomBtn")}
            </motion.button>
          </div>
        )}

        {mode !== "choose" && (
          <button onClick={() => setMode("choose")} className="w-full text-center text-[rgb(var(--c4))] text-sm">
            {t("common_back")}
          </button>
        )}
      </div>
    </div>
  );
}

function RoomLobby({
  gameId,
  gameType,
  code,
  myUid,
}: {
  gameId: string;
  gameType: GameType;
  code: string;
  myUid: string;
}) {
  const router = useRouter();
  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Once we've seen ourselves in the room's player list, a later snapshot
  // where we're missing (but the room is still open) means the owner
  // removed us - kick or ban. Track that so we don't misfire this on the
  // very first snapshot before our own join has propagated.
  const [wasSeated, setWasSeated] = useState(false);
  const [removedAs, setRemovedAs] = useState<"kicked" | "banned" | null>(null);
  const t = useTranslation();
  const { showToast } = useToast();

  useEffect(() => watchRoom(code, setRoom), [code]);

  useEffect(() => {
    if (room?.status === "started" && room.matchId) {
      router.replace(`/play/${gameId}/ranked/live?m=${room.matchId}`);
    }
  }, [room, gameId, router]);

  useEffect(() => {
    if (!room || room.status !== "waiting") return;
    const stillIn = room.players.includes(myUid);
    if (stillIn) {
      setWasSeated(true);
      return;
    }
    if (wasSeated) {
      setRemovedAs(room.bannedUids?.includes(myUid) ? "banned" : "kicked");
    }
  }, [room, myUid, wasSeated]);

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

  async function handleStart() {
    if (!room) return;
    setError(null);
    try {
      await startRoomMatch(code, myUid, (players) => buildInitialState(gameType, players, room.mindiMode ?? "team2v2"));
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleKick(uid: string) {
    await kickPlayer(code, myUid, uid).catch((err) => setError(String(err)));
  }

  async function handleBan(uid: string) {
    await banPlayer(code, myUid, uid).catch((err) => setError(String(err)));
  }

  async function handleSwapSeats(uidA: string, uidB: string) {
    if (!room) return;
    const order = room.seatOrder && room.seatOrder.length === room.players.length ? [...room.seatOrder] : [...room.players];
    const iA = order.indexOf(uidA);
    const iB = order.indexOf(uidB);
    if (iA === -1 || iB === -1) return;
    [order[iA], order[iB]] = [order[iB], order[iA]];
    await setSeatOrder(code, myUid, order).catch((err) => setError(String(err)));
  }

  async function handleLeave() {
    // Intentionally silent: best-effort cleanup immediately before
    // navigating away (see RankedDuoClient.handleLeave).
    await leaveRoom(code, myUid).catch(() => {});
    router.push("/play");
  }

  if (room === null) {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center px-6 text-center">
        <p className="text-[rgb(var(--c4))] text-sm">{t("roomlobby_loadingRoom")}</p>
      </div>
    );
  }

  if (removedAs) {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6 text-center space-y-4">
        <p className="text-[rgb(var(--text-primary))] font-semibold">
          {removedAs === "banned" ? t("roomlobby_bannedMsg") : t("roomlobby_removedMsg")}
        </p>
        <Link href="/play" className="text-[rgb(var(--gold))] text-sm underline">
          {t("roomlobby_backToPlay")}
        </Link>
      </div>
    );
  }

  if (room.status === "closed") {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6 text-center space-y-4">
        <p className="text-[rgb(var(--text-primary))]">{t("roomlobby_closed")}</p>
        <Link href="/play" className="text-[rgb(var(--gold))] text-sm underline">
          {t("roomlobby_backToPlay")}
        </Link>
      </div>
    );
  }

  const isOwner = room.ownerUid === myUid;
  const isFull = room.players.length === room.maxPlayers;

  return (
    <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col px-4 pt-4 pb-6">
      <div className="flex items-center justify-between mb-6">
        <button aria-label={t("a11y_goBack")} onClick={handleLeave} className="p-2 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
          <ArrowLeft size={20} className="text-[rgb(var(--gold))]" />
        </button>
        <p className="text-[rgb(var(--text-primary))] text-sm font-semibold">{t("roomlobby_roomTitle").replace("{game}", gameType === "mindi" ? "Mindi" : "Gin Rummy")}</p>
        <div className="w-10" />
      </div>

      <div className="glass-card rounded-2xl p-5 mb-4 text-center">
        <p className="text-[rgb(var(--c4))] text-xs uppercase tracking-wider mb-2">{t("roomlobby_roomCode")}</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl font-bold text-[rgb(var(--gold))] tracking-widest">{code}</span>
          <button aria-label={t("a11y_copyCode")} onClick={handleCopy} className="p-2 rounded-lg bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-[rgb(var(--c4))]" />}
          </button>
        </div>
        {room.password && (
          <p className="text-[rgb(var(--c4))] text-xs mt-2 flex items-center justify-center gap-1">
            <Lock size={12} /> {t("roomlobby_password").replace("{p}", room.password)}
          </p>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-xs break-words bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="glass-card rounded-2xl p-4 mb-4 flex-1">
        <p className="text-[rgb(var(--c4))] text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users size={14} /> {t("roomlobby_players").replace("{n}", String(room.players.length)).replace("{m}", String(room.maxPlayers))}
        </p>
        <div className="space-y-2">
          {room.players.map((uid) => (
            <div key={uid} className="flex items-center justify-between bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                {uid === room.ownerUid && <Crown size={14} className="text-[rgb(var(--gold))]" />}
                <span className="text-[rgb(var(--text-primary))] text-sm">{room.playerNames[uid] || t("profile_player")}</span>
                {uid === myUid && <span className="text-[rgb(var(--c4))] text-xs">{t("common_you")}</span>}
              </div>
              {isOwner && uid !== myUid && (
                <div className="flex items-center gap-3">
                  <button onClick={() => handleKick(uid)} className="text-orange-400 text-xs">
                    {t("common_kick")}
                  </button>
                  <button onClick={() => handleBan(uid)} className="text-red-400 text-xs">
                    {t("common_ban")}
                  </button>
                </div>
              )}
            </div>
          ))}
          {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
            <div key={`empty-${i}`} className="flex items-center justify-center bg-[rgb(var(--c1))] border border-dashed border-[rgb(var(--c3))] rounded-xl px-4 py-3">
              <span className="text-[rgb(var(--c3))] text-xs">{t("roomlobby_waitingForPlayer")}</span>
            </div>
          ))}
        </div>
      </div>

      {gameType === "mindi" && (room.mindiMode ?? "team2v2") === "team2v2" && isFull && (() => {
        const seatOrder = room.seatOrder && room.seatOrder.length === room.players.length ? room.seatOrder : room.players;
        const teamA = [seatOrder[0], seatOrder[2]];
        const teamB = [seatOrder[1], seatOrder[3]];
        return (
          <div className="glass-card rounded-2xl p-4 mb-4">
            <p className="text-[rgb(var(--c4))] text-xs uppercase tracking-wider mb-3">{t("roomlobby_teams")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[rgb(var(--gold))] text-xs font-bold mb-1">{t("roomlobby_teamA")}</p>
                {teamA.map((uid) => (
                  <p key={uid} className="text-[rgb(var(--text-primary))] text-sm">{room.playerNames[uid] || t("profile_player")}</p>
                ))}
              </div>
              <div className="space-y-1">
                <p className="text-[rgb(var(--gold))] text-xs font-bold mb-1">{t("roomlobby_teamB")}</p>
                {teamB.map((uid) => (
                  <p key={uid} className="text-[rgb(var(--text-primary))] text-sm">{room.playerNames[uid] || t("profile_player")}</p>
                ))}
              </div>
            </div>
            {isOwner && (
              <button
                onClick={() => handleSwapSeats(teamA[0], teamB[0])}
                className="w-full mt-3 py-2 rounded-lg bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))] text-xs font-medium"
              >
                {t("roomlobby_swapTeams")}
              </button>
            )}
          </div>
        );
      })()}

      {isOwner ? (
        <motion.button
          whileTap={{ scale: 0.95 }}
          disabled={!isFull}
          onClick={handleStart}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Play size={16} />
          {isFull ? t("roomlobby_startMatch") : t("roomlobby_waitingForPlayers")}
        </motion.button>
      ) : (
        <button onClick={handleLeave} className="w-full py-3.5 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))] font-medium flex items-center justify-center gap-2">
          <LogOut size={16} />
          {t("roomlobby_leaveRoom")}
        </button>
      )}
    </div>
  );
}
