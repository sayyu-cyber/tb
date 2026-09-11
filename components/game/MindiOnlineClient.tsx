"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { updateMatchResult } from "@/lib/trophyUpdates";
import MatchRewardPopup from "@/components/rewards/MatchRewardPopup";
import { LeaveMatchButton } from "@/components/game/LeaveMatchButton";
import { watchMatch, updateMatchState, MatchDoc } from "@/lib/matchmaking";
import {
  Card,
  SeatIndex,
  Team,
  TrickPlay,
  SUIT_SYMBOLS,
  SUIT_COLOR,
  rankLabel,
  cardId,
  teamOf,
  nextSeat,
  nextSeatFFA1v1,
  getLegalPlays,
  resolveTrick,
  isTen,
  checkHandOutcome,
  HandOutcome,
} from "@/lib/mindiEngine";
import { useTranslation } from "@/hooks/useTranslation";
import { PlayingCard, suitFromLetter } from "@/components/game/PlayingCard";
import { sortHand } from "@/lib/cardSort";
import { useToast } from "@/contexts/ToastContext";
import { useOpponentProfiles } from "@/hooks/useOpponentProfiles";
import { ArenaFelt, ArenaHeader, ArenaTable, OpponentSeat, TableWell, SelfRow, ArenaSeatData } from "@/components/game/GameArena";

export interface MindiOnlineState {
  handsByUid: Record<string, Card[]>;
  trumpSuit: Card["suit"];
  turnSeat: SeatIndex;
  trick: TrickPlay[];
  tensCaptured: Record<Team, number>;
  tricksWon: Record<Team, number>;
  tricksPlayed: number;
  outcome: HandOutcome | null;
  /** 4 = the standard 2v2 partnership game (default, matches every match
   *  created before this field existed). 2 = the 1v1 FFA room variant
   *  (dealMindiHandFFA1v1) - only seats 0 and 1 are ever used. */
  numPlayers?: 2 | 4;
}

export function MindiOnlineClient({ matchId }: { matchId: string }) {
  const { user, playerStats } = useAuth();
  const { processMatchEnd } = useEconomy();
  const myUid = user?.uid ?? "";
  const t = useTranslation();
  const { showToast } = useToast();
  const SEAT_NAMES = [t("mindi_you"), t("mindi_leftOpponent"), t("mindi_partner"), t("mindi_rightOpponent")];

  const [match, setMatch] = useState<MatchDoc<MindiOnlineState> | null>(null);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [rewardsApplied, setRewardsApplied] = useState(false);

  useEffect(() => {
    const unsub = watchMatch<MindiOnlineState>(matchId, setMatch);
    return unsub;
  }, [matchId]);

  const mySeat = useMemo(
    () => (match ? (match.players.indexOf(myUid) as SeatIndex) : (0 as SeatIndex)),
    [match, myUid]
  );
  const myTeam: Team = teamOf(mySeat);
  const state = match?.state;
  const numPlayers = state?.numPlayers ?? 4;
  const myHand = sortHand(state?.handsByUid[myUid] ?? []);
  const isMyTurn = state?.turnSeat === mySeat;
  const ledSuit = state && state.trick.length > 0 ? state.trick[0].card.suit : null;
  const legalForMe = state ? getLegalPlays(myHand, ledSuit) : [];

  const opponentProfiles = useOpponentProfiles(match?.players.filter((p) => p !== myUid) ?? []);

  function seatLabelFor(seat: SeatIndex): string {
    if (numPlayers === 2) return t("mindi_opponent");
    // Relative to the viewer: same seat = You, +2 = Partner, others = opponents.
    const relative = (((seat - mySeat) % 4) + 4) % 4;
    return SEAT_NAMES[relative];
  }

  /** Builds the arena seat data (name, avatar, card-back skin, live count) for a given seat index. */
  function seatDataFor(seat: SeatIndex): ArenaSeatData {
    const uid = match?.players[seat] ?? "";
    const profile = opponentProfiles[uid];
    return {
      uid,
      name: profile?.displayName ?? seatLabelFor(seat),
      avatarPreset: profile?.avatarPreset,
      cardBackId: profile?.cardBack,
      cardCount: state?.handsByUid[uid]?.length ?? 0,
      active: state?.turnSeat === seat,
    };
  }

  async function handlePlayCard(card: Card) {
    if (!state || !isMyTurn || !match) return;
    if (!legalForMe.some((c) => cardId(c) === cardId(card))) return;

    await updateMatchState<MindiOnlineState>(matchId, (current) => {
      const s = current.state;
      if (s.turnSeat !== mySeat) return null;
      const n = s.numPlayers ?? 4;

      const hand = s.handsByUid[myUid].filter((c) => cardId(c) !== cardId(card));
      const trick = [...s.trick, { seat: mySeat, card }];

      if (trick.length < n) {
        return {
          state: {
            ...s,
            handsByUid: { ...s.handsByUid, [myUid]: hand },
            trick,
            turnSeat: n === 2 ? nextSeatFFA1v1(mySeat as 0 | 1) : nextSeat(mySeat),
          },
        };
      }

      // Trick complete - resolve immediately.
      const winnerSeat = resolveTrick(trick, s.trumpSuit);
      const winnerTeam = teamOf(winnerSeat);
      const tensInTrick = trick.filter((p) => isTen(p.card)).length;
      const tensCaptured = { ...s.tensCaptured, [winnerTeam]: s.tensCaptured[winnerTeam] + tensInTrick };
      const tricksWon = { ...s.tricksWon, [winnerTeam]: s.tricksWon[winnerTeam] + 1 };
      const tricksPlayed = s.tricksPlayed + 1;
      const outcome = checkHandOutcome(tensCaptured, tricksWon, tricksPlayed, n === 2 ? 26 : 13);

      const nextState: MindiOnlineState = {
        ...s,
        handsByUid: { ...s.handsByUid, [myUid]: hand },
        trick: [],
        tensCaptured,
        tricksWon,
        tricksPlayed,
        turnSeat: outcome ? s.turnSeat : winnerSeat,
        outcome,
      };

      return outcome ? { status: "completed", state: nextState } : { state: nextState };
    });
  }

  async function handleShowRewards() {
    if (!state?.outcome || rewardsApplied) {
      setShowRewardPopup(true);
      return;
    }
    setRewardsApplied(true);
    const youWon = state.outcome.winner === myTeam;
    processMatchEnd(youWon, "mindi");
    // Casual is a no-stakes queue (see CasualOnlineClient) - coins/mission
    // progress still apply via processMatchEnd above, same as vs-AI/Pass &
    // Play, but trophies/rank/win-loss record are real-multiplayer-Ranked
    // only, so skip updateMatchResult entirely for a casual match.
    if (match?.pool !== "casual") {
      const trophyMultiplier = match?.pool === "weekend" ? 2 : 1;
      // A failure here means the player's trophies/rank silently didn't
      // move after a match they just finished - previously swallowed, so
      // it looked like the game simply forgot the result.
      await updateMatchResult(myUid, youWon, "mindi", trophyMultiplier).catch(() => {
        showToast(t("toast_trophiesFailed"), "error");
      });
    }
    setShowRewardPopup(true);
  }

  async function handleForfeit() {
    if (!match) return;
    const opponentTeam: Team = myTeam === "A" ? "B" : "A";
    await updateMatchState<MindiOnlineState>(matchId, (current) => {
      const s = current.state;
      if (s.outcome) return null; // match already ended some other way
      return {
        status: "completed",
        state: {
          ...s,
          outcome: {
            winner: opponentTeam,
            tensCaptured: s.tensCaptured,
            tricksWon: s.tricksWon,
            special: "forfeit",
          },
        },
      };
    }).catch(() => {
      // If the forfeit write fails the match never actually ends, so the
      // opponent is left waiting on a player who has already gone.
      showToast(t("toast_forfeitFailed"), "error");
    });

    // We're leaving, so we won't be around to click "Rewards" ourselves -
    // take the loss on our own account right now instead.
    processMatchEnd(false, "mindi");
    if (match.pool !== "casual") {
      const trophyMultiplier = match.pool === "weekend" ? 2 : 1;
      await updateMatchResult(myUid, false, "mindi", trophyMultiplier).catch(() => {
        showToast(t("toast_trophiesFailed"), "error");
      });
    }
  }

  if (!match || !state) {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center">
        <p className="text-[rgb(var(--c4))] text-sm">{t("common_loadingMatch")}</p>
      </div>
    );
  }

  if (state.outcome) {
    const youWon = state.outcome.winner === myTeam;
    return (
      <>
        <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${
                youWon ? "bg-gradient-to-br from-[rgb(var(--gold))] to-[rgb(var(--gold-bright))] shadow-[0_0_40px_rgba(212,175,55,0.3)]" : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]"
              }`}
            >
              <Sparkles size={40} className={youWon ? "text-[#0F0F0F]" : "text-[rgb(var(--c4))]"} />
            </motion.div>
            <div>
              <h1 className={`text-3xl font-bold ${youWon ? "gold-text-gradient" : "text-[rgb(var(--c4))]"}`}>
                {state.outcome.special === "forfeit"
                  ? youWon
                    ? t("mindi_opponentForfeited")
                    : t("mindi_youForfeited")
                  : youWon
                  ? t("mindi_youWon")
                  : t("mindi_youLost")}
              </h1>
              {state.outcome.special && state.outcome.special !== "forfeit" && (
                <p className="text-[rgb(var(--gold))] text-sm font-semibold mt-1 uppercase tracking-wide">
                  {state.outcome.special === "baga" ? t("mindi_baga") : t("mindi_hukunbunye")}
                </p>
              )}
            </div>
            <div className="glass-card rounded-2xl p-6 max-w-xs mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[rgb(var(--c4))] text-xs">{numPlayers === 2 ? t("mindi_you") : t("mindi_yourTeam")} — {t("spectate_tensLabel")}</span>
                <span className="text-[rgb(var(--text-primary))] font-bold">{state.outcome.tensCaptured[myTeam]} / 4</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[rgb(var(--c4))] text-xs">{numPlayers === 2 ? t("mindi_opponent") : t("mindi_opponents")} — {t("spectate_tensLabel")}</span>
                <span className="text-[rgb(var(--text-primary))] font-bold">{state.outcome.tensCaptured[myTeam === "A" ? "B" : "A"]} / 4</span>
              </div>
            </div>
            <div className="flex gap-3 max-w-xs mx-auto">
              <Link href="/play" className="flex-1">
                <motion.button whileTap={{ scale: 0.95 }} className="w-full py-3 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--text-primary))] text-sm font-medium flex items-center justify-center gap-2">
                  <Home size={16} />
                  {t("common_exit")}
                </motion.button>
              </Link>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleShowRewards}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                {t("common_rewards")}
              </motion.button>
            </div>
          </motion.div>
        </div>
        <MatchRewardPopup
          isOpen={showRewardPopup}
          onClose={() => setShowRewardPopup(false)}
          isVictory={youWon}
          coinsEarned={youWon ? 10 : 2}
          trophyChange={match?.pool === "casual" ? 0 : youWon ? 15 : -5}
          newCoinBalance={0}
        />
      </>
    );
  }

  const partnerSeat = numPlayers !== 2 ? seatDataFor(((mySeat + 2) % 4) as SeatIndex) : null;
  const leftSeat = numPlayers !== 2 ? seatDataFor(((mySeat + 1) % 4) as SeatIndex) : seatDataFor((mySeat === 0 ? 1 : 0) as SeatIndex);
  const rightSeat = numPlayers !== 2 ? seatDataFor(((mySeat + 3) % 4) as SeatIndex) : null;
  const myProfile = { name: t("mindi_you"), avatarPreset: playerStats?.avatarPreset };

  return (
    <ArenaFelt accent="var(--lagoon)">
      <ArenaHeader
        leaveSlot={<LeaveMatchButton exitHref="/play" isOnlineMatch onConfirmLeave={handleForfeit} />}
        title={
          <>Mindi — {match.pool === "casual" ? t("gamesel_online") : match.pool === "weekend" ? t("page_weekendLeague") : t("mindi_poolRanked")}</>
        }
        subtitle={
          <>
            {t("mindi_trump")}: <span className={SUIT_COLOR[state.trumpSuit] === "red" ? "text-red-400" : "text-[rgb(var(--text-primary))]"}>{SUIT_SYMBOLS[state.trumpSuit]}</span>
          </>
        }
      />

      <div className="px-4 pb-2">
        <div className="glass-card rounded-2xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-[rgb(var(--gold))]" />
            <span className="text-[rgb(var(--text-primary))] font-medium">{numPlayers === 2 ? t("mindi_you") : t("mindi_yourTeam")}</span>
            <span className="text-[rgb(var(--gold))] font-bold">{state.tensCaptured[myTeam]} {t("spectate_tensLabel")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[rgb(var(--gold))] font-bold">{state.tensCaptured[myTeam === "A" ? "B" : "A"]} {t("spectate_tensLabel")}</span>
            <span className="text-[rgb(var(--text-primary))] font-medium">{numPlayers === 2 ? t("mindi_opponent") : t("mindi_opponents")}</span>
          </div>
        </div>
      </div>

      <ArenaTable>
        <div className="flex-1 flex flex-col items-center justify-between">
          <div className="h-14 flex items-center justify-center">
            {partnerSeat && <OpponentSeat seat={partnerSeat} orientation="column" />}
          </div>

          <div className="flex items-center justify-between w-full max-w-sm">
            <div className="w-20">{leftSeat && <OpponentSeat seat={leftSeat} orientation="column" />}</div>

            <TableWell>
              {state.trick.length === 0 ? (
                <span className="text-[rgb(var(--c3))] text-xs">{isMyTurn ? t("mindi_yourTurn") : t("mindi_waiting")}</span>
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

            <div className="w-20">{rightSeat && <OpponentSeat seat={rightSeat} orientation="column" />}</div>
          </div>

          <div className="w-full">
            <SelfRow
              name={myProfile.name}
              avatarPreset={myProfile.avatarPreset}
              active={isMyTurn}
              trailing={<span className="text-[rgb(var(--c4))] text-[11px]">{isMyTurn ? t("mindi_selectCard") : t("mindi_waitingOthers")}</span>}
            />
            <div className="flex justify-center gap-1.5 flex-wrap">
              {myHand.map((card) => {
                const canPlay = isMyTurn && legalForMe.some((c) => cardId(c) === cardId(card));
                return (
                  <PlayingCard
                    key={cardId(card)}
                    rank={rankLabel(card.rank)}
                    suit={suitFromLetter(card.suit)}
                    size="md"
                    disabled={!canPlay}
                    onClick={() => canPlay && handlePlayCard(card)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </ArenaTable>
    </ArenaFelt>
  );
}
