"use client";

import { ArenaStage } from "../ArenaStage";
import { ArenaSprite, Suit, Icon } from "../ArenaSprite";
import { cardId, rankLabel, isTen, type Card, type SeatIndex, type Suit as SuitLetter, type TrickPlay } from "@/lib/mindiEngine";
import type { ArenaSeatData } from "../GameArena";
import { CountBadge, OpeningCards, OpeningSkip, PhoneOpeningCut, PhoneOpeningSteps, openingPlate, type OpeningDeal } from "../MindiDealIntro";
import { GEO_PHONE, type Spot } from "../dealGeometry";
import { useTranslation } from "@/hooks/useTranslation";
import { PhoneTableSurface } from "./PhoneTableSurface";

/**
 * The Mindi table on a phone held sideways —
 * design/arena/boards/PMindi.dc.html,
 * design/arena/screens/phone/phone-land-02-mindi.jpg.
 *
 * An 844x390 composition, not the 1440x900 one shrunk. The board recomposes
 * the same hand for a screen a third of the height: the score rack and the
 * trump badge become two 44px bars along the top, the three opponents become
 * `.who` chips pinned to the edges instead of framed seats with fanned
 * hands, your own chip and the action button take the bottom corners, and
 * the hand sits in a shallow arc across the middle. The table itself is the
 * same 3D felt at `rotateX(50deg) scale(.5)`, pushed up so the horizon sits
 * behind the top bars.
 *
 * ArenaStage scales all of it to the VISIBLE viewport, so the hand and the
 * action button are never under the browser's own bars - MOBILE.md is
 * explicit that those two must not be cropped.
 *
 * It holds no state: MindiTable owns the hand, the selection, the leave
 * confirm and the rules, and renders this instead of its own board when the
 * phone is sideways. So double-tap-to-play, the legal-card rules and the
 * leave flow are the same code on both compositions, not two copies.
 */

/**
 * Where a played card lands on the felt, by seat relative to the viewer, in
 * the table's own 1200x740 space.
 *
 * The board draws two of the four - across at (546,172) and right at
 * (712,284) - because its sample trick is mid-hand with two cards down. The
 * other two are the mirror of those about the table's centre line and one
 * step nearer, on the board's own 112px vertical step. Worth a look against
 * phone-land-02-mindi.jpg with a full trick down.
 */
const TRICK_SPOT = [
  { x: 546, y: 396, rot: 2 },    // you, nearest the bottom
  { x: 380, y: 284, rot: -6 },   // left
  { x: 546, y: 172, rot: 3 },    // across
  { x: 712, y: 284, rot: -6 },   // right
];

const SUIT_NAMES: Record<string, string> = { S: "Spades", H: "Hearts", D: "Diamonds", C: "Clubs" };

export interface PhoneMindiBoardProps {
  /** The hand in the order it is displayed, already sorted or rearranged. */
  hand: Card[];
  /** Which of those may legally be played right now. */
  legal: Set<string>;
  /** The picked card's id, or null. */
  selected: string | null;
  viewer: SeatIndex;
  top: ArenaSeatData;
  left?: ArenaSeatData | null;
  right?: ArenaSeatData | null;
  /** The viewer's own name and card count, for the bottom-left chip. */
  you: { name: string; cards: number };
  active: boolean;
  /** Trump after any renege in the current trick, or null before one. */
  trump: SuitLetter | null;
  trick: TrickPlay[];
  /** The seat taking the trick once every card is down, else null. */
  winner: SeatIndex | null;
  tens: { us: number; them: number };
  tricks: { us: number; them: number };
  /** The suits of the Tens each side holds, for the two racks. */
  tenSuits: { us: SuitLetter[]; them: SuitLetter[] };
  /**
   * The one line the board prints mid-table - the board's own "Tap the 10
   * again to play it". Short, because `.hint` is nowrap; the turn status
   * lives in the chip bottom-left instead.
   */
  hint: string;
  error?: string;
  /** The action button's words: "Play 10", "Pick a card". */
  actionLabel: string;
  tableSkin?: string;
  /** True when the picked card can actually be played. */
  canPlay: boolean;
  onActivate: (card: Card) => void;
  onPlay: () => void;
  onLeave: () => void;
  onMenu: () => void;
  /** The opening deal while it plays on this table (PCut.dc.html), else null. */
  opening?: OpeningDeal | null;
  /** Nobody has played yet: the seat that opens trick 1 reads "Leads", lime-ringed, as the deal leaves it. */
  firstTrick?: boolean;
}

export function PhoneMindiBoard(p: PhoneMindiBoardProps) {
  const t = useTranslation();
  const duel = !p.left && !p.right;
  /* PMindi's seat lines follow the trick: an opponent who has put a card
     down reads "Played", and the one who plays after whoever is on turn
     reads "Next". Seats run clockwise from the viewer - left, across,
     right - and the 1v1 variant has only the one across. */
  const seats = duel ? 2 : 4;
  const seatAt = (rel: number) => duel ? (p.viewer + 1) % 2 : (p.viewer + rel) % 4;
  const playedSeats = new Set(p.trick.map(play => play.seat as number));
  const onTurn = p.active ? p.viewer as number
    : p.left?.active ? seatAt(1) : p.top.active ? seatAt(2) : p.right?.active ? seatAt(3) : null;
  const nextSeat = onTurn === null || p.trick.length + 1 >= seats ? null : (onTurn + 1) % seats;
  const trickLine = (rel: number) => ({ played: playedSeats.has(seatAt(rel)), next: nextSeat === seatAt(rel) && !playedSeats.has(seatAt(rel)) });
  const chosen = p.hand.find((card) => cardId(card) === p.selected) ?? null;

  /**
   * The hand's arc. PMindi draws five cards 51px apart at y=285 with a 1.75x
   * offset-squared drop capped at 10 and 5 degrees a step; PCut deals
   * thirteen into centre 391, 28 apart, y 294, a .45 drop and 1.8 degrees a
   * step (its LAY.hand). A hand between the two slides from one set of
   * numbers to the other, so the fan the deal leaves is PCut's own and a hand
   * of five is still PMindi's - and a full thirteen still fits the 440px
   * between the chip and the button in the bottom corners.
   */
  const n = p.hand.length;
  const spacing = Math.min(51, n > 1 ? 336 / (n - 1) : 0);
  const k = Math.max(0, Math.min(1, (n - 5) / 8));
  const layout = p.hand.map((card, i) => {
    const offset = n === 1 ? 0 : i - (n - 1) / 2;
    return {
      card,
      i,
      x: 391 + offset * spacing,
      y: 285 + 9 * k + Math.min(offset * offset * (1.75 - 1.3 * k), 10 + 6 * k),
      r: offset * (5 - 3.2 * k),
    };
  });

  /* While the opening deal runs (PCut.dc.html) the table keeps its bars, but
     they carry the ceremony: the step and its short title top left, the cut
     top right, no hint, and a compact Skip where Play goes. */
  const opening = p.opening ?? null;
  const ceremony = !!opening && opening.step < 4;
  const plate = (spot: Spot) => opening && ceremony ? openingPlate(opening, spot, t) : null;
  const rootClass = ["ar", opening?.frozen ? "frozen" : "", opening?.reduced ? "deal-reduced" : ""].filter(Boolean).join(" ");
  const appear = opening ? "appear" : "";
  const self = plate("S");

  return (
    <ArenaStage width={844} height={390} className="arena-pmindi arena-pdeal">
      <div className={rootClass} style={{ position: "relative", width: 844, height: 390, overflow: "hidden", background: "#000" }}>
        <ArenaSprite />
        <PhoneTableSurface game="mindi" skin={p.tableSkin} />

        <div className="stage" aria-hidden="true">
          <div className="table">
            {opening && !opening.settled && <OpeningCards deal={opening} geo={GEO_PHONE} variant="phone" />}

            {p.trick.map((play) => {
              const spot = TRICK_SPOT[(play.seat - p.viewer + 4) % 4];
              const won = p.winner === play.seat;
              return (
                <div
                  key={cardId(play.card)}
                  className={`tcard ${won ? "win" : ""}`.trim()}
                  style={{ left: spot.x, top: spot.y, ["--rot" as string]: `${spot.rot}deg` }}
                >
                  <div className={`cf ${play.card.suit === "H" || play.card.suit === "D" ? "red" : ""} ${isTen(play.card) ? "ten" : ""}`.replace(/\s+/g, " ").trim()}>
                    <div className="ix"><b>{rankLabel(play.card.rank)}</b><Suit suit={play.card.suit} /></div>
                    <Suit suit={play.card.suit} className="mid" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top left: leave, then the ceremony's step - or the Tens racks and
            the trick count once the deal is done. */}
        <div style={{ position: "absolute", left: 48, top: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" className="ibtn" aria-label="Leave game" onClick={p.onLeave} data-flat>
            <Icon name="i-back" />
          </button>
          {ceremony && opening ? <PhoneOpeningSteps deal={opening} /> : (
            <div className={`bar ${appear}`.trim()} style={{ padding: "0 12px", gap: 9 }} aria-label="Tens and tricks">
              <span className="tag" style={{ color: "#fff" }}>Tens</span>
              <span className="tag" style={{ color: "#D4D4DC" }}><i className="dot" />{duel ? "You" : "Us"}</span>
              <TenRack suits={p.tenSuits.us} none={t("table_none")} />
              <span className="tag" style={{ color: "#D4D4DC" }}><i className="dot them" />{duel ? "They" : "Them"}</span>
              <TenRack suits={p.tenSuits.them} none={t("table_none")} />
              <span style={{ width: 1, height: 22, background: "rgba(255,255,255,.14)" }} />
              <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <b className="num" style={{ fontSize: 15, lineHeight: 1, color: "#C6FF33" }}>{p.tricks.us}–{p.tricks.them}</b>
                <span className="tag" style={{ fontSize: 8.5 }}>Tricks</span>
              </span>
            </div>
          )}
        </div>

        {/* Top right: the cut while the deal runs, then trump - a grey "?"
            until somebody cannot follow and sets it - and the menu. */}
        <div style={{ position: "absolute", right: 48, top: 10, display: "flex", alignItems: "center", gap: 8 }}>
          {ceremony && opening ? <PhoneOpeningCut deal={opening} /> : (
            <div className={`bar ${appear}`.trim()} style={{ padding: "0 14px 0 6px", gap: 9 }} aria-label="Trump">
              {p.trump
                ? <div className="hx"><Suit suit={p.trump} /></div>
                : <div className="hx q"><b>?</b></div>}
              <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="tag" style={{ fontSize: 8.5 }}>Trump</span>
                <span className="disp" style={{ fontSize: 15 }}>{p.trump ? SUIT_NAMES[p.trump] : t("table_notSet")}</span>
              </span>
            </div>
          )}
          <button type="button" className="ibtn" aria-label="Menu" onClick={p.onMenu} data-flat>
            <Icon name="i-menu" />
          </button>
        </div>

        {/* The three other seats. In the 1v1 room variant there is only one,
            and the board's own centre position is where it belongs. */}
        <Who seat={p.top} partner={!duel} style={{ left: 422, top: 62, transform: "translateX(-50%)" }} plate={plate("N")} ceremony={ceremony} {...trickLine(2)} firstTrick={!!p.firstTrick} leads={!!p.firstTrick && p.top.active} t={t} />
        {p.left && <Who seat={p.left} partner={false} style={{ left: 48, top: 150 }} plate={plate("W")} ceremony={ceremony} {...trickLine(1)} firstTrick={!!p.firstTrick} leads={!!p.firstTrick && p.left.active} t={t} />}
        {p.right && <Who seat={p.right} partner={false} style={{ right: 48, top: 150 }} plate={plate("E")} ceremony={ceremony} {...trickLine(3)} firstTrick={!!p.firstTrick} leads={!!p.firstTrick && p.right.active} t={t} />}

        {(!ceremony || p.error) && (
          <span key={p.error ? "error" : "hint"} className="hint" role={p.error ? "alert" : "status"}>
            {!p.error && p.active && <i className="dot live" data-ar-loop />}
            {p.error || p.hint}
          </span>
        )}

        <section aria-label="Your hand" className={opening && !ceremony ? "hand-rise" : undefined}>
          {!ceremony && layout.map(({ card, x, y, r, i }) => {
            const id = cardId(card);
            const playable = p.legal.has(id);
            const red = card.suit === "H" || card.suit === "D";
            return (
              <button
                type="button"
                key={id}
                className={`hc ${p.selected === id ? "sel" : ""} ${p.active && !playable ? "no" : ""}`.replace(/\s+/g, " ").trim()}
                style={{ left: x, top: y, transform: `rotate(${r}deg)`, ["--i" as string]: i }}
                aria-label={`${rankLabel(card.rank)} of ${SUIT_NAMES[card.suit].toLowerCase()}${p.active && !playable ? ", can't play" : ""}`}
                aria-pressed={p.selected === id}
                disabled={p.active && !playable}
                onClick={() => p.onActivate(card)}
                data-flat
              >
                <span className={`cf ${red ? "red" : ""} ${isTen(card) ? "ten" : ""}`.replace(/\s+/g, " ").trim()}>
                  <span className="ix"><b>{rankLabel(card.rank)}</b><Suit suit={card.suit} /></span>
                  <Suit suit={card.suit} className="mid" />
                </span>
              </button>
            );
          })}
        </section>

        {/* You, bottom left. The board writes the lime ring inline on the
            turn it is yours, so it is written inline here too. */}
        <div
          className={`who ${self?.first ? "first" : ""}`.trim()}
          style={{
            left: 48, bottom: 18,
            ...(!ceremony && p.active ? { borderColor: "#C6FF33", boxShadow: "0 0 0 3px rgba(198,255,51,.14), 0 0 20px rgba(198,255,51,.22)" } : null),
          }}
        >
          <div className="av">{p.you.name.slice(0, 1).toUpperCase()}
            {self ? <CountBadge count={self.count} shown={self.countShown} /> : <span className="ct">{p.you.cards}</span>}</div>
          <div>
            <b>{!ceremony && p.active ? "Your turn" : p.you.name}{self?.dealer && <span className="dtag">{t("deal_dealer")}</span>}</b>
            <span className="st">
              <i className={`dot ${!ceremony && p.active ? "live" : ""}`.trim()} {...(!ceremony && p.active ? { "data-ar-loop": true } : {})} />
              {self ? <>{self.line}{self.suit && <Suit suit={self.suit} className={self.red ? "red" : undefined} />}</>
                : p.active ? shortHint(p.trick) : "Waiting"}
            </span>
          </div>
        </div>

        <div style={{ position: "absolute", right: 48, bottom: 22 }}>
          {ceremony && opening ? <OpeningSkip deal={opening} compact /> : (
            <button type="button" className={`ar-btn ${appear}`.trim()} disabled={!p.canPlay} onClick={p.onPlay} data-flat>
              <Icon name="i-play" />
              {p.actionLabel}
              {chosen && <Suit suit={chosen.suit} />}
            </button>
          )}
        </div>
      </div>
    </ArenaStage>
  );
}

/** One side's Tens, as the board's 20x28 foil minis. */
function TenRack({ suits, none }: { suits: SuitLetter[]; none: string }) {
  if (suits.length === 0) return <span className="tag" style={{ color: "#6E6E7C" }}>{none}</span>;
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {suits.map((suit) => (
        <div key={suit} className={`mini foil ${suit === "H" || suit === "D" ? "red" : ""}`.trim()}>
          <b>10</b><Suit suit={suit} />
        </div>
      ))}
    </div>
  );
}

/** A seated player, as the board's `.who` chip - carrying the deal while it runs. */
function Who({ seat, partner, style, plate, ceremony, leads, firstTrick, played = false, next = false, t }: {
  seat: ArenaSeatData; partner: boolean; style: React.CSSProperties;
  plate: ReturnType<typeof openingPlate> | null; ceremony: boolean; leads: boolean; firstTrick: boolean;
  /** Has a card down in this trick, and plays after whoever is on turn -
   *  the board's "Played" and "Next". */
  played?: boolean; next?: boolean; t: (key: string) => string;
}) {
  const live = !ceremony && seat.active;
  return (
    <div className={`who ${plate?.first || leads ? "first" : ""}`.trim()} style={style}>
      <div className={`av ${partner ? "" : "them"}`.trim()}>
        {seat.name.slice(0, 1).toUpperCase()}
        {plate ? <CountBadge count={plate.count} shown={plate.countShown} /> : <span className="ct">{seat.cardCount}</span>}
      </div>
      <div>
        <b>{seat.name}{plate?.dealer && <span className="dtag">{t("deal_dealer")}</span>}</b>
        <span className="st">
          <i className={`dot ${partner ? "" : "them"} ${live ? "live" : ""}`.replace(/\s+/g, " ").trim()}
             {...(live ? { "data-ar-loop": true } : {})} />
          {plate ? <>{plate.line}{plate.suit && <Suit suit={plate.suit} className={plate.red ? "red" : undefined} />}</>
            : leads ? t("deal_leads") : seat.active ? "Playing" : partner ? "Partner" : played ? t("mindi_played") : next ? t("mindi_next") : firstTrick ? t("mindi_opponent") : "Waiting"}
        </span>
      </div>
    </div>
  );
}
/** "Follow spades" or "Lead any card" - what the board's chip says. */
function shortHint(trick: TrickPlay[]): string {
  if (trick.length === 0) return "Lead any card";
  return `Follow ${SUIT_NAMES[trick[0].card.suit].toLowerCase()}`;
}
