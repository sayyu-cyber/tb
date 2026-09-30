"use client";
/**
 * The opening deal: cut for first play, then the deal -
 * design/arena/DEAL_AND_ROOMS.md section 1, boards Cut, CutGin, PCut and
 * PCutGin (design/arena/boards/*.dc.html).
 *
 * This used to be a <dialog> over a separate three.js lounge. It is now a
 * layer on the match's OWN table: the tables (MindiTable, GinRummyTable,
 * PhoneMindiBoard, PhoneGinBoard) render from the first frame, and while the
 * ceremony runs their HUD panels, status pill, seat plates and action slot
 * carry its words. This module is that ceremony:
 *
 *   useOpeningDeal()   the clock - timeline(), phaseAt(), Skip and Escape
 *   <OpeningCards>     the `.ccl` card layer, rendered inside `.table`
 *   <OpeningSteps> / <OpeningCut> / <PhoneOpening*>   the words, in the
 *                      tables' own panels and bars
 *   openingPlate() / openingWords()                   what the plates and
 *                      the pill say at each moment
 *
 * It is presentation only. The engines settle the cut and the deal before
 * any of this runs (lib/openingCut.ts, openMindiHand, dealGinHand), online
 * clients replay the stored result, and the tables take their seats, counts,
 * hand and trick 1 from real state. The animation only shows what already
 * happened.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { rankLabel, type Rank } from "@/lib/mindiEngine";
import { cardBackArtFor } from "@/components/arena/CardBackArt";
import { useTranslation } from "@/hooks/useTranslation";
import { ArenaFace } from "./ArenaCard";
import { Icon, Suit } from "./ArenaSprite";
import { DEAL_STEP, openingPhaseAt, openingTimeline, type DealPhase, type DealTimeline } from "./mindiCutTimeline";
import { NDECK, arcAt, flat, place, type DealGeo, type Spot } from "./dealGeometry";

export type SuitLetter = "S" | "H" | "D" | "C";
export interface CutFace { rank: string; suit: SuitLetter }

export interface OpeningSeat {
  /** Where the seat is as the viewer sees it - the viewer is always S. */
  spot: Spot;
  name: string;
  you: boolean;
  /** Lime for your side, blue for the other. */
  team: "us" | "them";
  /** "You", "Partner", "Opponent" - the plate's second line before and after. */
  role: string;
  cut: CutFace;
}

export interface OpeningDealSetup {
  /** Changes whenever the stored cut does, so a new hand gets a new ceremony. */
  key: string;
  game: "mindi" | "gin";
  /** In dealing order: clockwise from the dealer's left. */
  seats: OpeningSeat[];
  dealer: Spot;
  winner: Spot;
  handSize: number;
  /** Gin's upcard, turned from the deck onto the discard spot; null in Mindi. */
  upcard: CutFace | null;
  /** The viewer's equipped card back. The whole pack wears it. */
  cardBack?: string | null;
}

/** Where a table's own Gin piles sit, so the stock and upcard land on them. */
export interface OpeningPiles {
  stock: { x: number; y: number; rz: number; s: number };
  upcard: { x: number; y: number; rz: number; s: number };
}

export interface OpeningDeal {
  setup: OpeningDealSetup;
  T: DealTimeline;
  /** The moment being drawn, on the board's own clock. */
  t: number;
  phase: DealPhase;
  /** 0 Cut, 1 Reveal, 2 First, 3 Deal, 4 the table. */
  step: 0 | 1 | 2 | 3 | 4;
  /** Animating for real: not frozen for a screenshot, not reduced motion. */
  live: boolean;
  reduced: boolean;
  frozen: boolean;
  /** Cards landed on each seat's pile so far. */
  counts: Record<Spot, number>;
  canSkip: boolean;
  skip: () => void;
  /** The deal is over and the hand is up; the card layer's exits have run. */
  settled: boolean;
}

/** How long after ready the exits (your pile lifting, the rest fading) run. */
const SETTLE = 1200;

/** Reduced motion (spec "Reduced motion"): no riffle, spread or flights, ~1.9 s. */
const REDUCED = { first: 450, deal: 900, ready: 1900 };

function reducedPhase(t: number): DealPhase {
  if (t < REDUCED.first) return "reveal";
  if (t < REDUCED.deal) return "first";
  if (t < REDUCED.ready) return "deal";
  return "ready";
}

function landed(t: number, T: DealTimeline, seats: OpeningSeat[]): Record<Spot, number> {
  const counts = { S: 0, W: 0, N: 0, E: 0 } as Record<Spot, number>;
  if (t < T.fly) return counts;
  for (let j = 0; j < T.cards; j++) {
    if (t >= T.fly + j * T.gap + T.dur) counts[seats[j % seats.length].spot]++;
  }
  return counts;
}

/**
 * The ceremony's clock. Pass null when there is nothing to show (a match
 * rejoined mid-hand, or one created before the cut was stored).
 *
 * `freezeAt` holds the clock at one moment with nothing moving - the boards'
 * `phase` prop. Only the screenshot fixtures in scripts/ pass it.
 */
export function useOpeningDeal(
  setup: OpeningDealSetup | null,
  { onReady, freezeAt = null }: { onReady?: () => void; freezeAt?: number | null } = {}
): OpeningDeal | null {
  const reduced = !!useReducedMotion();
  const key = setup?.key ?? null;
  const T = useMemo(() => setup
    ? openingTimeline({ seats: setup.seats.length, handSize: setup.handSize, gap: setup.game === "gin" ? 62 : 40, upcard: !!setup.upcard })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    : null, [key]);
  const origin = useRef<number | null>(null);
  const readyCalled = useRef(false);
  const readyCallback = useRef(onReady); readyCallback.current = onReady;
  const seatsRef = useRef(setup?.seats ?? []); seatsRef.current = setup?.seats ?? [];
  const [t, setT] = useState(0);
  const lastKey = useRef("");

  const elapsed = useCallback(() => origin.current === null ? 0 : performance.now() - origin.current, []);
  const end = reduced ? REDUCED.ready : T?.ready ?? 0;

  // Re-renders only when something on screen changes: a new moment, or a
  // card landing on a pile (the count badges). The cards in flight are CSS.
  const poll = useCallback(() => {
    if (!T || freezeAt !== null) return;
    const now = elapsed();
    const phase = reduced ? reducedPhase(now) : openingPhaseAt(now, T);
    const counts = reduced ? "" : JSON.stringify(landed(now, T, seatsRef.current));
    const settled = now >= end + SETTLE;
    const signature = `${phase}|${counts}|${settled}`;
    if (signature !== lastKey.current) { lastKey.current = signature; setT(now); }
    if (now >= end && !readyCalled.current) { readyCalled.current = true; readyCallback.current?.(); }
  }, [T, freezeAt, reduced, end, elapsed]);

  // A new cut restarts the clock from zero.
  useEffect(() => {
    if (!key || freezeAt !== null) return;
    origin.current = performance.now();
    readyCalled.current = false;
    lastKey.current = "";
    setT(0);
  }, [key, freezeAt, reduced]);

  useEffect(() => {
    if (!key || freezeAt !== null) return;
    const timer = setInterval(() => {
      poll();
      if (elapsed() >= end + SETTLE) clearInterval(timer);
    }, 45);
    return () => clearInterval(timer);
  }, [key, freezeAt, poll, elapsed, end]);

  const now = freezeAt ?? t;
  const phase: DealPhase | null = T ? (reduced && freezeAt === null ? reducedPhase(now) : openingPhaseAt(now, T)) : null;
  const step = phase ? DEAL_STEP[phase] : 0;

  /** Skip to deal: move the clock to the deal, as the old skipToDeal did. The deal itself cannot be skipped. */
  const skip = useCallback(() => {
    if (!T || freezeAt !== null) return;
    const target = reduced ? REDUCED.deal : T.deal;
    if (elapsed() >= target) return;
    origin.current = performance.now() - target;
    poll();
  }, [T, freezeAt, reduced, elapsed, poll]);

  // Escape does what Skip does, unless something else on screen - the rule
  // book, the leave confirm - is the thing Escape should close.
  useEffect(() => {
    if (!key || freezeAt !== null || step >= 3) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector("dialog[open]")) return;
      event.preventDefault();
      skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key, freezeAt, step, skip]);

  if (!setup || !T || !phase) return null;

  // Reduced motion draws the board's still frames rather than its motion:
  // the reveal, the winner in place, then every card already landed.
  const drawn = reduced && freezeAt === null
    ? { reveal: 4150, first: 5000, deal: T.ready - 1, ready: T.ready + 1600 }[phase as "reveal" | "first" | "deal" | "ready"] ?? now
    : now;
  const counts = landed(drawn, T, setup.seats);
  return {
    setup, T, t: drawn, phase, step,
    live: freezeAt === null && !reduced,
    reduced: reduced && freezeAt === null,
    frozen: freezeAt !== null,
    counts,
    canSkip: step < 3,
    skip,
    settled: freezeAt !== null ? freezeAt >= end + SETTLE : now >= end + SETTLE,
  };
}

/* ─────────────────────────────── words ─────────────────────────────── */

const RANK_WORD: Record<string, string> = { A: "card_ace", K: "card_king", Q: "card_queen", J: "card_jack" };
const SUIT_WORD: Record<SuitLetter, string> = { S: "suit_spades", H: "suit_hearts", D: "suit_diamonds", C: "suit_clubs" };

/** "Ace of hearts", "9 of clubs". */
export function cardName(t: (key: string) => string, card: CutFace): string {
  const rank = RANK_WORD[card.rank] ? t(RANK_WORD[card.rank]) : card.rank;
  return t("card_of").replace("{rank}", rank).replace("{suit}", t(SUIT_WORD[card.suit]));
}
function capital(text: string) { return text.charAt(0).toUpperCase() + text.slice(1); }

/** Seats in the order the panels list them: you first, then clockwise. */
export function seatsForDisplay(seats: OpeningSeat[]): OpeningSeat[] {
  const order: Spot[] = ["S", "W", "N", "E"];
  return [...seats].sort((a, b) => order.indexOf(a.spot) - order.indexOf(b.spot));
}

function seatAt(setup: OpeningDealSetup, spot: Spot) {
  return setup.seats.find(seat => seat.spot === spot)!;
}

/**
 * The left panel's title and rule line, the status pill, and the phone's
 * short title, at this moment - the board's W and ptitle tables.
 */
export function openingWords(deal: OpeningDeal, t: (key: string) => string) {
  const { setup, phase } = deal;
  const dealer = seatAt(setup, setup.dealer).name;
  const winner = seatAt(setup, setup.winner);
  const winCard = capital(cardName(t, winner.cut));
  const gin = setup.game === "gin";
  const winLine = winner.you
    ? t(gin ? "deal_lineYouTurn" : "deal_lineYouLead")
    : winner.team === "us" ? t("deal_lineTeamLeads") : t("deal_lineLeads").replace("{name}", winner.name);
  const dealLine = gin ? t("deal_subDealGin")
    : t("deal_subDealMindi").replace("{n}", String(setup.handSize)).replace("{dealer}", dealer);
  const firstTitle = winner.you ? t("deal_titleYouFirst") : t("deal_titleFirst").replace("{name}", winner.name);
  const cut = t("deal_titleCut"), cutSub = t("deal_subCut");
  const W: Record<DealPhase, [string, string, string]> = {
    shuffle: [t("deal_titleShuffle"), t("deal_subShuffle").replace("{dealer}", dealer), t("deal_statusShuffle").replace("{dealer}", dealer)],
    spread: [cut, cutSub, t("deal_statusSpread")],
    draw: [cut, cutSub, t("deal_statusDraw")],
    gather: [cut, cutSub, t("deal_statusDraw")],
    reveal: [t("deal_titleReveal"), t("deal_subReveal"), t("deal_statusReveal")],
    first: [firstTitle, t("deal_subFirst").replace("{card}", winCard).replace("{line}", winLine), t("deal_statusWins").replace("{card}", winCard)],
    collect: [t("deal_titleDeal"), dealLine, t("deal_statusDealing").replace("{dealer}", dealer)],
    deal: [t("deal_titleDeal"), dealLine, t("deal_statusDealing").replace("{dealer}", dealer)],
    ready: ["", "", ""],
  };
  const dealsShort = t("deal_phoneDeals").replace("{dealer}", dealer).replace("{n}", String(setup.handSize));
  const short: Record<DealPhase, string> = {
    shuffle: t("deal_phoneShuffles").replace("{dealer}", dealer),
    spread: cut, draw: cut, gather: cut,
    reveal: t("deal_phoneReveal"),
    first: firstTitle,
    collect: dealsShort, deal: dealsShort,
    ready: "",
  };
  const [title, sub, status] = W[phase];
  return { title, sub, status, short: short[phase] };
}

/** What a seat plate says while the ceremony runs (the board's `plates`). */
export function openingPlate(deal: OpeningDeal, spot: Spot, t: (key: string) => string) {
  const { setup, step } = deal;
  const seat = seatAt(setup, spot);
  const won = spot === setup.winner;
  let line = seat.role, suit: SuitLetter | null = null;
  if (step >= 1 && step < 4) {
    if (won && step >= 2) line = t("deal_firstToPlay");
    else { line = t("deal_drew").replace("{rank}", seat.cut.rank); suit = seat.cut.suit; }
  }
  return {
    line,
    suit,
    red: suit === "H" || suit === "D",
    dealer: spot === setup.dealer && step < 4,
    first: won && step >= 2 && step < 4,
    count: step >= 3 ? deal.counts[spot] : 0,
    countShown: step >= 3,
  };
}

/* ─────────────────────────── the card layer ─────────────────────────── */

/** A face-down card in the board's `.back` markup, wearing a cosmetic back.
 *  The board draws the Arena back; any other is the same element wearing that
 *  back's art (styles/arena-app.css `.cb`). */
export function CardBack({ id }: { id?: string | null }) {
  const art = cardBackArtFor(id);
  return <div className={art === "arena" ? "back" : `back cb ${art}`}><i><Icon name="i-crown" /></i></div>;
}
function Back({ art }: { art: string }) {
  return <div className={art === "arena" ? "back" : `back cb ${art}`}><i><Icon name="i-crown" /></i></div>;
}

function Face({ card, variant }: { card: CutFace; variant: "desktop" | "phone" }) {
  if (variant === "desktop") return <ArenaFace rank={card.rank} suit={card.suit} />;
  const red = card.suit === "H" || card.suit === "D";
  return <span className={`cf ${red ? "red" : "blk"}`}><span className="ix"><b>{card.rank}</b><Suit suit={card.suit} /></span><Suit suit={card.suit} className="mid" /></span>;
}

type Vars = Record<string, string>;

/**
 * The `.ccl` layer, for inside the table's `.table` element. renderVals()
 * from the board, seat for seat: the pack (26 cards stand in for it while it
 * is shuffled, spread and gathered), one cut card per seat, every dealt
 * card, and Gin's upcard.
 */
export function OpeningCards({ deal, geo, variant, piles }: { deal: OpeningDeal; geo: DealGeo; variant: "desktop" | "phone"; piles?: OpeningPiles }) {
  const { setup, T, t, phase: ph, live } = deal;
  const art = cardBackArtFor(setup.cardBack);
  const model = useMemo(() => {
    const gin = !!setup.upcard;
    const seats = setup.seats, m = seats.length, n = m * setup.handSize;
    const [ddx, ddy, drz] = geo.dealDeck[setup.dealer];
    const DD: [number, number] = [ddx, ddy];
    const D = geo.deck, SM = geo.sm, LG = geo.lg;
    const slots = m === 4 ? geo.slots.four : geo.slots.two;
    const inPlace = deal.reduced;
    const stock = piles?.stock ?? { x: geo.stock[0], y: geo.stock[1], rz: 0, s: 1 };
    const up = piles?.upcard ?? { x: geo.upcard[0], y: geo.upcard[1], rz: -4, s: 1 };

    const pack = Array.from({ length: NDECK }, (_, k) => {
      const drawnBy = slots.indexOf(k), o = k % 2 === 0 ? k / 2 : 13 + (k - 1) / 2, left = k % 2 === 1;
      let tf = flat(geo, D, 1 + k), hid = false, cls = "", dl = 0;
      const vars: Vars = {};
      if (ph === "shuffle") {
        cls = live ? "rif" : "";
        vars["--from"] = flat(geo, D, 1 + o);
        vars["--side"] = place(D[0] + (left ? -geo.riffle : geo.riffle), D[1] + 8, 17 + (left ? o - 13 : o), left ? -11 : 11, 0, left ? -18 : 18, 1, SM[0], SM[1]);
        vars["--dd"] = `${300 + k * 26}ms`;
      } else if (ph === "spread") { const a = arcAt(geo, k); tf = place(a.x, a.y, a.z, a.rz, 0, 0, 1, SM[0], SM[1]); dl = k * 7; }
      else if (ph === "draw") { const a = arcAt(geo, k); tf = place(a.x, a.y, a.z, a.rz, 0, 0, 1, SM[0], SM[1]); if (drawnBy >= 0) { hid = true; dl = drawnBy * 170; } }
      else if (ph === "gather" || ph === "reveal" || ph === "first" || ph === "collect") { tf = flat(geo, DD, 1 + k, drz); hid = drawnBy >= 0; dl = ph === "gather" ? (NDECK - 1 - k) * 9 : 0; }
      else if (ph === "deal") { tf = flat(geo, DD, 1 + k, drz); hid = !gin; }
      else { tf = gin ? place(stock.x, stock.y, 1 + k * 0.9, stock.rz, 0, 0, stock.s, SM[0], SM[1]) : flat(geo, DD, 1 + k); hid = !gin; }
      return { tf, cls: `${hid ? "hid " : ""}${cls}`.trim(), dl, vars };
    });

    const cuts = seats.map((seat, i) => {
      const sp = geo.cut[seat.spot], a = arcAt(geo, slots[i]);
      const down = place(sp[0], sp[1], 3, sp[2], 0, 180, 1, LG[0], LG[1]), upright = place(sp[0], sp[1], 3, 0, 0, 0, 1, LG[0], LG[1]);
      const mid = place(sp[0], sp[1] - 10, 64, sp[2] / 2, 0, 90, 1.04, LG[0], LG[1]);
      let tf = place(a.x, a.y, a.z + 0.5, a.rz, 0, 180, 0.8, LG[0], LG[1]), hid = true, dl = 0, cls = "", ad = 0;
      const won = seat.spot === setup.winner;
      if (ph === "draw" || ph === "gather") { tf = down; hid = false; dl = ph === "draw" ? i * 170 : 0; }
      else if (ph === "reveal") { tf = upright; hid = false; if (live) { cls = "flip"; ad = i * 150; } else if (inPlace) cls = "appear-in"; }
      else if (ph === "first") {
        hid = false;
        tf = won && !inPlace
          ? place(geo.center[0], geo.center[1], geo.winZ ?? 14, 0, -(geo.winRx ?? geo.rx), 0, geo.winS ?? 1.1, LG[0], LG[1])
          : upright;
        cls = won ? "win" : "dim";
      } else if (ph === "collect") { tf = place(DD[0], DD[1], 28 + i, drz, 0, 180, 0.8, LG[0], LG[1]); hid = false; dl = i * 70; }
      return {
        spot: seat.spot, card: seat.cut, tf, cls: `${hid ? "hid " : ""}${cls}`.trim(), dl, ad,
        vars: { "--from": down, "--mid": mid, "--to": tf } as Vars,
        standee: won && ph === "first" && geo.standee && !inPlace,
      };
    });

    const td = t - T.fly;
    const dealt = Array.from({ length: n }, (_, j) => {
      const seat = seats[j % m], r = Math.floor(j / m), P = geo.pile[seat.spot];
      const jx = (((r * 37) % 5) - 2) * 0.9, jy = (((r * 53) % 5) - 2) * 0.9, jr = (((r * 29) % 7) - 3) * 1.3;
      const from = flat(geo, DD, 1 + (gin ? NDECK : 0) + (n - j) * 0.5, drz);
      const to = place(P[0] + jx, P[1] + jy, 1 + r * 0.6, P[2] + jr, 0, 0, 1, SM[0], SM[1]);
      const mid = place((DD[0] + P[0]) / 2, (DD[1] + P[1]) / 2, 70, (drz + P[2] + jr) / 2, 0, 0, 1, SM[0], SM[1]);
      const gone = place(P[0], P[1] + (geo.goneY ?? 150), geo.goneZ ?? 150, 0, -24, 0, 1, SM[0], SM[1]);
      let tf = from, cls = "hid", ad = 0;
      if (ph === "deal") {
        if (live) { tf = to; cls = "go"; ad = j * T.gap; }
        else { const st = j * T.gap; tf = td >= st + T.dur ? to : td >= st ? mid : from; cls = ""; }
      } else if (ph === "ready") {
        tf = to;
        if (seat.you) { cls = live ? "pick" : "hid"; ad = r * 22; } else cls = "fade";
      }
      return { tf, cls, ad, vars: { "--from": from, "--mid": mid, "--to": to, "--gone": gone } as Vars };
    });

    let upcard = null;
    if (gin && setup.upcard) {
      const upFrom = place(DD[0], DD[1], NDECK + 2, drz, 0, 180, 1, SM[0], SM[1]);
      const upTo = place(up.x, up.y, 2, up.rz, 0, 0, up.s, SM[0], SM[1]);
      const upMid = place((DD[0] + up.x) / 2, (DD[1] + up.y) / 2, 80, 0, 0, 90, 1, SM[0], SM[1]);
      let tf = upFrom, cls = "hid", ad = 0;
      if (ph === "deal") {
        if (live) { tf = upTo; cls = "go"; ad = (T.up ?? 0) - T.fly; }
        else { tf = t >= (T.up ?? 0) + T.dur ? upTo : upFrom; cls = t >= (T.up ?? 0) ? "" : "hid"; }
      }
      if (ph === "ready") { tf = upTo; cls = ""; }
      upcard = { card: setup.upcard, tf, cls, ad, vars: { "--from": upFrom, "--mid": upMid, "--to": upTo } as Vars };
    }
    return { pack, cuts, dealt, upcard };
    // The layer only changes with the moment being drawn; counts ticking up
    // re-render the plates, not these 80-odd cards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup.key, ph, live, deal.reduced, ph === "deal" && !live ? t : 0, geo, piles?.stock.x, piles?.upcard.x]);

  const style = (tf: string, extra: Vars, delay?: { dl?: number; ad?: number }) => ({
    transform: tf, ...(delay?.dl ? { transitionDelay: `${delay.dl}ms` } : null), ...(delay?.ad ? { animationDelay: `${delay.ad}ms` } : null), ...extra,
  }) as React.CSSProperties;

  return (
    <div className="ccl">
      <div className={`halo ${ph === "first" && !deal.reduced ? "on" : ""}`.trim()} style={{ left: geo.center[0], top: geo.center[1] }} />
      {model.pack.map((d, k) => (
        <div key={`d${k}`} className={`cc sm ${d.cls}`.trim()} style={style(d.tf, { "--to": d.tf, ...d.vars }, { dl: d.dl })}><Back art={art} /></div>
      ))}
      {model.cuts.map(c => (
        <div key={`c${c.spot}`} className={`cc lg ${c.cls}`.trim()} style={style(c.tf, c.vars, { dl: c.dl, ad: c.ad })}>
          <div className="fr"><Face card={c.card} variant={variant} /></div>
          <Back art={art} />
          {c.standee && <span className="stand"><Icon name="i-crown" />{/* words from the table */}<StandLabel /></span>}
        </div>
      ))}
      {model.dealt.map((k, j) => (
        <div key={`k${j}`} className={`cc sm ${k.cls}`.trim()} style={style(k.tf, k.vars, { ad: k.ad })}><Back art={art} /></div>
      ))}
      {model.upcard && (
        <div className={`cc sm two ${model.upcard.cls}`.trim()} style={style(model.upcard.tf, model.upcard.vars, { ad: model.upcard.ad })}>
          <div className="fr"><Face card={model.upcard.card} variant={variant} /></div>
          <div className={art === "arena" ? "back" : `back cb ${art}`} style={{ transform: "rotateY(180deg)" }}><i><Icon name="i-crown" /></i></div>
        </div>
      )}
    </div>
  );
}

function StandLabel() {
  const t = useTranslation();
  return <>{t("deal_firstToPlay")}</>;
}

/* ──────────────────────── the words, in the chrome ──────────────────────── */

/** Desktop left panel, ceremony half: "Opening deal", the step, title, rule line and step bar. */
export function OpeningSteps({ deal, className }: { deal: OpeningDeal; className?: string }) {
  const t = useTranslation();
  const words = openingWords(deal, t);
  const labels = [t("deal_stepCut"), t("deal_stepReveal"), t("deal_stepFirst"), t("deal_stepDeal")];
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="lbl dash" style={{ color: "#fff" }}>{t("deal_openingDeal")}</span>
        <span className="lbl">{t("deal_stepOf").replace("{n}", String(Math.min(deal.step + 1, 4)))}</span>
      </div>
      <h2 className="disp ctitle">{words.title}</h2>
      <p className="csub" aria-live="polite">{words.sub}</p>
      <ol className="steps" aria-label={t("deal_openingSequence")}>
        {labels.map((label, i) => <li key={label} className={i < deal.step ? "done" : i === deal.step ? "now" : undefined}><i />{label}</li>)}
      </ol>
    </div>
  );
}

/** Desktop right panel, ceremony half: "The cut · Ace high", a row per seat. */
export function OpeningCut({ deal, className }: { deal: OpeningDeal; className?: string }) {
  const t = useTranslation();
  const { setup, step, phase } = deal;
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 4 }}>
        <span className="lbl dash" style={{ color: "#fff" }}>{t("deal_theCut")}</span><span className="lbl">{t("deal_aceHigh")}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }} aria-live="polite">
        {seatsForDisplay(setup.seats).map(seat => {
          const shown = step >= 1, won = seat.spot === setup.winner && step >= 2;
          const red = seat.cut.suit === "H" || seat.cut.suit === "D";
          const rs = !shown
            ? (step === 0 && (phase === "draw" || phase === "gather") ? t("deal_drewACard") : t("deal_waiting"))
            : won ? t("deal_firstToPlay") : capital(cardName(t, seat.cut));
          return (
            <div key={seat.spot} className={`cutrow ${won ? "win" : ""}`.trim()}>
              <span className={`av ${seat.team === "them" ? "them" : ""}`.trim()}>{seat.name.slice(0, 1).toUpperCase()}</span>
              <b>{seat.you ? t("deal_youName").replace("{name}", seat.name) : seat.name}</b>
              <span className="rs">{rs}</span>
              {shown
                ? <div className={`mini pop ${red ? "red" : ""}`.trim()} style={{ width: 26, height: 36 }}><b>{seat.cut.rank}</b><Suit suit={seat.cut.suit} /></div>
                : <div className="mini q" style={{ width: 26, height: 36 }}><b>?</b></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The desktop ghost Skip, in the action button's slot (right 36, top 806). */
export function OpeningSkip({ deal, compact = false }: { deal: OpeningDeal; compact?: boolean }) {
  const t = useTranslation();
  const label = deal.step >= 3 ? t("deal_dealing") : t(compact ? "deal_skip" : "deal_skipToDeal");
  const button = useRef<HTMLButtonElement>(null);
  // Focus starts here - it is the one thing the player can do - without the
  // focus ring the board does not draw until the keyboard is actually used.
  useEffect(() => {
    button.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
  }, []);
  return (
    <button ref={button} type="button" className={compact ? "ar-btn ghost" : "btn ar-btn ghost skipb"} disabled={!deal.canSkip} onClick={deal.skip} data-flat>
      <Icon name="i-layers" />{label}
    </button>
  );
}

/** Phone, top left: "Opening deal", four step dashes and the short title. */
export function PhoneOpeningSteps({ deal }: { deal: OpeningDeal }) {
  const t = useTranslation();
  const words = openingWords(deal, t);
  return (
    <div className="bar" style={{ padding: "0 14px 0 12px", gap: 10 }} aria-label={t("deal_stepAria").replace("{n}", String(Math.min(deal.step + 1, 4)))}>
      <span style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="tag">{t("deal_openingDeal")}</span>
          <span className="sdots" aria-hidden="true">{[0, 1, 2, 3].map(i => <i key={i} className={i < deal.step ? "done" : i === deal.step ? "now" : undefined} />)}</span>
        </span>
        <span className="disp" style={{ fontSize: 15, lineHeight: 1, whiteSpace: "nowrap" }} aria-live="polite">{words.short}</span>
      </span>
    </div>
  );
}

/** Phone, top right: the "Cut" strip, an avatar and a mini card per seat. */
export function PhoneOpeningCut({ deal }: { deal: OpeningDeal }) {
  const t = useTranslation();
  const { setup, step } = deal;
  return (
    <div className="bar" style={{ padding: "0 6px 0 12px", gap: 6 }} aria-label={t("deal_theCut")} aria-live="polite">
      <span className="tag" style={{ color: "#fff", marginRight: 2 }}>{t("deal_cut")}</span>
      {seatsForDisplay(setup.seats).map(seat => {
        const shown = step >= 1, won = seat.spot === setup.winner && step >= 2;
        const red = seat.cut.suit === "H" || seat.cut.suit === "D";
        return (
          <span key={seat.spot} className={`cchip ${won ? "win" : ""}`.trim()}>
            <span className={`av ${seat.team === "them" ? "them" : ""}`.trim()}>{seat.name.slice(0, 1).toUpperCase()}</span>
            {shown
              ? <span className={`mini pop ${red ? "red" : ""}`.trim()} aria-label={cardName(t, seat.cut)}><b>{seat.cut.rank}</b><Suit suit={seat.cut.suit} /></span>
              : <span className="mini q"><b>?</b></span>}
          </span>
        );
      })}
    </div>
  );
}

/** A plate's count badge: hidden until the deal, then a lime tick as each card lands. */
export function CountBadge({ count, shown, className = "ct" }: { count: number; shown: boolean; className?: string }) {
  return <span key={shown ? count : "off"} className={`${className}${shown ? (count > 0 ? " bump" : "") : " off"}`}>{count}</span>;
}

/* ───────────────────────────── setups ───────────────────────────── */

/**
 * A Gin Rummy hand's opening: the stored cut (ace high, lib/openingCut.ts)
 * and the upcard the deal turned over. Gin has no fixed dealer in this app,
 * so the player who lost the cut deals, as at a real table - the board's
 * own sample has Hussain dealing and Sayyu, who won the cut, starting.
 */
export function ginOpening({ cut, you, opponent, names, roles, upcard, cardBack }: {
  cut: { cards: Record<string, { rank: number; suit: SuitLetter }>; winner: string };
  you: string;
  opponent: string;
  names: Record<string, string>;
  roles: Record<string, string>;
  /** The discard pile's first card, as the engine dealt it. */
  upcard: { rank: string; suit: SuitLetter } | null;
  cardBack?: string | null;
}): OpeningDealSetup {
  const spot = (key: string): Spot => key === you ? "S" : "N";
  const dealer = cut.winner === you ? opponent : you;
  const nonDealer = dealer === you ? opponent : you;
  const face = (key: string): CutFace => ({ rank: rankLabel(cut.cards[key].rank as Rank), suit: cut.cards[key].suit });
  return {
    key: `gin:${face(you).rank}${face(you).suit}${face(opponent).rank}${face(opponent).suit}:${cut.winner === you}:${upcard?.rank}${upcard?.suit}`,
    game: "gin",
    seats: [nonDealer, dealer].map(key => ({
      spot: spot(key), name: names[key], you: key === you, team: key === you ? "us" as const : "them" as const, role: roles[key], cut: face(key),
    })),
    dealer: spot(dealer),
    winner: spot(cut.winner),
    handSize: 10,
    upcard,
    cardBack,
  };
}

const SPOT_OF: Spot[] = ["S", "W", "N", "E"];

/**
 * A Mindi hand's opening, from the engine's own results: the draw (whose
 * card is whose, and who won), which seat deals, and how many seats play.
 * `seat` numbers are engine seats; the viewer sits at the bottom.
 */
export function mindiOpening({ draw, viewer, dealer, seats, names, roles, handSize, cardBack }: {
  draw: { cards: Record<number, { rank: number; suit: SuitLetter }>; winner: number };
  viewer: number;
  dealer: number;
  /** Engine seats in play: [0,1,2,3], or [0,1] for the 1v1 room variant. */
  seats: number[];
  names: Record<number, string>;
  roles: Record<number, string>;
  handSize: number;
  cardBack?: string | null;
}): OpeningDealSetup {
  const duel = seats.length === 2;
  const spotOf = (seat: number): Spot => duel ? (seat === viewer ? "S" : "N") : SPOT_OF[(seat - viewer + 4) % 4];
  const teamOf = (seat: number) => duel ? (seat === viewer ? "us" : "them") : (seat % 2 === viewer % 2 ? "us" : "them");
  // Clockwise from the dealer's left, as dealMindiHand deals.
  const at = seats.indexOf(dealer);
  const order = seats.map((_, i) => seats[(at + 1 + i) % seats.length]);
  const cardsKey = seats.map(seat => `${draw.cards[seat].rank}${draw.cards[seat].suit}`).join("");
  return {
    key: `mindi:${cardsKey}:${draw.winner}:${viewer}:${dealer}`,
    game: "mindi",
    seats: order.map(seat => ({
      spot: spotOf(seat), name: names[seat], you: seat === viewer, team: teamOf(seat), role: roles[seat],
      cut: { rank: rankLabel(draw.cards[seat].rank as Rank), suit: draw.cards[seat].suit },
    })),
    dealer: spotOf(dealer),
    winner: spotOf(draw.winner),
    handSize,
    upcard: null,
    cardBack,
  };
}
