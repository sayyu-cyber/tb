"use client";

import { useEffect, useState } from "react";
import { ArenaStage } from "../ArenaStage";
import { ArenaSprite, Suit, Icon } from "../ArenaSprite";
import { cardId, rankLabel, type Card } from "@/lib/ginRummyEngine";
import type { ArenaSeatData } from "../GameArena";
import { CountBadge, OpeningCards, OpeningSkip, PhoneOpeningCut, PhoneOpeningSteps, openingPlate, type OpeningDeal, type OpeningPiles } from "../MindiDealIntro";
import { GEO_PHONE } from "../dealGeometry";
import { useTranslation } from "@/hooks/useTranslation";
import { PhoneTableSurface } from "./PhoneTableSurface";

/**
 * The Gin Rummy table on a phone held sideways —
 * design/arena/boards/PGin.dc.html,
 * design/arena/screens/phone/phone-land-03-gin.jpg and
 * phone-land-03b-gin-discard-selected.jpg.
 *
 * An 844x390 composition. The board keeps everything the desktop table has
 * and moves it: the meld reading and the deadwood become one 44px bar
 * top-left, the clock and whose turn it is become another top-right, the
 * opponent's ten backs shrink to a 24px fan under their chip, the stock and
 * discard sit on the felt in their dashed wells, and the hand runs across the
 * middle with a bracket over each meld. Your chip and the discard button take
 * the bottom corners.
 *
 * The hand is over when `outcome` is set: the board's won state
 * (phone-land-03c-gin-won). The opponent's hand turns face up in a bar
 * across the top, your melds lift with their brackets lit, and after a
 * moment the Gin card comes down over the table with the real points,
 * deadwood and coins. A hand you lost is the same card from the other side.
 *
 * It holds no state of the game. GinRummyTable owns the hand, the selection, the sort,
 * the rule book and the leave confirm, and renders this instead of its own
 * board when the phone is sideways - so tap-to-pick, tap-again-to-discard and
 * the 15-second clock are one implementation, not two.
 */

/** The five card-thicknesses the board stacks under the stock. */
const STOCK_LAYERS = [-4.4, -2.4, -0.4, 1.6, 3.6];

const SUIT_NAMES: Record<string, string> = { S: "spades", H: "hearts", D: "diamonds", C: "clubs" };

export interface PhoneGinGroup {
  /** The cards' ids, in the order they sit in the hand. */
  ids: string[];
  /** "Run 3", "Set 4", "DW 10" - the board's short forms. */
  label: string;
  deadwood: boolean;
}

export interface PhoneGinBoardProps {
  /** The hand in display order. */
  hand: Card[];
  /** Consecutive runs of that hand, one bracket each. */
  groups: PhoneGinGroup[];
  selected: Card | null;
  phase: "draw" | "discard";
  myTurn: boolean;
  name: string;
  opponent: ArenaSeatData;
  stock: number;
  discard: Card | null;
  /** Seconds left on this turn, and what the clock started from. */
  secondsLeft: number | null;
  turnSeconds: number;
  /** The meld reading top-left: "Ready · 4 · 3 · 3" or "Not out · 3 · 3". */
  reading: { title: string; big: string; ready: boolean; fresh?: boolean };
  deadwoodValue: number;
  /**
   * The one line the board prints mid-table: what picking this card would
   * leave, or whose turn it is. Short, because `.hint` is nowrap.
   */
  hint: string;
  error?: string;
  /** The action button's words: "Discard & win", "Discard 5", "Pick a card". */
  actionLabel: string;
  /** The id of the card just drawn, which the board tags "New". */
  drawnId: string | null;
  busy: boolean;
  onDraw: (source: "stock" | "discard") => void;
  onActivate: (card: Card) => void;
  onDiscard: () => void;
  onLeave: () => void;
  onMenu: () => void;
  /** True when the picked discard would go out - the board's "go" button. */
  selectedWins: boolean;
  /** The opening deal while it plays on this table (PCutGin.dc.html), else null. */
  opening?: OpeningDeal | null;
  /** Nobody has moved yet: the plates read as the deal leaves them. */
  firstTurn?: boolean;
  /** The hand is over: the board's won state, with the real numbers. */
  outcome?: PhoneGinOutcome | null;
}

/** The end of a hand, worked out by GinRummyTable from the real result. */
export interface PhoneGinOutcome {
  youWon: boolean;
  /** The winner's meld sizes, largest first: "4 · 3 · 3". */
  sizes: number[];
  /** 25 + the loser's deadwood. */
  score: number;
  goingOut: number;
  loserDeadwood: number;
  /** "Hussain's J, 10 and 2" - whose deadwood, and what it was. */
  loserCards: string;
  coins: number;
  balance: number;
  /** The opponent's hand, face up: melds, then the cards left over. */
  reveal: { cards: Card[]; dead: boolean }[];
  continueLabel: string;
  onContinue: () => void;
}

/** "4, 3 and 3", for the board's sentence. */
export function listed(parts: (string | number)[], and: string) {
  return parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} ${and} ${parts[parts.length - 1]}`;
}

/**
 * The board's two piles (a `.tc` at 438,294 and 654,294, the discard's top
 * card turned 2 degrees), so the deal's stock and upcard land on them.
 */
const PILES: OpeningPiles = {
  stock: { x: 492, y: 369.5, rz: 0, s: 1.125 },
  upcard: { x: 708, y: 369.5, rz: -2, s: 1.125 },
};

export function PhoneGinBoard(p: PhoneGinBoardProps) {
  const t = useTranslation();
  const opening = p.opening ?? null;
  const outcome = p.outcome ?? null;
  const won = !!outcome?.youWon;
  // The board turns the cards over first and brings the Gin card down 1.35s
  // later (its reveal at 750ms, the card at 2100). Under reduced motion the
  // card is simply there.
  const [banner, setBanner] = useState(false);
  useEffect(() => {
    if (!outcome) { setBanner(false); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setBanner(true); return; }
    const timer = setTimeout(() => setBanner(true), 1350);
    return () => clearTimeout(timer);
  }, [outcome]);
  const sizes = outcome ? listed(outcome.sizes, t("lgin_and")) : "";
  const ceremony = !!opening && opening.step < 4;
  const pilesShown = !opening || opening.settled;
  const selfPlate = opening && ceremony ? openingPlate(opening, "S", t) : null;
  const oppPlate = opening && ceremony ? openingPlate(opening, "N", t) : null;
  const rootClass = ["ar", opening?.frozen ? "frozen" : "", opening?.reduced ? "deal-reduced" : ""].filter(Boolean).join(" ");
  const appear = opening ? "appear" : "";
  const canDraw = p.myTurn && p.phase === "draw" && !p.busy;
  const canDiscard = p.myTurn && p.phase === "discard" && !!p.selected && !p.busy;
  const readColor = p.reading.ready ? "#C6FF33" : "#BEBECA";

  /**
   * The hand's arc, the board's own algorithm: 30px per card, 10px between
   * groups, cards 58 wide, centred on 422, with a shallow 0.55x
   * offset-squared drop and 1.3 degrees of rotation per step. Laying it out
   * from the groups rather than the cards is what makes the brackets line up
   * with the melds without measuring the DOM.
   */
  const step = 30, gap = won ? 18 : 10, cardW = 58, top = 296;
  const position = new Map<string, { x: number; k: number }>();
  const spans: { a: number; b: number; group: PhoneGinGroup }[] = [];
  let x = -step - gap;
  let k = 0;
  for (const group of p.groups) {
    x += gap;
    const a = x + step;
    for (const id of group.ids) { x += step; position.set(id, { x, k: k++ }); }
    spans.push({ a, b: x + cardW, group });
  }
  const total = x + cardW;
  const left0 = 422 - total / 2;
  const offsetOf = (index: number) => index - (k - 1) / 2;
  const yAt = (offset: number) => Math.round(top + offset * offset * 0.55);

  const clockOff = p.secondsLeft === null
    ? 0
    : 88 * (1 - Math.max(0, Math.min(1, p.secondsLeft / p.turnSeconds)));

  const backs = Math.min(Math.max(p.opponent.cardCount, 0), 10);
  const angles = backs > 1 ? Array.from({ length: backs }, (_, i) => -22.5 + (45 / (backs - 1)) * i) : [0];

  return (
    <ArenaStage width={844} height={390} className="arena-pgin arena-pdeal">
      <div className={rootClass} style={{ position: "relative", width: 844, height: 390, overflow: "hidden", background: "#000" }}>
        <ArenaSprite />
        <PhoneTableSurface game="gin" />

        <div className="stage" aria-hidden="true">
          <div className="table">
            <div className="spot" style={{ left: 430, top: 286 }} />
            <div className="spot" style={{ left: 646, top: 286 }} />
            <div className="printed" style={{ left: 392, top: 470 }}>Stock · {p.stock}</div>
            <div className="printed" style={{ left: 608, top: 470 }}>Discard</div>
            <svg className="leds" viewBox="0 0 1200 740">
              <ellipse cx="600" cy="370" rx="565" ry="335" fill="none" stroke="#C6FF33" strokeOpacity=".65" strokeWidth="7" strokeLinecap="round" strokeDasharray="3 27" className="chase" data-ar-loop />
            </svg>
            {/* The stock's thickness. Only as many layers as there are cards
                to justify them, so an almost-empty stock looks almost empty.
                While the opening deal runs its own stock and upcard stand in
                for the piles, and land exactly where these lie. */}
            {pilesShown && STOCK_LAYERS.slice(0, Math.max(0, Math.min(5, p.stock - 1))).map((z) => (
              <div key={z} className="layer" style={{ left: 438, top: 294, transform: `translateZ(${z}px)` }} />
            ))}
            {opening && !opening.settled && <OpeningCards deal={opening} geo={GEO_PHONE} variant="phone" piles={PILES} />}
          </div>
        </div>

        {/* The two piles, on top of the stage so they can be tapped. The
            board draws them as scenery; here they are how you draw. */}
        {/* pointer-events off on the layer, back on for the two piles, so
            this second 3D context places them without covering the hand. */}
        <div className="stage" style={{ pointerEvents: "none" }}>
          <div className="table">
            {pilesShown && p.stock > 0 && (
              <button
                type="button"
                className="tc"
                style={{ left: 438, top: 294, ["--z" as string]: "5.6px", ["--rot" as string]: "0deg", padding: 0, border: 0, background: "none", cursor: canDraw ? "pointer" : "default", pointerEvents: "auto" }}
                aria-label={`Draw from the stock, ${p.stock} left`}
                disabled={!canDraw}
                onClick={() => p.onDraw("stock")}
                data-flat
              >
                <div className="back"><i><Icon name="i-crown" /></i></div>
              </button>
            )}
            {pilesShown && <>
              <div className="tc" style={{ left: 654, top: 294, ["--z" as string]: "-4.2px", ["--rot" as string]: "-9deg" }}><div className="blank" /></div>
              <div className="tc" style={{ left: 654, top: 294, ["--z" as string]: "-3.6px", ["--rot" as string]: "6deg" }}><div className="blank" /></div>
            </>}
            {pilesShown && p.discard && (
              <button
                type="button"
                className="tc"
                style={{ left: 654, top: 294, ["--z" as string]: "-3px", ["--rot" as string]: "-2deg", padding: 0, border: 0, background: "none", cursor: canDraw ? "pointer" : "default", pointerEvents: "auto" }}
                aria-label={`Take the ${rankLabel(p.discard.rank)} of ${SUIT_NAMES[p.discard.suit]} from the discard pile`}
                disabled={!canDraw}
                onClick={() => p.onDraw("discard")}
                data-flat
              >
                <div className={`cf ${p.discard.suit === "H" || p.discard.suit === "D" ? "red" : ""}`.trim()}>
                  <div className="ix"><b>{rankLabel(p.discard.rank)}</b><Suit suit={p.discard.suit} /></div>
                  <Suit suit={p.discard.suit} className="mid" />
                </div>
              </button>
            )}
          </div>
        </div>

        {/* The opponent: their ten backs, and who they are. The backs wait for
            the deal - until then those cards are its pile. */}
        {outcome ? (
          <div className="reveal bar" style={{ position: "absolute", left: 422, top: 8, transform: "translateX(-50%)", height: 44, padding: "0 10px", gap: 8 }}
            aria-label={`${p.opponent.name}: ${outcome.reveal.flatMap(group => group.cards).map(card => `${rankLabel(card.rank)} of ${SUIT_NAMES[card.suit]}`).join(", ")}`}>
            <span className="tag" style={{ color: "#fff" }}>{p.opponent.name}</span>
            {(() => {
              let n = 0;
              return outcome.reveal.map((group, g) => (
                <div key={g} style={{ display: "flex", gap: 2 }}>
                  {group.cards.map(card => {
                    const red = card.suit === "H" || card.suit === "D";
                    const delay = `${(n++ * 0.05).toFixed(2)}s`;
                    return (
                      <div key={cardId(card)} className={`mini ${red ? "red" : ""} ${group.dead ? "dead" : ""}`.replace(/\s+/g, " ").trim()} style={{ animationDelay: delay }}>
                        <b>{rankLabel(card.rank)}</b><Suit suit={card.suit} />
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
        ) : (
          <div className={`ofan ${ceremony ? "off" : ""}`.trim()} aria-hidden="true">
            {angles.map((angle, i) => (
              <div key={i} className="ob" style={{ ["--a" as string]: `${angle}deg` }}>
                <div className="back"><i><Icon name="i-crown" /></i></div>
              </div>
            ))}
          </div>
        )}
        <div className={`who ${oppPlate?.first || (p.firstTurn && !ceremony && !p.myTurn) ? "first" : ""}`.trim()} style={{ left: 422, top: 62, transform: "translateX(-50%)" }}>
          <div className="av them">{p.opponent.name.slice(0, 1).toUpperCase()}
            {oppPlate ? <CountBadge count={oppPlate.count} shown={oppPlate.countShown} /> : <span className="ct">{p.opponent.cardCount}</span>}</div>
          <div>
            <b>{p.opponent.name}{oppPlate?.dealer && <span className="dtag">{t("deal_dealer")}</span>}</b>
            <span className="st">
              <i className={`dot them ${!ceremony && !p.myTurn ? "live" : ""}`.trim()} {...(!ceremony && !p.myTurn ? { "data-ar-loop": true } : {})} />
              {oppPlate ? <>{oppPlate.line}{oppPlate.suit && <Suit suit={oppPlate.suit} className={oppPlate.red ? "red" : undefined} />}</>
                : outcome ? t("lgin_deadwoodN").replace("{n}", String(won ? outcome.loserDeadwood : 0))
                : p.firstTurn ? (p.myTurn ? t("mindi_opponent") : t("deal_leads"))
                : p.myTurn ? "Waiting" : p.phase === "draw" ? "Drawing" : "Discarding"}
            </span>
          </div>
        </div>

        {/* Top left: leave, then the deal's step while it runs - or the meld
            reading and the deadwood. */}
        <div style={{ position: "absolute", left: 48, top: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" className="ibtn" aria-label="Leave game" onClick={p.onLeave} data-flat>
            <Icon name="i-back" />
          </button>
          {ceremony && opening ? <PhoneOpeningSteps deal={opening} /> : (
            <div className={`bar ${appear}`.trim()} style={{ padding: "0 12px", gap: 10 }} aria-label="Your melds">
              <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="tag" style={won ? { color: "#C6FF33" } : p.reading.fresh ? undefined : { color: readColor }}>{won ? "Gin" : p.reading.title}</span>
                <b className="disp" style={{ fontSize: 16, color: won ? "#C6FF33" : p.reading.fresh ? undefined : readColor }}>{won ? outcome.sizes.join(" · ") : p.reading.big}</b>
              </span>
              <span style={{ width: 1, height: 24, background: "rgba(255,255,255,.14)" }} />
              <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <b className="num" style={{ fontSize: 16, lineHeight: 1 }}>{won ? 0 : p.deadwoodValue}</b>
                <span className="tag" style={{ fontSize: 8 }}>Deadwood</span>
              </span>
            </div>
          )}
        </div>

        {/* Top right: the cut while the deal runs, then the clock and whose
            turn it is, and the menu. The ring is drawn only while a clock is
            actually running. */}
        <div style={{ position: "absolute", right: 48, top: 8, display: "flex", alignItems: "center", gap: 8 }}>
          {ceremony && opening ? <PhoneOpeningCut deal={opening} /> : (
            <div className={`bar ${appear}`.trim()} style={{ padding: "0 12px 0 6px", gap: 9 }} aria-label="Turn">
              {outcome ? (
                <div className="clock">
                  <svg viewBox="0 0 34 34" aria-hidden="true">
                    <circle cx="17" cy="17" r="14" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="3.5" />
                    <circle className="arc" cx="17" cy="17" r="14" fill="none" stroke="#C6FF33" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="88" strokeDashoffset={88} />
                  </svg>
                  <b>–</b>
                </div>
              ) : p.secondsLeft !== null && (
                <div className="clock">
                  <svg viewBox="0 0 34 34" aria-hidden="true">
                    <circle cx="17" cy="17" r="14" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="3.5" />
                    <circle className="arc" cx="17" cy="17" r="14" fill="none" stroke="#C6FF33" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="88" strokeDashoffset={clockOff} />
                  </svg>
                  <b>{p.secondsLeft}</b>
                </div>
              )}
              <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="tag">{outcome ? t("lgin_turnOver") : p.myTurn ? "Your turn" : p.opponent.name}</span>
                <span className="disp" style={{ fontSize: 14, whiteSpace: "nowrap" }}>
                  {outcome ? t(won ? "lgin_handWon" : "lgin_handLost") : p.busy ? "Working…" : p.myTurn ? (p.phase === "draw" ? "Draw a card" : "Discard") : (p.phase === "draw" ? "Drawing" : "Discarding")}
                </span>
              </span>
            </div>
          )}
          <button type="button" className="ibtn" aria-label="Menu" onClick={p.onMenu} data-flat>
            <Icon name="i-menu" />
          </button>
        </div>

        {(!ceremony || p.error) && (
          <span key={p.error ? "error" : "hint"} className="hint" role={p.error ? "alert" : "status"}>
            {!p.error && p.myTurn && !outcome && <i className="dot live" data-ar-loop />}
            {p.error || (outcome ? t("lgin_status").replace("{sizes}", sizes) : p.hint)}
          </span>
        )}

        <section className={`hand ${opening && !ceremony ? "hand-rise" : ""}`.trim()} aria-label="Your hand">
          {!ceremony && p.hand.map((card, index) => {
            const id = cardId(card);
            const slot = position.get(id);
            if (!slot) return null;
            const offset = offsetOf(slot.k);
            const chosen = !!p.selected && cardId(p.selected) === id;
            const red = card.suit === "H" || card.suit === "D";
            return (
              <button
                type="button"
                key={id}
                className={`hc ${chosen ? "sel" : ""} ${p.myTurn && !outcome ? "" : "wait"} ${won ? "lift" : ""}`.replace(/\s+/g, " ").trim()}
                style={{
                  ["--x" as string]: `${Math.round(left0 + slot.x)}px`,
                  ["--y" as string]: `${yAt(offset)}px`,
                  ["--r" as string]: `${(offset * 1.3).toFixed(2)}deg`,
                  ["--i" as string]: index,
                  zIndex: 10 + slot.k,
                }}
                disabled={!p.myTurn || p.phase !== "discard" || p.busy || !!outcome}
                aria-pressed={chosen}
                aria-label={`${rankLabel(card.rank)} of ${SUIT_NAMES[card.suit]}`}
                onClick={() => p.onActivate(card)}
                data-flat
              >
                {p.drawnId === id && p.myTurn && !outcome && <span className="newtag">New</span>}
                <span className={`cf ${red ? "red" : ""} ${card.rank === 10 ? "ten" : ""}`.replace(/\s+/g, " ").trim()}>
                  <span className="ix"><b>{rankLabel(card.rank)}</b><Suit suit={card.suit} /></span>
                  <Suit suit={card.suit} className="mid" />
                </span>
              </button>
            );
          })}
        </section>

        {!ceremony && spans.map(({ a, b, group }) => (
          <div
            key={group.ids.join("")}
            className={`gtag ${group.deadwood ? "dw" : ""} ${won ? "hot" : ""}`.replace(/\s+/g, " ").trim()}
            style={{ left: Math.round(left0 + a + 4), top: top - 30 - (won ? 10 : 0), width: Math.round(b - a - 8) }}
          >
            <span>{group.label}</span>
          </div>
        ))}

        {/* Your plate stays lit through a hand you won, as PGin draws it. */}
        <div className={`who ${selfPlate?.first ? "first" : !ceremony && ((p.myTurn && !outcome) || won) ? "turn" : ""}`.trim()} style={{ left: 48, bottom: 16 }}>
          <div className="av">{p.name.slice(0, 1).toUpperCase()}
            {selfPlate ? <CountBadge count={selfPlate.count} shown={selfPlate.countShown} /> : <span className="ct">{p.hand.length}</span>}</div>
          <div>
            <b>{!ceremony && p.myTurn && !p.firstTurn && !outcome ? "Your turn" : p.name}{selfPlate?.dealer && <span className="dtag">{t("deal_dealer")}</span>}</b>
            <span className="st">
              <i className={`dot ${!ceremony && ((p.myTurn && !outcome) || won) ? "live" : ""}`.trim()} {...(!ceremony && ((p.myTurn && !outcome) || won) ? { "data-ar-loop": true } : {})} />
              {selfPlate ? <>{selfPlate.line}{selfPlate.suit && <Suit suit={selfPlate.suit} className={selfPlate.red ? "red" : undefined} />}</>
                : outcome ? t(won ? "lgin_discarded" : "lgin_turnOver")
                : p.myTurn ? (p.firstTurn ? "Your turn" : p.phase === "draw" ? "Draw or take" : "Pick a discard") : "Waiting"}
            </span>
          </div>
        </div>

        <div style={{ position: "absolute", right: 48, bottom: 18 }}>
          {ceremony && opening ? <OpeningSkip deal={opening} compact /> : (
            <button
              type="button"
              className={`ar-btn ${p.selectedWins ? "go" : ""} ${appear}`.replace(/\s+/g, " ").trim()}
              style={{ width: 176 }}
              disabled={!canDiscard || !!outcome}
              onClick={p.onDiscard}
              data-flat
            >
              <Icon name="i-discard" />
              {outcome ? t(won ? "lgin_discarded" : "lgin_turnOver") : p.actionLabel}
              {!outcome && p.selected && !p.selectedWins && <Suit suit={p.selected.suit} style={{ width: 15, height: 15 }} />}
            </button>
          )}
        </div>

        {outcome && banner && <>
          <div className="veil2" />
          <section className={won ? "hud banner" : "hud b banner"} role="status">
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <h2 className="disp" style={{ margin: 0, fontSize: 66, lineHeight: 0.9 }}><span className="stamp chrome">Gin</span></h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="lbl dash" style={{ color: won ? "#C6FF33" : "#9FF2F7" }}>
                  {won ? t("lgin_youWon") : t("lgin_theyWon").replace("{name}", p.opponent.name)}
                </span>
                <p className="body" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.4 }}>{t("lgin_melds").replace("{sizes}", sizes)}</p>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, margin: "14px 0 14px" }}>
              <div className="gcell"><span className="lbl" style={{ fontSize: 9.5 }}>{t("gin_points")}</span><span className="num" style={{ fontSize: 24, lineHeight: 1 }}>{outcome.score}</span>
                <span className="muted" style={{ fontSize: 11 }}>{t("lgin_goingOut").replace("{bonus}", String(outcome.goingOut)).replace("{n}", String(outcome.loserDeadwood))}</span></div>
              <div className="gcell"><span className="lbl" style={{ fontSize: 9.5 }}>{t("gin_deadwood")}</span><span className="num" style={{ fontSize: 24, lineHeight: 1 }}>{outcome.loserDeadwood}</span>
                <span className="muted" style={{ fontSize: 11 }}>{outcome.loserCards}</span></div>
              <div className="gcell"><span className="lbl" style={{ fontSize: 9.5 }}>{t("lgin_coins")}</span><span className="num" style={{ fontSize: 24, lineHeight: 1, color: won ? "#C6FF33" : undefined }}>+{outcome.coins}</span>
                <span className="muted" style={{ fontSize: 11 }}>{t("lgin_balance").replace("{n}", outcome.balance.toLocaleString())}</span></div>
            </div>
            <button type="button" className="ar-btn" style={{ height: 44, fontSize: 13 }} onClick={outcome.onContinue} data-flat>
              <Icon name="i-replay" />{outcome.continueLabel}
            </button>
          </section>
        </>}
      </div>
    </ArenaStage>
  );
}
