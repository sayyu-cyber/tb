"use client";
import { MindiTable } from "./MindiTable";
import { MindiDealIntro } from "./MindiDealIntro";

import { useState, useEffect, useMemo, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { updateMatchResult } from "@/lib/trophyUpdates";
import { TROPHY_WIN, TROPHY_LOSS } from "@/constants/ranks";
import { MindiResultScreen } from "./MindiResultScreen";
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
  tensFromTrick,
  HandOutcome,
  TenCapture,
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
  /** Every Ten as it was taken, for the hand-over reveal. Absent on matches
   *  that started before this existed - those end on the same screen with
   *  the row of Tens left out rather than guessed at. */
  tenCaptures?: TenCapture[];
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
  const [rewardsApplied, setRewardsApplied] = useState(false);
  // The trophy total updateMatchResult actually wrote, so the result
  // screen counts up to the real number rather than to whatever the auth
  // listener happens to be holding when the hand ends.
  const [trophiesAfter, setTrophiesAfter] = useState<number | null>(null);
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
        // The same Tens the tally above just counted, recorded individually
        // so the hand-over screen can turn them face up (Result board).
        tenCaptures: [...(s.tenCaptures ?? []), ...tensFromTrick(trick, winnerSeat, tricksPlayed)],
        tricksWon,
        tricksPlayed,
        turnSeat: outcome ? s.turnSeat : winnerSeat,
        outcome,
      };

      return outcome ? { status: "completed", state: nextState } : { state: nextState };
    });
  }

  /**
   * CODE ISSUE 6 lived here. The reward popup was told
   * `youWon ? 15 : -5`, two numbers that appear nowhere in the rules: a
   * ranked hand is worth TROPHY_WIN / TROPHY_LOSS (+5 / -2), doubled to
   * +10 / -4 in the Weekend League pool, and a casual hand is worth
   * nothing. So the screen congratulated players on trophies they had not
   * been given, and understated the weekend bonus. The figure shown is now
   * the same expression updateMatchResult is called with, one line below,
   * so the two cannot disagree again.
   */
  const trophyMultiplier = match?.pool === "weekend" ? 2 : 1;
  const stakes = match?.pool === "casual" ? 0 : trophyMultiplier;

  /**
   * Rewards land as the hand ends, not when a button is pressed. The board
   * (design/arena/boards/Result.dc.html) shows what the hand paid on the
   * result screen itself, and the Gin result already worked this way.
   */
  const applyRewards = useCallback(async () => {
    if (!state?.outcome || rewardsApplied) return;
    setRewardsApplied(true);
    const youWon = state.outcome.winner === myTeam;
    processMatchEnd(youWon, "mindi");
    // Casual is a no-stakes queue (see CasualOnlineClient) - coins/mission
    // progress still apply via processMatchEnd above, same as vs-AI/Pass &
    // Play, but trophies/rank/win-loss record are real-multiplayer-Ranked
    // only, so skip updateMatchResult entirely for a casual match.
    if (match?.pool !== "casual") {
      // A failure here means the player's trophies/rank silently didn't
      // move after a match they just finished - previously swallowed, so
      // it looked like the game simply forgot the result.
      const result = await updateMatchResult(myUid, youWon, "mindi", trophyMultiplier).catch(() => {
        showToast(t("toast_trophiesFailed"), "error");
        return null;
      });
      if (result) setTrophiesAfter(result.newTrophies);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.outcome, rewardsApplied, myTeam, match?.pool, trophyMultiplier, myUid]);

  useEffect(() => { if (state?.outcome) applyRewards(); }, [state?.outcome, applyRewards]);

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
    const poolLabel = match.pool === "casual" ? "Casual online"
      : match.pool === "weekend" ? "Weekend League"
      : numPlayers === 2 ? "Ranked 1v1" : "Ranked duo";
    // The winning side's real names, for the line under the headline.
    const winnerNames = (match.players as string[])
      .map((uid, seat) => ({ uid, seat: seat as SeatIndex }))
      .filter(({ seat }) => teamOf(seat) === state.outcome!.winner)
      .map(({ uid, seat }) => (uid === myUid ? "You" : opponentProfiles[uid]?.displayName ?? seatLabelFor(seat)));
    return (
      <MindiResultScreen
        outcome={state.outcome}
        myTeam={myTeam}
        tenCaptures={state.tenCaptures ?? []}
        numPlayers={numPlayers}
        totalTricks={numPlayers === 2 ? 26 : 13}
        modeLabel={poolLabel}
        weekend={match.pool === "weekend"}
        trophyChange={(youWon ? TROPHY_WIN : TROPHY_LOSS) * stakes}
        trophiesAfter={trophiesAfter ?? playerStats?.trophies ?? null}
        coins={youWon ? 10 : 2}
        balance={economyState.economy.coins}
        winnerNames={winnerNames}
        playAgainHref={match.pool === "casual" ? "/play/mindi/casual/online" : "/play/mindi/ranked-duo"}
      />
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
    tableSkin={activeTableTheme} tenCaptures={state.tenCaptures ?? []} online
    onPlay={handlePlayCard} onLeave={handleForfeit}/>;
}
