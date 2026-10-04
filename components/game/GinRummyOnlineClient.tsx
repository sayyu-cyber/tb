"use client";
import { GinRummyTable } from "./GinRummyTable";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { watchMatch, sendMatchMove, MatchDoc } from "@/lib/matchmaking";
import { Card, cardId, rankLabel } from "@/lib/ginRummyEngine";
import { GinResultScreen } from "./GinResultScreen";
import { ginOpening, useOpeningDeal } from "./MindiDealIntro";
import type { CutCard } from "@/lib/openingCut";
import { useTranslation } from "@/hooks/useTranslation";
import { sortHand } from "@/lib/cardSort";
import { useToast } from "@/contexts/ToastContext";
import { useOpponentProfiles } from "@/hooks/useOpponentProfiles";

export interface GinOnlineState {
  hands: Record<string, Card[]>;
  stock: Card[];
  stockCount?: number;
  handCounts?: Record<string, number>;
  discard: Card[];
  turn: string;
  phase: "draw" | "discard";
  /** Epoch ms this turn expires. Shared so both clients run one clock. */
  turnDeadline?: number | null;
  /**
   * The opening cut, stored so both clients play the same ceremony and agree
   * on who starts. Keyed by uid. Absent on matches created before this
   * existed - those simply start without the ceremony.
   */
  firstCut?: { cards: Record<string, CutCard>; winner: string };
  /** How many times the discard pile has been recycled into the stock. */
  reshuffles?: number;
  result: {
    winnerUid: string;
    /** The winning 4+3+3. Empty on a forfeit, which has no layout. */
    layout: Card[][];
    loserDeadwood: number;
    score: number;
    forfeitedBy?: string;
  } | null;
}

export function GinRummyOnlineClient({ matchId }: { matchId: string }) {
  const { user, playerStats } = useAuth();
  const { state: economyState } = useEconomy();
  const router = useRouter();
  const myUid = user?.uid ?? "";

  const [match, setMatch] = useState<MatchDoc<GinOnlineState> | null>(null);
  const [matchLoadError, setMatchLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedDiscard, setSelectedDiscard] = useState<Card | null>(null);
  const [introSeen, setIntroSeen] = useState(false);
  const t = useTranslation();
  const { showToast } = useToast();

  useEffect(() => {
    setMatchLoadError(false);
    setMatch(null);
    const unsub = watchMatch<GinOnlineState>(matchId, next => {
      setMatch(next);
      setMatchLoadError(!next);
    }, () => setMatchLoadError(true));
    return unsub;
  }, [matchId, retryKey]);

  const opponentUid = useMemo(() => match?.players.find((p) => p !== myUid) ?? "", [match, myUid]);
  const opponentProfiles = useOpponentProfiles(opponentUid ? [opponentUid] : []);
  const opponentProfile = opponentProfiles[opponentUid];
  const state = match?.state;
  const myHand = useMemo(() => state?.hands[myUid] ?? [], [state, myUid]);
  const isMyTurn = state?.turn === myUid;

  // The opening deal replays the stored cut on this table from its first
  // frame. Only at the very start: reload mid-match and you rejoin straight
  // into play rather than re-watching it, and matches created before the cut
  // was stored start without it. The first player's clock waits for it.
  const openingActive = !!state?.firstCut && !state.result && state.phase === "draw"
    && state.turn === state.firstCut.winner && state.discard.length === 1 && (state.stockCount ?? state.stock.length) === 31;
  const openingSetup = useMemo(() => openingActive && state?.firstCut && opponentUid ? ginOpening({
    cut: state.firstCut, you: myUid, opponent: opponentUid,
    names: { [myUid]: user?.displayName ?? t("mindi_you"), [opponentUid]: opponentProfile?.displayName ?? t("gin_opponent") },
    roles: { [myUid]: t("mindi_you"), [opponentUid]: t("mindi_opponent") },
    upcard: state.discard[0] ? { rank: rankLabel(state.discard[0].rank), suit: state.discard[0].suit } : null,
    cardBack: economyState.profile.equipped.cardBack,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }) : null, [openingActive, state?.firstCut, myUid, opponentUid, opponentProfile?.displayName, user?.displayName]);
  const opening = useOpeningDeal(openingSetup, { onReady: () => setIntroSeen(true) });
  const topDiscard = state && state.discard.length > 0 ? state.discard[state.discard.length - 1] : null;

  const sortedHand = useMemo(() => sortHand(myHand), [myHand]);

  useEffect(()=>{
    if (!isMyTurn || state?.phase!=="discard") setSelectedDiscard(null);
  },[isMyTurn,state?.phase]);

  async function handleDraw(source: "stock" | "discard") {
    if (!match || !isMyTurn || state?.phase !== "draw") return;
    await sendMatchMove(matchId, match.revision, { type: "draw", source });
  }

  function handleSelectDiscard(card: Card) {
    if (state?.phase !== "discard" || !isMyTurn) return;
    setSelectedDiscard(prev => prev && cardId(prev) === cardId(card) ? null : card);
  }

  async function handleConfirmDiscard() {
    if (!match || !selectedDiscard) return;
    await sendMatchMove(matchId, match.revision, { type: "discard", card: selectedDiscard });
    setSelectedDiscard(null);
  }

  async function handleForfeit() {
    if (!match) return;
    try { await sendMatchMove(matchId, match.revision, { type: "forfeit" }); }
    catch (error) { showToast(t("toast_forfeitFailed"), "error"); throw error; }
  }

  if (!match || !state) {
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
          <div role="status" className="gin-load-table"><h1>Gin Rummy</h1><div className="gin-load-cards" aria-hidden="true">{[0,1,2,3,4].map(i=><span key={i}/>)}</div><p>{t("common_loadingMatch")}</p></div>
        )}
      </div>
    );
  }

  if (state.result) {
    const { result } = state;
    const youWon = result.winnerUid === myUid;
    return <GinResultScreen result={{ winner: youWon ? "player" : "opponent", layout: result.layout, loserDeadwood: result.loserDeadwood, score: result.score }}
      youWon={youWon} forfeited={!!result.forfeitedBy} coins={youWon ? 10 : 2}
      balance={economyState.economy.coins} onContinue={() => router.push("/play")} continueLabel="Find a new match"
      revealedHand={state.hands[opponentUid]} tableSkin={match.players[0]===myUid?economyState.profile.equipped.tableTheme:opponentProfile?.tableTheme}/>;
  }


  const opponentSeat = {
    uid: opponentUid,
    name: opponentProfile?.displayName ?? t("gin_opponent"),
    avatarPreset: opponentProfile?.avatarPreset,
    cardBackId: opponentProfile?.cardBack,
    cardCount: state.handCounts?.[opponentUid] ?? state.hands[opponentUid]?.length ?? 0,
    active: !isMyTurn,
  };
  const activeTableTheme =
    match.players[0] === myUid ? economyState.profile.equipped.tableTheme : opponentProfile?.tableTheme || "tt_default";

  return <GinRummyTable hand={sortedHand} selected={selectedDiscard} opponent={opponentSeat}
    name={user?.displayName ?? "You"} avatar={playerStats?.avatarPreset} stock={state.stockCount ?? state.stock.length} discard={topDiscard}
    phase={state.phase} myTurn={isMyTurn && (introSeen || !openingActive)} mode={match.pool === "casual" ? "Casual Online" : match.pool === "weekend" ? "Weekend League" : "Ranked"}
    deadline={state.turnDeadline ?? null} reshuffles={state.reshuffles ?? 0}
    tableSkin={activeTableTheme} cardBack={economyState.profile.equipped.cardBack} online opening={openingActive ? opening : null}
    onDraw={handleDraw} onSelect={handleSelectDiscard} onDiscard={handleConfirmDiscard} onLeave={handleForfeit}/>;
}
