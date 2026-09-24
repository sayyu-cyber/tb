"use client";
import { MindiTable } from "./MindiTable";
import { MindiDealIntro } from "./MindiDealIntro";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Home, Sparkles, Users, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { updateMatchResult } from "@/lib/trophyUpdates";
import MatchRewardPopup from "@/components/rewards/MatchRewardPopup";
import { watchMatch, updateMatchState, MatchDoc } from "@/lib/matchmaking";
import {
  Card,
  Suit,
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
  establishTrump,
  FirstPlayerDraw,
  isTen,
  checkHandOutcome,
  HandOutcome,
} from "@/lib/mindiEngine";
import { useTranslation } from "@/hooks/useTranslation";
import { sortHand } from "@/lib/cardSort";
import { useToast } from "@/contexts/ToastContext";
import { useOpponentProfiles } from "@/hooks/useOpponentProfiles";
import { ArenaSeatData } from "@/components/game/GameArena";

export interface MindiOnlineState {
  lastTrick?: import("@/lib/mindiEngine").CompletedTrick;
  handsByUid: Record<string, Card[]>;
  /** Null until a player reneges - see establishTrump in lib/mindiEngine.ts.
   *  Matches created before the rules rewrite carry a suit here from the
   *  deal; those still resolve correctly, the suit is just fixed up front. */
  trumpSuit: Suit | null;
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
  /** The four-card draw that decided who leads, stored so every client shows
   *  the same opening ceremony. Absent on matches created before this
   *  existed - those simply start without the ceremony. */
  firstDraw?: FirstPlayerDraw;
}

export function MindiOnlineClient({ matchId }: { matchId: string }) {
  const { user, playerStats } = useAuth();
  const { processMatchEnd, state: economyState } = useEconomy();
  const myUid = user?.uid ?? "";
  const t = useTranslation();
  const { showToast } = useToast();
  const SEAT_NAMES = [t("mindi_you"), t("mindi_leftOpponent"), t("mindi_partner"), t("mindi_rightOpponent")];

  const [match, setMatch] = useState<MatchDoc<MindiOnlineState> | null>(null);
  const [matchLoadError, setMatchLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [rewardsApplied, setRewardsApplied] = useState(false);
  const [introSeen, setIntroSeen] = useState(false);

  useEffect(() => {
    setMatchLoadError(false);
    setMatch(null);
    const unsub = watchMatch<MindiOnlineState>(matchId, next => {
      setMatch(next);
      if (!next) setMatchLoadError(true);
    }, () => setMatchLoadError(true));
    return unsub;
  }, [matchId, retryKey]);

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

  function tableThemeForUid(uid?: string): string {
    if (!uid || uid === myUid) return economyState.profile.equipped.tableTheme;
    return opponentProfiles[uid]?.tableTheme || "tt_default";
  }

  async function handlePlayCard(card: Card) {
    if (!state || !isMyTurn || !match) return;
    if (!legalForMe.some((c) => cardId(c) === cardId(card))) return;

    await updateMatchState<MindiOnlineState>(matchId, (current) => {
      const s = current.state;
      if (current.status!=="active" || s.turnSeat !== mySeat || s.outcome || current.players[mySeat]!==myUid || s.trick.some(play=>play.seat===mySeat)) return null;
      const n = s.numPlayers ?? 4;
      const liveHand = s.handsByUid[myUid] ?? [];
      const liveLedSuit = s.trick[0]?.card.suit ?? null;
      if (!getLegalPlays(liveHand, liveLedSuit).some(c => cardId(c) === cardId(card))) return null;

      const hand = s.handsByUid[myUid].filter((c) => cardId(c) !== cardId(card));
      const trick = [...s.trick, { seat: mySeat, card }];
      // Playing off-suit *is* the renege, because getLegalPlays above already
      // rejected this card unless the hand was void in the led suit. Commit
      // the new trump in the same write as the card so every client's trump
      // readout moves the moment the card lands, not a trick later.
      const trumpSuit = establishTrump(s.trumpSuit, liveLedSuit, card);

      if (trick.length < n) {
        return {
          state: {
            ...s,
            handsByUid: { ...s.handsByUid, [myUid]: hand },
            trick,
            trumpSuit,
            turnSeat: n === 2 ? nextSeatFFA1v1(mySeat as 0 | 1) : nextSeat(mySeat),
          },
        };
      }

      // Trick complete - resolve immediately. A trump established by this very
      // card counts within this trick, which is why trumpSuit is used here.
      const winnerSeat = resolveTrick(trick, trumpSuit);
      const winnerTeam = teamOf(winnerSeat);
      const tensInTrick = trick.filter((p) => isTen(p.card)).length;
      const tensCaptured = { ...s.tensCaptured, [winnerTeam]: s.tensCaptured[winnerTeam] + tensInTrick };
      const tricksWon = { ...s.tricksWon, [winnerTeam]: s.tricksWon[winnerTeam] + 1 };
      const tricksPlayed = s.tricksPlayed + 1;
      const outcome = checkHandOutcome(tensCaptured, tricksWon, tricksPlayed, n === 2 ? 26 : 13);

      const nextState: MindiOnlineState = {
        ...s,
        handsByUid: { ...s.handsByUid, [myUid]: hand },
        trumpSuit,
        trick: [],
        lastTrick: {plays:trick,winner:winnerSeat,number:tricksPlayed},
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
    }).catch((error) => {
      // If the forfeit write fails the match never actually ends, so the
      // opponent is left waiting on a player who has already gone.
      showToast(t("toast_forfeitFailed"), "error");
      throw error;
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

  if (matchLoadError || !match || !state) {
    return (
      <div className="gin-room gin-load-screen">
        {matchLoadError ? (
          <div className="glass-card rounded-2xl p-6 max-w-xs">
            <p className="text-[rgb(var(--c4))] text-sm">{t("common_loadMatchError")}</p>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[rgb(var(--c3))] px-4 py-2 text-xs font-semibold text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--c3)/70%)] transition-colors"
            >
              <RefreshCw size={13} aria-hidden="true" />
              {t("error_tryAgain")}
            </button>
            <Link href="/play" className="block mt-4 underline">Return to Lobby</Link>
          </div>
        ) : (
          <div role="status" className="gin-load-table"><h1>Mindi</h1><div className="gin-load-cards" aria-hidden="true">{[0,1,2,3,4].map(i=><span key={i}/>)}</div><p>{t("common_loadingMatch")}</p></div>
        )}
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
                youWon ? "bg-gradient-to-br from-[rgb(var(--gold))] to-[rgb(var(--gold-bright))] shadow-[0_0_40px_rgb(var(--gold)/30%)]" : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]"
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
                <p className="text-[rgb(var(--gold-ink))] text-sm font-semibold mt-1 uppercase tracking-wide">
                  {state.outcome.special === "haasbaga" ? t("mindi_haasbaga") : t("mindi_baga")}
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
              <div className="flex items-center justify-between"><span className="text-xs">{numPlayers === 2 ? "Your tricks" : "Your Team tricks"}</span><strong>{state.outcome.tricksWon[myTeam]}</strong></div>
              <div className="flex items-center justify-between"><span className="text-xs">Opponent tricks</span><strong>{state.outcome.tricksWon[myTeam === "A" ? "B" : "A"]}</strong></div>
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

  // Seating is relative to the viewer, who is always at the bottom.
  // 4-player: partner opposite, opponents left and right. 1v1 (the FFA room
  // variant): the lone opponent sits opposite, NOT off to one side - putting
  // them in the left slot left the top empty and the whole table lopsided.
  const isDuel = numPlayers === 2;
  const topSeat = isDuel
    ? seatDataFor((mySeat === 0 ? 1 : 0) as SeatIndex)
    : seatDataFor(((mySeat + 2) % 4) as SeatIndex);
  const leftSeat = isDuel ? null : seatDataFor(((mySeat + 1) % 4) as SeatIndex);
  const rightSeat = isDuel ? null : seatDataFor(((mySeat + 3) % 4) as SeatIndex);
  const myProfile = { name: t("mindi_you"), avatarPreset: playerStats?.avatarPreset };
  const activeTableTheme = tableThemeForUid(match.players[0]);

  // Only at the very start of a hand: a player who reloads mid-match rejoins
  // straight into play rather than re-watching the opening. Matches created
  // before firstDraw existed have no draw to show, so they skip it too.
  const showIntro =
    !introSeen && !!state.firstDraw && state.tricksPlayed === 0 && state.trick.length === 0 && !state.outcome;
  const introSeats: SeatIndex[] = isDuel ? [0, 1] : [0, 1, 2, 3];
  const introNames = introSeats.reduce((acc, seat) => {
    acc[seat] = seat === mySeat ? user?.displayName ?? t("mindi_you") : seatDataFor(seat).name;
    return acc;
  }, {} as Record<SeatIndex, string>);

  // The ceremony replaces the table rather than sitting on top of it. Rendered
  // together, the table paints first and the dialog only opens on the effect
  // after it, so the player sees the table flash before the cut.
  if (showIntro && state.firstDraw) {
    return <MindiDealIntro draw={state.firstDraw} names={introNames}
      seats={introSeats} viewer={mySeat} handSize={isDuel ? 26 : 13} tableSkin={activeTableTheme}
      cardBacks={Object.fromEntries(introSeats.map(seat => [seat, seatDataFor(seat).cardBackId]))}
      onDone={() => setIntroSeen(true)}/>;
  }

  return <MindiTable hand={myHand} legal={legalForMe} viewer={mySeat} top={topSeat} left={leftSeat} right={rightSeat}
    name={user?.displayName ?? "You"} avatar={playerStats?.avatarPreset} active={isMyTurn}
    trump={state.trumpSuit} trick={state.trick} lastTrick={state.lastTrick} tens={state.tensCaptured} tricks={state.tricksWon}
    mode={match.pool === "casual" ? "Casual Online" : match.pool === "weekend" ? "Weekend League" : "Ranked"}
    tableSkin={activeTableTheme} online onPlay={handlePlayCard} onLeave={handleForfeit}/>;
}
