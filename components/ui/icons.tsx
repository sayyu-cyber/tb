"use client";

import {
  Spade,
  LayoutGrid,
  Frame,
  Smile,
  Sparkles,
  Sticker,
  Flag,
  ShoppingBag,
  Crown,
  Ticket,
  Gift,
  Flame,
  Check,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared iconography.
 *
 * The app used emoji as UI icons in 65 places (🃏 🎰 🖼️ 😊 ✨ 🪙 🎫 👑).
 * Emoji are a problem here for three reasons: they render as a different
 * artwork on every platform (so the design is not actually controllable),
 * they cannot inherit `currentColor` so they ignore the theme entirely,
 * and a screen reader announces them by their Unicode name ("slot
 * machine", "framed picture") which is nonsense in context.
 *
 * These are real vector icons: themeable, consistent, and hidden from
 * assistive tech since the adjacent label already carries the meaning.
 */

/** Cosmetic categories, keyed by the ids used in types/economy.ts. */
export const CATEGORY_ICON: Record<string, LucideIcon> = {
  all: ShoppingBag,
  cardBack: Spade,
  tableTheme: LayoutGrid,
  profileFrame: Frame,
  emote: Smile,
  victoryAnimation: Sparkles,
  sticker: Sticker,
  banner: Flag,
};

/**
 * Renders the icon for a cosmetic category.
 * Falls back to the generic shop bag for anything unmapped.
 */
export function CategoryIcon({
  category,
  size = 16,
  className,
}: {
  category: string;
  size?: number;
  className?: string;
}) {
  const Icon = CATEGORY_ICON[category] ?? ShoppingBag;
  return <Icon size={size} className={className} aria-hidden="true" />;
}

/**
 * The in-game currency mark, replacing the 🪙 emoji.
 *
 * Drawn rather than imported so it reads as a struck coin (rim + engraved
 * "T") instead of a generic circle, and so it can carry the gold gradient
 * the rest of the brand uses.
 */
export function CoinIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="coinFace" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--gold-bright))" />
          <stop offset="55%" stopColor="rgb(var(--gold))" />
          <stop offset="100%" stopColor="rgb(var(--gold-deep))" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#coinFace)" />
      {/* Inner rim, to read as a struck edge rather than a flat disc. */}
      <circle cx="12" cy="12" r="7.6" fill="none" stroke="rgb(var(--gold-deep))" strokeOpacity="0.55" strokeWidth="1" />
      {/* "T" for Thaasbai. */}
      <path
        d="M8.6 9.2h6.8M12 9.2v6"
        stroke="rgb(var(--c1))"
        strokeOpacity="0.75"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Coin amount with its mark — the pairing appears all over the economy UI. */
export function CoinAmount({
  amount,
  size = 14,
  className,
}: {
  amount: number;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 tabular-nums", className)}>
      <CoinIcon size={size} />
      {amount.toLocaleString()}
    </span>
  );
}

// Re-exported so call sites don't each reach into lucide for the same few.
export { Crown, Ticket, Gift, Flame, Check, Sparkles };
