"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SPRING_SOFT } from "@/lib/motion";

/**
 * A playing card.
 *
 * Cards were previously a rounded rectangle with a rank letter stacked
 * above a suit character, both in the same colour — which meant the single
 * most important object in a card game read as a generic UI chip. This
 * gives them real card anatomy: 5:7 proportions, corner indices (rank over
 * suit, as on a real deck), a large centre pip, true red/black suit
 * colouring, and a patterned back for face-down cards.
 *
 * Rendering is plain divs rather than SVG so the cards inherit theme
 * tokens and Tailwind sizing like everything else.
 */

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

const SUIT_GLYPH: Record<Suit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

/** Hearts and diamonds are red; clubs and spades are black. Real deck rules. */
export function isRedSuit(suit: Suit): boolean {
  return suit === "hearts" || suit === "diamonds";
}

/**
 * Both rules engines model suits as single letters ("S" | "H" | "D" | "C").
 * This maps them to the names above so call sites can pass a card straight
 * from the engine without restating the mapping each time.
 */
const LETTER_TO_SUIT: Record<string, Suit> = {
  S: "spades",
  H: "hearts",
  D: "diamonds",
  C: "clubs",
};

export function suitFromLetter(letter: string): Suit {
  return LETTER_TO_SUIT[letter] ?? "spades";
}

const SIZES = {
  xs: { box: "w-7 h-10 rounded-[5px]", index: "text-[7px]", pip: "text-xs", corner: "p-px" },
  sm: { box: "w-10 h-14 rounded-md", index: "text-[9px]", pip: "text-base", corner: "p-0.5" },
  md: { box: "w-12 h-[4.2rem] rounded-lg", index: "text-[11px]", pip: "text-xl", corner: "p-1" },
  lg: { box: "w-16 h-[5.6rem] rounded-xl", index: "text-sm", pip: "text-3xl", corner: "p-1.5" },
} as const;

/**
 * Card-back skins. Cosmetic card backs (data/cosmetics.ts `CARD_BACKS`) are
 * catalogue entries with a `previewImage` path, but no art actually exists
 * for them yet (no Storage bucket - see the comment on
 * constants/profileCustomization.ts). Rather than 404 an <img>, each skin
 * gets its own two-colour woven pattern defined here, so an equipped skin
 * is genuinely visible at the table without needing real artwork.
 */
export const CARD_BACK_STYLES: Record<string, { base: string; weave: string; ring: string }> = {
  cb_default: { base: "rgb(var(--deep-dark))", weave: "rgb(var(--gold)/22%)", ring: "rgb(var(--gold)/35%)" },
  cb_maldives: { base: "#0E7C86", weave: "rgb(var(--coral)/45%)", ring: "rgb(var(--coral)/45%)" },
  cb_ocean: { base: "#0B2A4A", weave: "rgb(var(--lagoon)/40%)", ring: "rgb(var(--lagoon)/45%)" },
  cb_fire: { base: "#3A0E0E", weave: "#FF6B4A55", ring: "#FF6B4A66" },
  cb_frost: { base: "#173B4D", weave: "#BFEFFF55", ring: "#BFEFFF66" },
  cb_shadow: { base: "#0A0A12", weave: "rgb(var(--orchid)/35%)", ring: "rgb(var(--orchid)/40%)" },
  cb_dragon: { base: "#0E3B2E", weave: "rgb(var(--gold)/35%)", ring: "rgb(var(--gold)/45%)" },
  cb_phoenix: { base: "#4A1206", weave: "#FFB03A55", ring: "#FFB03A66" },
  cb_vip_gold: { base: "#1A1408", weave: "rgb(var(--gold-bright)/55%)", ring: "rgb(var(--gold-bright)/60%)" },
  cb_neon: { base: "#150826", weave: "#37E6E655", ring: "#FF3AD655" },
  cb_wood: { base: "#3E2718", weave: "#C89A6655", ring: "#C89A6666" },
  cb_marble: { base: "#D9D9DC", weave: "#00000022", ring: "#00000033" },
};

const CARD_BACK_MARKS: Record<string, string> = {
  cb_default: "T",
  cb_maldives: "◇",
  cb_ocean: "≈",
  cb_fire: "◆",
  cb_frost: "✦",
  cb_shadow: "♠",
  cb_dragon: "◆",
  cb_phoenix: "✦",
  cb_vip_gold: "♛",
  cb_neon: "✦",
  cb_wood: "T",
  cb_marble: "◇",
};

export interface PlayingCardProps {
  /** Display rank: "A", "2".."10", "J", "Q", "K". */
  rank: string;
  suit: Suit;
  size?: keyof typeof SIZES;
  /** Renders the patterned back instead of the face. */
  faceDown?: boolean;
  /** Equipped card-back cosmetic id (data/cosmetics.ts `CARD_BACKS`).
   *  Falls back to the classic gold lattice when omitted or unknown. */
  cardBackId?: string;
  /** Dims and disables — for cards that aren't a legal play. */
  disabled?: boolean;
  /** Lifts the card, e.g. the currently selected discard. */
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  /** Accessible name override; defaults to "<rank> of <suit>". */
  label?: string;
  /** Shared identity (typically the card's id) for a framer-motion layout
   *  transition - give a card the same `layoutId` in your hand and in the
   *  table well it's played to, and framer-motion tweens it across the
   *  board instead of the hand instance vanishing while an unrelated
   *  element fades in at the well. */
  layoutId?: string;
}

export function PlayingCard({
  rank,
  suit,
  size = "md",
  faceDown = false,
  cardBackId,
  disabled = false,
  selected = false,
  onClick,
  className,
  label,
  layoutId,
}: PlayingCardProps) {
  const s = SIZES[size];
  const red = isRedSuit(suit);
  const glyph = SUIT_GLYPH[suit];
  const interactive = Boolean(onClick) && !disabled;

  if (faceDown) {
    const skin = CARD_BACK_STYLES[cardBackId ?? ""] ?? CARD_BACK_STYLES.cb_default;
    const mark = CARD_BACK_MARKS[cardBackId ?? ""] ?? CARD_BACK_MARKS.cb_default;
    return (
      <div
        aria-hidden="true"
        className={cn(s.box, "relative overflow-hidden border shadow-[0_5px_12px_-3px_rgba(0,0,0,0.55)]", className)}
        style={{ backgroundColor: skin.base, borderColor: skin.ring }}
      >
        {/* Woven lattice back, drawn with two crossed repeating gradients so
            it reads as a printed pattern rather than a flat fill. */}
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              `repeating-linear-gradient(45deg, ${skin.weave} 0 2px, transparent 2px 6px),` +
              `repeating-linear-gradient(-45deg, ${skin.weave} 0 2px, transparent 2px 6px)`,
          }}
        />
        {/* Glossy top-left sheen - the small thing that makes a card back
            read as a collectible object rather than a printed swatch. */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/25" />
        <div className="absolute inset-[3px] rounded-[inherit] border" style={{ borderColor: skin.ring }} />
        <div className="absolute inset-[7px] rounded-[inherit] border border-white/10" />
        <div
          className="absolute left-1/2 top-1/2 flex h-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[0.62rem] font-black leading-none shadow-[inset_0_1px_0_rgb(255_255_255/22%)]"
          style={{ color: skin.ring, backgroundColor: "rgb(0 0 0 / 18%)", border: `1px solid ${skin.ring}` }}
        >
          {mark}
        </div>
      </div>
    );
  }

  const Wrapper = onClick ? motion.button : motion.div;

  return (
    <Wrapper
      {...(onClick
        ? {
            onClick,
            type: "button" as const,
            whileHover: interactive ? { y: -8 } : undefined,
            whileTap: interactive ? { scale: 0.97 } : undefined,
            "aria-label": label ?? `${rank} of ${suit}`,
          }
        : { "aria-label": label ?? `${rank} of ${suit}`, role: "img" })}
      layout={Boolean(layoutId)}
      layoutId={layoutId}
      // "layout" governs the hand-to-well flight (and hand cards sliding
      // to close a gap) — softer and slower than the snappy hover/tap
      // feedback in "default", since a card crossing the table should
      // read as travelling, not just twitching.
      transition={{ layout: SPRING_SOFT, default: { type: "spring", stiffness: 500, damping: 30 } }}
      disabled={onClick ? disabled : undefined}
      aria-pressed={onClick ? selected : undefined}
      className={cn(
        s.box,
        "relative select-none border bg-white transition-shadow duration-200",
        // Card faces stay white in both themes — a playing card is white.
        // Selection reads as a genuine lift off the table (a soft violet
        // glow underneath, not just a coloured ring) - the tactile, premium
        // feel the hand is meant to have.
        selected
          ? "border-[rgb(var(--gold))] ring-2 ring-[rgb(var(--gold)/55%)] -translate-y-2 shadow-[0_14px_28px_-8px_rgba(139,92,246,0.55),0_0_0_1px_rgb(var(--gold)/35%)]"
          : "border-black/15 shadow-[var(--shadow-md)]",
        interactive && !disabled && !selected && "hover:shadow-[0_10px_22px_-6px_rgba(139,92,246,0.35)]",
        disabled && "opacity-40 saturate-50",
        interactive && "cursor-pointer",
        className
      )}
      style={{ color: red ? "rgb(var(--suit-red))" : "rgb(var(--suit-black))" }}
    >
      {/* Top-left index: rank over suit, as printed on a real card. */}
      <span className={cn("absolute left-0 top-0 flex flex-col items-center leading-none", s.corner)}>
        <span className={cn(s.index, "font-bold")}>{rank}</span>
        <span className={cn(s.index, "leading-none")}>{glyph}</span>
      </span>

      {/* Centre pip. */}
      <span className={cn("absolute inset-0 flex items-center justify-center font-serif leading-none", s.pip)}>
        {glyph}
      </span>

      {/* Bottom-right index, rotated — so the card is readable either way up. */}
      <span
        className={cn("absolute bottom-0 right-0 flex flex-col items-center leading-none rotate-180", s.corner)}
        aria-hidden="true"
      >
        <span className={cn(s.index, "font-bold")}>{rank}</span>
        <span className={cn(s.index, "leading-none")}>{glyph}</span>
      </span>
    </Wrapper>
  );
}

/**
 * A fanned stack of face-down cards, for showing an opponent's hand size.
 * Overlapping negative margins keep a 13-card hand compact.
 */
export function CardFan({
  count,
  size = "sm",
  cardBackId,
  className,
  hideOverflowCount = false,
}: {
  count: number;
  size?: keyof typeof SIZES;
  cardBackId?: string;
  className?: string;
  /** Suppresses the "+N" tail, for callers that already show the count
   *  elsewhere (the seat avatar's badge) and would otherwise say it twice. */
  hideOverflowCount?: boolean;
}) {
  const shown = Math.min(count, 6);
  const overlap = size === "xs" ? "-ml-4" : size === "sm" ? "-ml-6" : "-ml-8";
  return (
    <div className={cn("flex items-center", className)} aria-label={`${count} cards`}>
      {Array.from({ length: shown }).map((_, i) => (
        <div
          key={i}
          className={i === 0 ? "" : overlap}
          // Slight per-card tilt so a hand reads as held cards rather than a
          // flat stack of rectangles.
          style={{ zIndex: i, transform: `rotate(${(i - (shown - 1) / 2) * 3}deg)` }}
        >
          <PlayingCard rank="" suit="spades" size={size} faceDown cardBackId={cardBackId} />
        </div>
      ))}
      {count > shown && !hideOverflowCount && (
        <span className="ml-2 text-[10px] font-semibold tabular-nums text-[rgb(var(--c4))]">+{count - shown}</span>
      )}
    </div>
  );
}
