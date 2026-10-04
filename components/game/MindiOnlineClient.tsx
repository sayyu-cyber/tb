"use client";
import { MindiTable } from "./MindiTable";
import { mindiOpening, useOpeningDeal } from "./MindiDealIntro";

import { useState, useEffect, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { TROPHY_WIN, TROPHY_LOSS } from "@/constants/ranks";
import { MindiResultScreen } from "./MindiResultScreen";
import { watchMatch, sendMatchMove, MatchDoc } from "@/lib/matchmaking";
import {
  Card, Suit, SeatIndex, Team, TrickPlay, teamOf, getLegalPlays,
  FirstPlayerDraw, HandOutcome, TenCapture,
} from "@/lib/mindiEngine";
import { useTranslation } from "@/hooks/useTranslation";
import { sortHand } from "@/lib/cardSort";
import { useToast } from "@/contexts/ToastContext";
import { useOpponentProfiles } from "@/hooks/useOpponentProfiles";
import { ArenaSeatData } from "@/components/game/GameArena";

export interface MindiOnlineState {
  lastTrick?: import("@/lib/mindiEngine").CompletedTrick;
  handsByUid: Record<string, Card[]>;
  handCounts?: Record<string, number>;
  turnDeadline?: number | null;
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
  const { state: economyState } = useEconomy();
  const myUid = user?.uid ?? "";
  const t = useTranslation();
  const { showToast } = useToast();
  const SEAT_NAMES = [t("mindi_you"), t("mindi_leftOpponent"), t("mindi_partner"), t("mindi_rightOpponent")];

  const [match, setMatch] = useState<MatchDoc<MindiOnlineState> | null>(null);
  const [matchLoadError, setMatchLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [introSeen, setIntroSeen] = useState(false);

  useEffect(() => {
    setMatchLoadError(false);
    setMatch(null);
    const unsub = watchMatch<MindiOnlineState>(matchId, next => {
      setMatch(next);
      setMatchLoadError(!next);
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

  // The opening deal replays the draw stored on the match, on this table,
  // from its first frame. Only at the very start of a hand: a player who
  // reloads mid-match rejoins straight into play rather than re-watching the
  // opening, and matches created before firstDraw existed start without it.
  const openingActive = !!state?.firstDraw && state.tricksPlayed === 0 && state.trick.length === 0 && !state.outcome;
  const openingNames = match?.players.map((uid, seat) => uid === myUid
    ? user?.displayName ?? t("mindi_you")
    : opponentProfiles[uid]?.displayName ?? seatLabelFor(seat as SeatIndex)) ?? [];
  const openingSetup = useMemo(() => openingActive && state?.firstDraw ? mindiOpening({
    draw: state.firstDraw, viewer: mySeat,
    // openMindiHand deals from seat 3, openMindiHandFFA1v1 from seat 1.
    dealer: numPlayers === 2 ? 1 : 3,
    seats: numPlayers === 2 ? [0, 1] : [0, 1, 2, 3],
    names: Object.fromEntries(openingNames.map((name, seat) => [seat, name])),
    roles: Object.fromEntries((numPlayers === 2 ? [0, 1] : [0, 1, 2, 3]).map(seat => [seat,
      seat === mySeat ? t("mindi_you") : numPlayers !== 2 && teamOf(seat as SeatIndex) === myTeam ? t("mindi_partner") : t("mindi_opponent")])),
    handSize: numPlayers === 2 ? 26 : 13,
    cardBack: economyState.profile.equipped.cardBack,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }) : null, [openingActive, state?.firstDraw, mySeat, numPlayers, openingNames.join("|")]);
  const opening = useOpeningDeal(openingSetup, { onReady: () => setIntroSeen(true) });

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
      cardCount: state?.handCounts?.[uid] ?? state?.handsByUid[uid]?.length ?? 0,
      active: state?.turnSeat === seat,
    };
  }

  function tableThemeForUid(uid?: string): string {
    if (!uid || uid === myUid) return economyState.profile.equipped.tableTheme;
    return opponentProfiles[uid]?.tableTheme || "tt_default";
  }

  async function handlePlayCard(card: Card) {
    if (!match || !isMyTurn) return;
    await sendMatchMove(matchId, match.revision, { type: "play", card });
  }

  const trophyMultiplier = match?.pool === "weekend" ? 2 : 1;
  const stakes = match?.pool === "casual" ? 0 : trophyMultiplier;

  async function handleForfeit() {
    if (!match) return;
    try { await sendMatchMove(matchId, match.revision, { type: "forfeit" }); }
    catch (error) { showToast(t("toast_forfeitFailed"), "error"); throw error; }
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
        trophiesAfter={playerStats?.trophies ?? null}
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

  return <MindiTable hand={myHand} legal={legalForMe} viewer={mySeat} top={topSeat} left={leftSeat} right={rightSeat}
    name={user?.displayName ?? "You"} avatar={playerStats?.avatarPreset} active={isMyTurn && (introSeen || !openingActive)}
    trump={state.trumpSuit} trick={state.trick} lastTrick={state.lastTrick} tens={state.tensCaptured} tricks={state.tricksWon}
    mode={match.pool === "casual" ? "Casual Online" : match.pool === "weekend" ? "Weekend League" : "Ranked"}
    tableSkin={activeTableTheme} tenCaptures={state.tenCaptures ?? []} online opening={opening}
    onPlay={handlePlayCard} onLeave={handleForfeit}/>;
}
