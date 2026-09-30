"use client";
import { MindiTable } from "./MindiTable";
import { mindiOpening, useOpeningDeal } from "./MindiDealIntro";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";
import { BOT_NAMES } from "@/constants/ranks";
import { useEconomy } from "@/contexts/EconomyContext";
import { MindiResultScreen } from "./MindiResultScreen";
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
  dealMindiHand,
  drawForFirstPlayer,
  getLegalPlays,
  resolveTrick,
  establishTrump,
  trumpAfterTrick,
  isTen,
  checkHandOutcome,
  tensFromTrick,
  chooseBotPlay,
  HandOutcome,
  CompletedTrick,
  TenCapture,
} from "@/lib/mindiEngine";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { sortHand } from "@/lib/cardSort";
import { ArenaSeatData } from "@/components/game/GameArena";

interface MindiGameClientProps {
  /** "ai": you (seat 0) + 3 bots. "passplay": you + a local partner (seats 0 & 2) vs 2 bots. */
  mode: "ai" | "passplay";
}

// Built inside the component now so the seat names follow the language
// setting; they were module-level English constants before.
function seatLabels(t: (k: string) => string, mode: "ai" | "passplay"): string[] {
  return mode === "ai"
    ? [t("mindi_you"), t("offline_west"), t("mindi_partner"), t("offline_east")]
    : [t("offline_player1"), t("offline_westBot"), t("offline_player2Partner"), t("offline_eastBot")];
}

function pickBotNames(): string[] {
  const shuffled = [...BOT_NAMES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

const LOCAL_SEAT_DECK_SKINS: Record<SeatIndex, string> = {
  0: "cb_default",
  1: "cb_fire",
  2: "cb_neon",
  3: "cb_ocean",
};

export function MindiGameClient({ mode }: MindiGameClientProps) {
  const [round,setRound]=useState(0);
  return <MindiHand key={`${mode}-${round}`} mode={mode} onReplay={()=>setRound(value=>value+1)}/>;
}

function MindiHand({mode,onReplay}:MindiGameClientProps&{onReplay:()=>void}) {
  const { processMatchEnd, state: economyState } = useEconomy();
  const { playerStats, user } = useAuth();
  const t = useTranslation();

  const humanSeats: SeatIndex[] = useMemo(() => (mode === "ai" ? [0] : [0, 2]), [mode]);
  const isHuman = useCallback((seat: SeatIndex) => humanSeats.includes(seat), [humanSeats]);
  const seatNames = seatLabels(t, mode);
  const botNamesRef = useRef(pickBotNames());

  // The draw decides who leads, so it has to happen BEFORE the deal and be
  // fed into it - the leader is no longer simply the dealer's left.
  const [firstDraw] = useState(() => drawForFirstPlayer());
  const [deal] = useState(() => dealMindiHand(3, firstDraw.winner));
  const [introDone, setIntroDone] = useState(false);
  // The ceremony plays ON the table from its first frame; nothing moves until
  // it has dealt (introDone), so the first bot cannot play behind it.
  const botNames = botNamesRef.current;
  const openingSetup = useMemo(() => mindiOpening({
    draw: firstDraw, viewer: 0, dealer: 3, seats: [0, 1, 2, 3], handSize: 13,
    names: mode === "ai"
      ? { 0: user?.displayName ?? seatNames[0], 1: botNames[1], 2: botNames[2], 3: botNames[3] }
      : { 0: seatNames[0], 1: seatNames[1], 2: seatNames[2], 3: seatNames[3] },
    roles: { 0: t("mindi_you"), 1: t("mindi_opponent"), 2: t("mindi_partner"), 3: t("mindi_opponent") },
    cardBack: economyState.profile.equipped.cardBack,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [firstDraw, mode, user?.displayName]);
  const opening = useOpeningDeal(openingSetup, { onReady: () => setIntroDone(true) });
  const [hands, setHands] = useState(() => deal.hands);
  const [turnSeat, setTurnSeat] = useState<SeatIndex>(deal.leader);
  // Null until someone cannot follow suit. Trump is no longer dealt - the
  // first off-suit card played sets it for the rest of the hand.
  const [trumpSuit, setTrumpSuit] = useState<Suit | null>(deal.trumpSuit);
  const [trick, setTrick] = useState<TrickPlay[]>([]);
  const [tensCaptured, setTensCaptured] = useState<Record<Team, number>>({ A: 0, B: 0 });
  // Which Ten went where, for the hand-over reveal (Result board). The
  // tally above is what the rules use; this is what players want to see.
  const [tenCaptures, setTenCaptures] = useState<TenCapture[]>([]);
  const [tricksWon, setTricksWon] = useState<Record<Team, number>>({ A: 0, B: 0 });
  const [tricksPlayed, setTricksPlayed] = useState(0);
  const [outcome, setOutcome] = useState<HandOutcome | null>(null);
  const [resolvingTrick, setResolvingTrick] = useState(false);
  const rewardApplied=useRef(false);
  const [lastTrick,setLastTrick]=useState<CompletedTrick|null>(null);

  // Pass & Play: which human seat is currently allowed to see their hand.
  const [revealedSeat, setRevealedSeat] = useState<SeatIndex | null>(mode === "ai" ? 0 : null);

  const ledSuit = trick.length > 0 ? trick[0].card.suit : null;

  // The ceremony comes first in Pass & Play too, otherwise the "pass the
  // device" screen would hide the draw the players are meant to watch.
  const needsPassScreen =
    introDone && mode === "passplay" && isHuman(turnSeat) && !outcome && revealedSeat !== turnSeat;

  // Bot auto-play
  useEffect(() => {
    // Nothing moves while the draw/deal ceremony is on screen, or the first
    // bot would play its card behind the overlay.
    if (!introDone || outcome || resolvingTrick) return;
    if (isHuman(turnSeat)) return;

    const timer = setTimeout(() => {
      const hand = hands[turnSeat];
      const card = chooseBotPlay(hand, trick, trumpSuit, turnSeat);
      playCard(turnSeat, card);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 700 + Math.random() * 900);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnSeat, trick, outcome, resolvingTrick, introDone]);

  function playCard(seat: SeatIndex, card: Card) {
    if (seat!==turnSeat || resolvingTrick || outcome || trick.some(play=>play.seat===seat)) return;
    if (!getLegalPlays(hands[seat],ledSuit).some(candidate=>cardId(candidate)===cardId(card))) return;
    setHands((prev) => ({ ...prev, [seat]: prev[seat].filter((c) => cardId(c) !== cardId(card)) }));
    setTrick((prev) => [...prev, { seat, card }]);
    // An off-suit card here means this seat could not follow (getLegalPlays
    // would have forbidden it otherwise), so it sets trump for the hand.
    setTrumpSuit((prev) => establishTrump(prev, ledSuit, card));
    if (trick.length < 3) {
      const upcoming = nextSeat(seat);
      setTurnSeat(upcoming);
      if (mode === "passplay" && isHuman(upcoming)) setRevealedSeat(null);
    }
  }

  // Once all 4 seats have played, pause briefly so everyone can see the
  // trick, then resolve it.
  useEffect(() => {
    if (trick.length !== 4) return;
    setResolvingTrick(true);
    const timer = setTimeout(() => resolveCurrentTrick(trick), 1100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trick.length]);

  function resolveCurrentTrick(plays: TrickPlay[]) {
    // Derive the trick's trump from the plays rather than reading state, so
    // a trump established by the LAST card of this trick still counts within
    // it - no dependency on whether the setTrumpSuit above has flushed yet.
    const effectiveTrump = trumpAfterTrick(trumpSuit, plays);
    const winnerSeat = resolveTrick(plays, effectiveTrump);
    const winnerTeam = teamOf(winnerSeat);
    const tensInTrick = plays.filter((p) => isTen(p.card)).length;

    const newTens = { ...tensCaptured, [winnerTeam]: tensCaptured[winnerTeam] + tensInTrick };
    const newTricks = { ...tricksWon, [winnerTeam]: tricksWon[winnerTeam] + 1 };
    const newTricksPlayed = tricksPlayed + 1;
    setLastTrick({plays,winner:winnerSeat,number:newTricksPlayed});

    setTensCaptured(newTens);
    setTenCaptures((taken) => [...taken, ...tensFromTrick(plays, winnerSeat, newTricksPlayed)]);
    setTricksWon(newTricks);
    setTricksPlayed(newTricksPlayed);
    setTrick([]);
    setResolvingTrick(false);

    const result = checkHandOutcome(newTens, newTricks, newTricksPlayed);
    if (result) {
      setOutcome(result);
    } else {
      setTurnSeat(winnerSeat);
      if (mode === "passplay" && isHuman(winnerSeat)) setRevealedSeat(null);
    }
  }

  function handleCardSelect(card: Card) {
    if (outcome || resolvingTrick) return;
    if (!isHuman(turnSeat)) return;
    if (mode === "passplay" && revealedSeat !== turnSeat) return;

    const legal = getLegalPlays(hands[turnSeat], ledSuit);
    if (!legal.some((c) => cardId(c) === cardId(card))) return;

    playCard(turnSeat, card);
  }

  useEffect(() => {
    if (!outcome || rewardApplied.current) return;
    rewardApplied.current = true;
    processMatchEnd(outcome.winner === "A", "mindi");
  }, [outcome, processMatchEnd]);

  const yourHand = sortHand(hands[0] ?? []);
  const legalForYou = isHuman(turnSeat) ? getLegalPlays(hands[turnSeat], ledSuit) : [];

  if (outcome) {
    // A bot hand pays coins but no trophies - there is no ranked pool
    // behind vs-AI or Pass & Play, so the trophy panel says so rather than
    // printing a change that never happened.
    const winners = (outcome.winner === "A" ? [0, 2] : [1, 3])
      .map((seat) => (seat === 0 ? "You" : mode === "ai" ? botNamesRef.current[seat] : seatNames[seat]));
    return (
      <MindiResultScreen
        outcome={outcome}
        myTeam="A"
        tenCaptures={tenCaptures}
        numPlayers={4}
        totalTricks={13}
        modeLabel={mode === "ai" ? "Vs AI" : "Pass & Play"}
        trophyChange={0}
        trophiesAfter={null}
        coins={outcome.winner === "A" ? 10 : 2}
        balance={economyState.economy.coins}
        winnerNames={winners}
        onPlayAgain={onReplay}
      />
    );
  }


  if (needsPassScreen) {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6 text-center">
        <Smartphone size={40} className="text-[rgb(var(--gold-ink))] mb-4" />
        <h2 className="text-[rgb(var(--text-primary))] text-xl font-bold mb-2">{t("offline_passDeviceTo")}</h2>
        <p className="text-[rgb(var(--gold-ink))] text-2xl font-bold mb-6">{seatNames[turnSeat]}</p>
        <p className="text-[rgb(var(--c4))] text-xs mb-8">{t("offline_hideScreen")}</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setRevealedSeat(turnSeat)}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] font-semibold"
        >
          I&apos;m ready — show my hand
        </motion.button>
      </div>
    );
  }

  const botSeatData = (seat: SeatIndex): ArenaSeatData => ({
    uid: `bot-${seat}`,
    name: mode === "ai" ? botNamesRef.current[seat] : seatNames[seat],
    cardBackId: seat === 0 ? economyState.profile.equipped.cardBack : LOCAL_SEAT_DECK_SKINS[seat],
    cardCount: hands[seat]?.length ?? 0,
    active: turnSeat === seat && !resolvingTrick,
  });

  const selfSeat: SeatIndex = mode === "ai" ? 0 : revealedSeat ?? 0;
  const selfHand = mode === "ai" ? yourHand : sortHand(hands[selfSeat] ?? []);
  const selfCanAct = introDone && isHuman(turnSeat) && (mode === "ai" || revealedSeat === turnSeat) && !resolvingTrick;

  return <MindiTable hand={selfHand} legal={legalForYou} viewer={selfSeat}
    top={botSeatData(((selfSeat+2)%4) as SeatIndex)} left={botSeatData(((selfSeat+1)%4) as SeatIndex)} right={botSeatData(((selfSeat+3)%4) as SeatIndex)}
    name={mode === "ai" ? user?.displayName ?? "You" : seatNames[selfSeat]} avatar={playerStats?.avatarPreset}
    active={selfCanAct} trump={trumpSuit} trick={trick} lastTrick={lastTrick} tens={tensCaptured} tricks={tricksWon}
    mode={mode === "ai" ? "Casual" : "Pass & Play"} tableSkin={economyState.profile.equipped.tableTheme}
    tenCaptures={tenCaptures} opening={tricksPlayed===0&&trick.length===0?opening:null} onPlay={handleCardSelect}/>;
}
