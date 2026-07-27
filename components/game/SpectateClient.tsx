"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Eye, Trophy } from "lucide-react";
import Link from "next/link";
import { watchMatch, MatchDoc } from "@/lib/matchmaking";
import { getPublicProfile } from "@/lib/publicProfile";
import { SUIT_SYMBOLS, SUIT_COLOR, rankLabel, cardId, teamOf, SeatIndex } from "@/lib/mindiEngine";
import {
  SUIT_SYMBOLS as GIN_SUIT_SYMBOLS,
  SUIT_COLOR as GIN_SUIT_COLOR,
  rankLabel as ginRankLabel,
} from "@/lib/ginRummyEngine";
import type { MindiOnlineState } from "@/components/game/MindiOnlineClient";
import type { GinOnlineState } from "@/components/game/GinRummyOnlineClient";

/**
 * Read-only Spectator Mode view. Deliberately never renders the contents of
 * anyone's hand - only public information (card counts, the trick/discard
 * pile, trump, whose turn it is, tens/tricks captured) even though the
 * underlying match document (now readable by any signed-in user - see
 * firestore.rules) technically contains full hands. This mirrors the same
 * "the UI hides it even though the raw doc has it" trust model already
 * accepted for players' own opponents.
 */
export function SpectateClient({ matchId }: { matchId: string }) {
  const [match, setMatch] = useState<MatchDoc<unknown> | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = watchMatch<unknown>(matchId, setMatch);
    return unsub;
  }, [matchId]);

  useEffect(() => {
    if (!match) return;
    const missing = match.players.filter((uid) => !(uid in names));
    if (missing.length === 0) return;
    Promise.all(missing.map((uid) => getPublicProfile(uid).then((p) => [uid, p?.displayName ?? "Player"] as const))).then(
      (entries) => setNames((prev) => ({ ...prev, ...Object.fromEntries(entries) }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.players.join(",")]);

  if (!match) {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center">
        <p className="text-[rgb(var(--c4))] text-sm">Loading match…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <Link href="/play">
          <button className="p-2 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
            <ArrowLeft size={18} className="text-[#D4AF37]" />
          </button>
        </Link>
        <div className="flex items-center gap-1.5 text-[rgb(var(--c4))] text-xs">
          <Eye size={14} className="text-[#D4AF37]" /> Spectating
        </div>
        <div className="w-9" />
      </div>

      {match.gameType === "mindi" ? (
        <MindiSpectateView match={match as MatchDoc<MindiOnlineState>} names={names} />
      ) : (
        <GinSpectateView match={match as MatchDoc<GinOnlineState>} names={names} />
      )}
    </div>
  );
}

function MindiSpectateView({ match, names }: { match: MatchDoc<MindiOnlineState>; names: Record<string, string> }) {
  const state = match.state;

  if (state.outcome) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-3">
        <p className="text-[rgb(var(--text-primary))] text-lg font-bold">
          {state.outcome.special === "forfeit" ? "Match ended by forfeit" : `Team ${state.outcome.winner} won`}
        </p>
        <p className="text-[rgb(var(--c4))] text-sm">
          Tens: A {state.outcome.tensCaptured.A} — B {state.outcome.tensCaptured.B}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-4 py-2 space-y-4">
      <div className="glass-card rounded-2xl p-3 flex items-center justify-between text-xs">
        <span className="text-[rgb(var(--text-primary))]">
          Team A — <span className="text-[#D4AF37] font-bold">{state.tensCaptured.A} tens</span>
        </span>
        <span className="text-[rgb(var(--c4))]">
          Trump: <span className={SUIT_COLOR[state.trumpSuit] === "red" ? "text-red-400" : "text-[rgb(var(--text-primary))]"}>{SUIT_SYMBOLS[state.trumpSuit]}</span>
        </span>
        <span className="text-[rgb(var(--text-primary))]">
          Team B — <span className="text-[#D4AF37] font-bold">{state.tensCaptured.B} tens</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {match.players.map((uid, seat) => (
          <div
            key={uid}
            className={`rounded-xl border p-3 ${state.turnSeat === seat ? "border-[#D4AF37] bg-[#D4AF37]/10" : "border-[rgb(var(--c3))] bg-[rgb(var(--c2))]"}`}
          >
            <p className="text-[rgb(var(--text-primary))] text-sm font-medium truncate">{names[uid] ?? "Player"}</p>
            <p className="text-[rgb(var(--c4))] text-xs">
              Team {teamOf(seat as SeatIndex)} · {state.handsByUid[uid]?.length ?? 0} cards
            </p>
          </div>
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {state.trick.length === 0 ? (
            <span className="text-[rgb(var(--c3))] text-xs">Waiting for the next trick…</span>
          ) : (
            state.trick.map((play) => (
              <div key={cardId(play.card)} className="w-10 h-14 rounded-md flex flex-col items-center justify-center border bg-[rgb(var(--c2))] border-[rgb(var(--c3))]">
                <span className={`text-xs font-bold ${SUIT_COLOR[play.card.suit] === "red" ? "text-red-400" : "text-[rgb(var(--text-primary))]"}`}>{rankLabel(play.card.rank)}</span>
                <span className={`text-[10px] ${SUIT_COLOR[play.card.suit] === "red" ? "text-red-400" : "text-[rgb(var(--text-primary))]"}`}>{SUIT_SYMBOLS[play.card.suit]}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function GinSpectateView({ match, names }: { match: MatchDoc<GinOnlineState>; names: Record<string, string> }) {
  const state = match.state;
  const topDiscard = state.discard.length > 0 ? state.discard[state.discard.length - 1] : null;

  if (state.result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-3">
        <p className="text-[rgb(var(--text-primary))] text-lg font-bold">
          {state.result.winnerUid === "draw" ? "Match ended in a draw" : `${names[state.result.winnerUid] ?? "A player"} won`}
        </p>
        {state.result.gin && <p className="text-[#D4AF37] text-sm font-semibold">Gin!</p>}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-4 py-2 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {match.players.map((uid) => (
          <div
            key={uid}
            className={`rounded-xl border p-3 ${state.turn === uid ? "border-[#D4AF37] bg-[#D4AF37]/10" : "border-[rgb(var(--c3))] bg-[rgb(var(--c2))]"}`}
          >
            <p className="text-[rgb(var(--text-primary))] text-sm font-medium truncate">{names[uid] ?? "Player"}</p>
            <p className="text-[rgb(var(--c4))] text-xs">{state.hands[uid]?.length ?? 0} cards</p>
          </div>
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center gap-6">
        <div className="text-center">
          <div className="w-12 h-16 rounded-md border border-[rgb(var(--c3))] bg-[rgb(var(--c2))] flex items-center justify-center">
            <Trophy size={16} className="text-[rgb(var(--c3))]" />
          </div>
          <p className="text-[rgb(var(--c4))] text-[10px] mt-1">Stock ({state.stock.length})</p>
        </div>
        <div className="text-center">
          {topDiscard ? (
            <div className="w-12 h-16 rounded-md border bg-[rgb(var(--c2))] border-[rgb(var(--c3))] flex flex-col items-center justify-center">
              <span className={`text-sm font-bold ${GIN_SUIT_COLOR[topDiscard.suit] === "red" ? "text-red-400" : "text-[rgb(var(--text-primary))]"}`}>{ginRankLabel(topDiscard.rank)}</span>
              <span className={`text-xs ${GIN_SUIT_COLOR[topDiscard.suit] === "red" ? "text-red-400" : "text-[rgb(var(--text-primary))]"}`}>{GIN_SUIT_SYMBOLS[topDiscard.suit]}</span>
            </div>
          ) : (
            <div className="w-12 h-16 rounded-md border border-dashed border-[rgb(var(--c3))]" />
          )}
          <p className="text-[rgb(var(--c4))] text-[10px] mt-1">Discard</p>
        </div>
      </div>

      <p className="text-[rgb(var(--c4))] text-xs text-center">
        {names[state.turn] ?? "Player"}&apos;s turn — {state.phase === "draw" ? "drawing" : "discarding"}
      </p>
    </div>
  );
}
