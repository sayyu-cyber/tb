"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { watchMatch, MatchDoc } from "@/lib/matchmaking";
import { getPublicProfile, PublicProfile } from "@/lib/publicProfile";
import { SUIT_SYMBOLS, SUIT_COLOR, rankLabel, cardId } from "@/lib/mindiEngine";
import { rankLabel as ginRankLabel } from "@/lib/ginRummyEngine";
import type { MindiOnlineState } from "@/components/game/MindiOnlineClient";
import type { GinOnlineState } from "@/components/game/GinRummyOnlineClient";
import { useTranslation } from "@/hooks/useTranslation";
import { PlayingCard, suitFromLetter } from "@/components/game/PlayingCard";
import { ArenaFelt, ArenaHeader, ArenaTable, OpponentSeat, TableWell, ArenaSeatData } from "@/components/game/GameArena";

/**
 * Read-only Spectator Mode view. Deliberately never renders the contents of
 * anyone's hand - only public information (card counts, the trick/discard
 * pile, trump, whose turn it is, tens/tricks captured) even though the
 * underlying match document (now readable by any signed-in user - see
 * firestore.rules) technically contains full hands. This mirrors the same
 * "the UI hides it even though the raw doc has it" trust model already
 * accepted for players' own opponents.
 *
 * Uses the same arena shell as the players' own tables, so watching a match
 * looks like the game rather than a separate debug screen.
 */
export function SpectateClient({ matchId }: { matchId: string }) {
  const [match, setMatch] = useState<MatchDoc<unknown> | null>(null);
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({});
  const t = useTranslation();

  useEffect(() => {
    const unsub = watchMatch<unknown>(matchId, setMatch);
    return unsub;
  }, [matchId]);

  useEffect(() => {
    if (!match) return;
    const missing = match.players.filter((uid) => !(uid in profiles));
    if (missing.length === 0) return;
    Promise.all(missing.map((uid) => getPublicProfile(uid).then((p) => [uid, p] as const))).then((entries) =>
      setProfiles((prev) => {
        const next = { ...prev };
        for (const [uid, p] of entries) if (p) next[uid] = p;
        return next;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.players.join(",")]);

  if (!match) {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center">
        <p className="text-[rgb(var(--c4))] text-sm">{t("common_loadingMatch")}</p>
      </div>
    );
  }

  const isMindi = match.gameType === "mindi";

  return (
    <ArenaFelt accent={isMindi ? "var(--lagoon)" : "var(--deep)"}>
      <ArenaHeader
        leaveSlot={
          <Link href="/play">
            <button aria-label={t("a11y_goBack")} className="p-2 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
              <ArrowLeft size={18} className="text-[rgb(var(--gold-ink))]" />
            </button>
          </Link>
        }
        title={
          <span className="flex items-center justify-center gap-1.5">
            <Eye size={14} className="text-[rgb(var(--gold-ink))]" aria-hidden="true" />
            {t("spectate_spectating")}
          </span>
        }
      />

      {isMindi ? (
        <MindiSpectateView match={match as MatchDoc<MindiOnlineState>} profiles={profiles} />
      ) : (
        <GinSpectateView match={match as MatchDoc<GinOnlineState>} profiles={profiles} />
      )}
    </ArenaFelt>
  );
}

/** Public-only seat data: name, avatar, skin and card COUNT - never the cards. */
function seatFrom(uid: string, profile: PublicProfile | undefined, count: number, active: boolean, fallback: string): ArenaSeatData {
  return {
    uid,
    name: profile?.displayName ?? fallback,
    avatarPreset: profile?.avatarPreset,
    cardBackId: profile?.cardBack,
    cardCount: count,
    active,
  };
}

function MindiSpectateView({
  match,
  profiles,
}: {
  match: MatchDoc<MindiOnlineState>;
  profiles: Record<string, PublicProfile>;
}) {
  const state = match.state;
  const t = useTranslation();

  if (state.outcome) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-3">
        <p className="text-[rgb(var(--text-primary))] text-lg font-bold">
          {state.outcome.special === "forfeit" ? t("spectate_matchEndedForfeit") : t("spectate_teamWon").replace("{team}", state.outcome.winner)}
        </p>
        <p className="text-[rgb(var(--c4))] text-sm">
          {t("spectate_tens").replace("{a}", String(state.outcome.tensCaptured.A)).replace("{b}", String(state.outcome.tensCaptured.B))}
        </p>
      </div>
    );
  }

  const seatAt = (seat: number) => {
    const uid = match.players[seat] ?? "";
    return seatFrom(uid, profiles[uid], state.handsByUid[uid]?.length ?? 0, state.turnSeat === seat, t("profile_player"));
  };

  return (
    <>
      <div className="px-4 pb-2">
        <div className="glass-card rounded-2xl p-3 flex items-center justify-between text-xs">
          <span className="text-[rgb(var(--text-primary))]">
            {t("roomlobby_teamA")} — <span className="text-[rgb(var(--gold-ink))] font-bold">{state.tensCaptured.A} {t("spectate_tensLabel")}</span>
          </span>
          <span className="text-[rgb(var(--c4))]">
            {t("mindi_trump")}:{" "}
            <span className={SUIT_COLOR[state.trumpSuit] === "red" ? "text-[rgb(var(--suit-red))]" : "text-[rgb(var(--text-primary))]"}>
              {SUIT_SYMBOLS[state.trumpSuit]}
            </span>
          </span>
          <span className="text-[rgb(var(--text-primary))]">
            {t("roomlobby_teamB")} — <span className="text-[rgb(var(--gold-ink))] font-bold">{state.tensCaptured.B} {t("spectate_tensLabel")}</span>
          </span>
        </div>
      </div>

      <ArenaTable>
        <div className="flex-1 flex flex-col items-center justify-between gap-3">
          {/* Seat 2 sits opposite seat 0, so the table reads the same way
              round as it does for the players themselves. */}
          <div className="h-14 flex items-center justify-center">
            <OpponentSeat seat={seatAt(2)} orientation="column" />
          </div>

          <div className="flex items-center justify-between w-full max-w-sm">
            <div className="w-20">
              <OpponentSeat seat={seatAt(1)} orientation="column" />
            </div>

            <TableWell>
              {state.trick.length === 0 ? (
                <span className="text-[rgb(var(--c3))] text-xs">{t("spectate_waitingNextTrick")}</span>
              ) : (
                state.trick.map((play) => (
                  <motion.div
                    key={cardId(play.card)}
                    initial={{ opacity: 0, scale: 0.7, y: -18 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 450, damping: 26 }}
                  >
                    <PlayingCard rank={rankLabel(play.card.rank)} suit={suitFromLetter(play.card.suit)} size="sm" />
                  </motion.div>
                ))
              )}
            </TableWell>

            <div className="w-20">
              <OpponentSeat seat={seatAt(3)} orientation="column" />
            </div>
          </div>

          <div className="h-14 flex items-center justify-center">
            <OpponentSeat seat={seatAt(0)} orientation="column" />
          </div>
        </div>
      </ArenaTable>
    </>
  );
}

function GinSpectateView({
  match,
  profiles,
}: {
  match: MatchDoc<GinOnlineState>;
  profiles: Record<string, PublicProfile>;
}) {
  const state = match.state;
  const topDiscard = state.discard.length > 0 ? state.discard[state.discard.length - 1] : null;
  const t = useTranslation();

  if (state.result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-3">
        <p className="text-[rgb(var(--text-primary))] text-lg font-bold">
          {state.result.winnerUid === "draw"
            ? t("spectate_matchDraw")
            : t("spectate_playerWon").replace("{name}", profiles[state.result.winnerUid]?.displayName ?? t("profile_player"))}
        </p>
        {state.result.gin && <p className="text-[rgb(var(--gold-ink))] text-sm font-semibold">{t("spectate_gin")}</p>}
      </div>
    );
  }

  const seatFor = (uid: string) =>
    seatFrom(uid, profiles[uid], state.hands[uid]?.length ?? 0, state.turn === uid, t("profile_player"));

  const [first, second] = match.players;

  return (
    <ArenaTable>
      <div className="flex-1 flex flex-col items-center justify-between gap-3">
        <div className="h-14 flex items-center justify-center">
          <OpponentSeat seat={seatFor(second ?? "")} orientation="column" />
        </div>

        <TableWell>
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <PlayingCard rank="" suit="spades" size="lg" faceDown />
              <span className="text-[10px] text-[rgb(var(--c4))]">
                {t("spectate_stock").replace("{n}", String(state.stock.length))}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              {topDiscard ? (
                <PlayingCard rank={ginRankLabel(topDiscard.rank)} suit={suitFromLetter(topDiscard.suit)} size="lg" />
              ) : (
                <div className="w-16 h-24 rounded-xl border border-dashed border-[rgb(var(--c3))]" />
              )}
              <span className="text-[10px] text-[rgb(var(--c4))]">{t("spectate_discard")}</span>
            </div>
          </div>
        </TableWell>

        <div className="h-14 flex items-center justify-center">
          <OpponentSeat seat={seatFor(first ?? "")} orientation="column" />
        </div>

        <p className="text-[rgb(var(--c4))] text-xs text-center">
          {t("spectate_playerTurn")
            .replace("{name}", profiles[state.turn]?.displayName ?? t("profile_player"))
            .replace("{phase}", state.phase === "draw" ? t("spectate_turnDrawing") : t("spectate_turnDiscarding"))}
        </p>
      </div>
    </ArenaTable>
  );
}
