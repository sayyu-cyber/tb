"use client";
import { GinRummyTable } from "./GinRummyTable";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { updateMatchResult } from "@/lib/trophyUpdates";
import { watchMatch, updateMatchState, MatchDoc } from "@/lib/matchmaking";
import {
  Card,
  cardId,
  bestMeldArrangement,
  findGinLayout,
  replenishStock,
  randomDiscard,
  scoreGin,
  TURN_SECONDS,
} from "@/lib/ginRummyEngine";
import { GinResultScreen } from "./GinResultScreen";
import { MindiDealIntro } from "./MindiDealIntro";
import type { CutCard } from "@/lib/openingCut";
import type { FirstPlayerDraw, SeatIndex } from "@/lib/mindiEngine";
import { useTranslation } from "@/hooks/useTranslation";
import { sortHand } from "@/lib/cardSort";
import { useToast } from "@/contexts/ToastContext";
import { useOpponentProfiles } from "@/hooks/useOpponentProfiles";

export interface GinOnlineState {
  hands: Record<string, Card[]>;
  stock: Card[];
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
  const { processMatchEnd, state: economyState } = useEconomy();
  const router = useRouter();
  const myUid = user?.uid ?? "";

  const [match, setMatch] = useState<MatchDoc<GinOnlineState> | null>(null);
  const [matchLoadError, setMatchLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedDiscard, setSelectedDiscard] = useState<Card | null>(null);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [rewardsApplied, setRewardsApplied] = useState(false);
  const [introSeen, setIntroSeen] = useState(false);
  const t = useTranslation();
  const { showToast } = useToast();

  useEffect(() => {
    setMatchLoadError(false);
    setMatch(null);
    const unsub = watchMatch<GinOnlineState>(matchId, next => {
      setMatch(next);
      if (!next) setMatchLoadError(true);
    }, () => setMatchLoadError(true));
    return unsub;
  }, [matchId, retryKey]);

  const opponentUid = useMemo(() => match?.players.find((p) => p !== myUid) ?? "", [match, myUid]);
  const opponentProfiles = useOpponentProfiles(opponentUid ? [opponentUid] : []);
  const opponentProfile = opponentProfiles[opponentUid];
  const state = match?.state;
  const myHand = useMemo(() => state?.hands[myUid] ?? [], [state, myUid]);
  const isMyTurn = state?.turn === myUid;
  const topDiscard = state && state.discard.length > 0 ? state.discard[state.discard.length - 1] : null;

  const sortedHand = useMemo(() => sortHand(myHand), [myHand]);

  useEffect(()=>{
    if (!isMyTurn || state?.phase!=="discard") setSelectedDiscard(null);
  },[isMyTurn,state?.phase]);

  async function handleDraw(source: "stock" | "discard") {
    if (!state || !isMyTurn || state.phase !== "draw") return;
    await updateMatchState<GinOnlineState>(matchId, (current) => {
      const s = current.state;
      if (current.status!=="active" || s.result || s.turn !== myUid || s.phase !== "draw" || !current.players.includes(myUid)) return null;
      const hand = [...s.hands[myUid]];
      let stock = [...s.stock];
      let discard = [...s.discard];
      let reshuffles = s.reshuffles ?? 0;
      if (source === "discard") {
        if (discard.length === 0) return null;
        hand.push(discard.pop()!);
      } else {
        // No knocking means a hand ends only when somebody melds 4+3+3, so an
        // empty stock is refilled from the discard pile rather than ending it.
        if (stock.length === 0) {
          const refilled = replenishStock(stock, discard);
          if (refilled.stock.length === 0) return null;
          stock = [...refilled.stock]; discard = [...refilled.discard]; reshuffles += 1;
        }
        hand.push(stock.pop()!);
      }
      return { state: { ...s, hands: { ...s.hands, [myUid]: hand }, stock, discard, reshuffles, phase: "discard" } };
    });
  }

  function handleSelectDiscard(card: Card) {
    if (!state || state.phase !== "discard" || !isMyTurn) return;
    setSelectedDiscard((prev) => (prev && cardId(prev) === cardId(card) ? null : card));
  }

  /**
   * Applies a discard. Going out is detected here rather than through a
   * separate action: with no knocking, the discard IS the move that wins.
   */
  async function discardCardTo(discardCard: Card) {
    if (!opponentUid) return;
    await updateMatchState<GinOnlineState>(matchId, (current) => {
      const s = current.state;
      if (current.status!=="active" || s.result || s.turn !== myUid || s.phase !== "discard" || !s.hands[myUid]?.some(card=>cardId(card)===cardId(discardCard))) return null;
      const hand = s.hands[myUid].filter((c) => cardId(c) !== cardId(discardCard));
      const base = { ...s, hands: { ...s.hands, [myUid]: hand }, discard: [...s.discard, discardCard] };

      const layout = findGinLayout(hand);
      if (layout) {
        const scored = scoreGin("player", layout, s.hands[opponentUid] ?? []);
        return {
          status: "completed",
          state: { ...base, turnDeadline: null,
            result: { winnerUid: myUid, layout, loserDeadwood: scored.loserDeadwood, score: scored.score } },
        };
      }
      // The deadline is written with the handover so both clients read one
      // clock from the document rather than each starting their own.
      return { state: { ...base, phase: "draw", turn: opponentUid, turnDeadline: Date.now() + TURN_SECONDS * 1000 } };
    });
    setSelectedDiscard(null);
  }

  async function handleConfirmDiscard() {
    if (!selectedDiscard) return;
    await discardCardTo(selectedDiscard);
  }

  /**
   * Plays out the rest of the turn when the clock expires.
   *
   * Guarded on `isMyTurn` so only the player who is actually on the clock
   * writes - the opponent watches the same deadline pass and does nothing.
   * Without that, both clients would race to auto-play the same turn.
   */
  // The first turn has no deadline yet: it is written once the player on the
  // clock has actually finished watching the ceremony, so they do not lose
  // most of their turn to the cut and the deal. Only that player writes it,
  // so there is no race.
  const ceremonyOver = introSeen || !state?.firstCut;
  useEffect(() => {
    if (!state || !ceremonyOver || !isMyTurn || state.result || state.turnDeadline) return;
    void updateMatchState<GinOnlineState>(matchId, (current) => {
      const s = current.state;
      if (current.status !== "active" || s.result || s.turn !== myUid || s.turnDeadline) return null;
      return { state: { ...s, turnDeadline: Date.now() + TURN_SECONDS * 1000 } };
    }).catch(() => {/* the opponent's clock will still run; not worth a toast */});
  }, [state, ceremonyOver, isMyTurn, matchId, myUid]);

  useEffect(() => {
    if (!state || !ceremonyOver || !isMyTurn || state.result || !state.turnDeadline) return;
    const timer = setTimeout(async () => {
      await updateMatchState<GinOnlineState>(matchId, (current) => {
        const s = current.state;
        if (current.status !== "active" || s.result || s.turn !== myUid) return null;
        // Re-checked inside the update: the turn may have been played
        // normally in the moments before this fired.
        if ((s.turnDeadline ?? 0) > Date.now()) return null;
        let hand = [...(s.hands[myUid] ?? [])];
        let stock = [...s.stock], discard = [...s.discard], reshuffles = s.reshuffles ?? 0;
        if (s.phase === "draw") {
          if (stock.length === 0) {
            const refilled = replenishStock(stock, discard);
            if (refilled.stock.length === 0) return null;
            stock = [...refilled.stock]; discard = [...refilled.discard]; reshuffles += 1;
          }
          hand = [...hand, stock.pop()!];
        }
        const thrown = randomDiscard(hand);
        const kept = hand.filter(card => cardId(card) !== cardId(thrown));
        const base = { ...s, hands: { ...s.hands, [myUid]: kept }, stock, discard: [...discard, thrown], reshuffles };
        const layout = findGinLayout(kept);
        if (layout) {
          const scored = scoreGin("player", layout, s.hands[opponentUid] ?? []);
          return { status: "completed", state: { ...base, turnDeadline: null,
            result: { winnerUid: myUid, layout, loserDeadwood: scored.loserDeadwood, score: scored.score } } };
        }
        return { state: { ...base, phase: "draw", turn: opponentUid, turnDeadline: Date.now() + TURN_SECONDS * 1000 } };
      }).catch(() => {/* a lost race just means the turn was played normally */});
    }, Math.max(0, state.turnDeadline - Date.now()));
    return () => clearTimeout(timer);
  }, [state, ceremonyOver, isMyTurn, matchId, myUid, opponentUid]);

  /**
   * Rewards are applied as soon as the match ends rather than when a button
   * is pressed, because the result screen now shows what was earned. Guarded
   * by `rewardsApplied` so a re-render cannot pay out twice.
   */
  useEffect(() => {
    if (!state?.result || rewardsApplied) return;
    setRewardsApplied(true);
    const isVictory = state.result.winnerUid === myUid;
    processMatchEnd(isVictory, "gin_rummy");
    // Casual is a no-stakes queue (see CasualOnlineClient) - skip the real
    // trophy/rank update, same treatment as Mindi's casual pool.
    if (match?.pool !== "casual") {
      const trophyMultiplier = match?.pool === "weekend" ? 2 : 1;
      // See MindiOnlineClient - a swallowed failure here reads to the
      // player as "I won and got nothing".
      void updateMatchResult(myUid, isVictory, "gin-rummy", trophyMultiplier).catch(() => {
        showToast(t("toast_trophiesFailed"), "error");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.result, rewardsApplied, myUid, match?.pool]);

  async function handleForfeit() {
    if (!match || !opponentUid) return;
    await updateMatchState<GinOnlineState>(matchId, (current) => {
      const s = current.state;
      if (s.result) return null; // match already ended some other way
      return {
        status: "completed",
        state: {
          ...s,
          turnDeadline: null,
          result: {
            winnerUid: opponentUid,
            // A forfeit has no winning layout; the result screen shows the
            // forfeit line instead of melds.
            layout: [],
            loserDeadwood: bestMeldArrangement(s.hands[myUid] ?? []).deadwoodValue,
            score: 0,
            forfeitedBy: myUid,
          },
        },
      };
    }).catch((error) => {
      showToast(t("toast_forfeitFailed"), "error");
      throw error;
    });

    // We're leaving, so we won't be around to click "Rewards" ourselves -
    // take the loss on our own account right now instead.
    processMatchEnd(false, "gin_rummy");
    if (match.pool !== "casual") {
      const trophyMultiplier = match.pool === "weekend" ? 2 : 1;
      await updateMatchResult(myUid, false, "gin-rummy", trophyMultiplier).catch(() => {
        showToast(t("toast_trophiesFailed"), "error");
      });
    }
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
      balance={economyState.economy.coins} onContinue={() => router.push("/play")} continueLabel="Find a new match" />;
  }


  const opponentSeat = {
    uid: opponentUid,
    name: opponentProfile?.displayName ?? t("gin_opponent"),
    avatarPreset: opponentProfile?.avatarPreset,
    cardBackId: opponentProfile?.cardBack,
    cardCount: state.hands[opponentUid]?.length ?? 0,
    active: !isMyTurn,
  };
  const activeTableTheme =
    match.players[0] === myUid ? economyState.profile.equipped.tableTheme : opponentProfile?.tableTheme || "tt_default";

  // Only at the very start: reload mid-match and you rejoin straight into
  // play rather than re-watching the cut. Seat 0 is always the local player,
  // so the ceremony reads the same way for both of them.
  const showIntro = !introSeen && !!state.firstCut && state.discard.length <= 1
    && (state.hands[myUid]?.length ?? 0) === 10;
  const cut = state.firstCut;
  const cutDraw = cut && {
    cards: { 0: cut.cards[myUid], 1: cut.cards[opponentUid] },
    winner: (cut.winner === myUid ? 0 : 1) as SeatIndex,
  };

  // The ceremony replaces the table rather than sitting on top of it. Rendered
  // together, the table paints first and the dialog only opens on the effect
  // after it, so the player sees the table flash before the cut.
  if (showIntro && cutDraw) {
    return <MindiDealIntro game="gin" draw={cutDraw as FirstPlayerDraw}
      names={{ 0: user?.displayName ?? "You", 1: opponentSeat.name, 2: "", 3: "" }}
      seats={[0, 1]} viewer={0} handSize={10}
      cardBacks={{ 0: economyState.profile.equipped.cardBack, 1: opponentProfile?.cardBack }}
      tableSkin={activeTableTheme} onDone={() => setIntroSeen(true)} />;
  }

  return <GinRummyTable hand={sortedHand} selected={selectedDiscard} opponent={opponentSeat}
    name={user?.displayName ?? "You"} avatar={playerStats?.avatarPreset} stock={state.stock.length} discard={topDiscard}
    phase={state.phase} myTurn={isMyTurn} mode={match.pool === "casual" ? "Casual Online" : match.pool === "weekend" ? "Weekend League" : "Ranked"}
    deadline={state.turnDeadline ?? null} reshuffles={state.reshuffles ?? 0}
    tableSkin={activeTableTheme} cardBack={economyState.profile.equipped.cardBack} online
    onDraw={handleDraw} onSelect={handleSelectDiscard} onDiscard={handleConfirmDiscard} onLeave={handleForfeit}/>;
}
