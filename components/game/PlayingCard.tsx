"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
  sm: { box: "w-10 h-14 rounded-md", index: "text-[9px]", pip: "text-base", corner: "p-0.5" },
  md: { box: "w-12 h-[4.2rem] rounded-lg", index: "text-[11px]", pip: "text-xl", corner: "p-1" },
  lg: { box: "w-16 h-[5.6rem] rounded-xl", index: "text-sm", pip: "text-3xl", corner: "p-1.5" },
} as const;

export interface PlayingCardProps {
  /** Display rank: "A", "2".."10", "J", "Q", "K". */
  rank: string;
  suit: Suit;
  size?: keyof typeof SIZES;
  /** Renders the patterned back instead of the face. */
  faceDown?: boolean;
  /** Dims and disables — for cards that aren't a legal play. */
  disabled?: boolean;
  /** Lifts the card, e.g. the currently selected discard. */
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  /** Accessible name override; defaults to "<rank> of <suit>". */
  label?: string;
}

export function PlayingCard({
  rank,
  suit,
  size = "md",
  faceDown = false,
  disabled = false,
  selected = false,
  onClick,
  className,
  label,
}: PlayingCardProps) {
  const s = SIZES[size];
  const red = isRedSuit(suit);
  const glyph = SUIT_GLYPH[suit];
  const interactive = Boolean(onClick) && !disabled;

  if (faceDown) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          s.box,
          "relative overflow-hidden border border-[rgb(var(--gold)/35%)] shadow-[var(--shadow-sm)]",
          "bg-[rgb(var(--deep-dark))]",
          className
        )}
      >
        {/* Woven lattice back, drawn with two crossed repeating gradients so
            it reads as a printed pattern rather than a flat fill. */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgb(var(--gold)/22%) 0 2px, transparent 2px 6px)," +
              "repeating-linear-gradient(-45deg, rgb(var(--gold)/22%) 0 2px, transparent 2px 6px)",
          }}
        />
        <div className="absolute inset-[3px] rounded-[inherit] border border-[rgb(var(--gold)/30%)]" />
      </div>
    );
  }

  const Wrapper = interactive ? motion.button : motion.div;

  return (
    <Wrapper
      {...(interactive
        ? {
            onClick,
            type: "button" as const,
            whileHover: { y: -6 },
            whileTap: { scale: 0.97 },
            "aria-label": label ?? `${rank} of ${suit}`,
          }
        : { "aria-label": label ?? `${rank} of ${suit}`, role: "img" })}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      disabled={interactive ? disabled : undefined}
      className={cn(
        s.box,
        "relative select-none border bg-white shadow-[var(--shadow-md)]",
        // Card faces stay white in both themes — a playing card is white.
        selected
          ? "border-[rgb(var(--gold))] ring-2 ring-[rgb(var(--gold)/55%)] -translate-y-2"
          : "border-black/15",
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
export function CardFan({ count, size = "sm" }: { count: number; size?: keyof typeof SIZES }) {
  const shown = Math.min(count, 6);
  return (
    <div className="flex items-center" aria-label={`${count} cards`}>
      {Array.from({ length: shown }).map((_, i) => (
        <div key={i} className={i === 0 ? "" : "-ml-6"} style={{ zIndex: i }}>
          <PlayingCard rank="" suit="spades" size={size} faceDown />
        </div>
      ))}
      {count > shown && (
        <span className="ml-2 text-[10px] font-semibold tabular-nums text-[rgb(var(--c4))]">+{count - shown}</span>
      )}
    </div>
  );
}
