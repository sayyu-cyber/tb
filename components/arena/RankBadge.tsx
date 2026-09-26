/**
 * Rank, in the two shapes the boards use.
 *
 *   <RankLabel>  `.rank` - a small hexagon next to the tier's name, for
 *                inline use beside a player's name.
 *   <RankHex>    `.rk`   - the hexagon on its own at any size, with a crown
 *                inside it, for the rank card and the profile header.
 *
 * The four tiers are the app's own (constants/ranks.ts): Bronze, Silver,
 * Gold, Platinum. The board's class for Platinum is `.plat`, so the tier
 * name is mapped rather than lower-cased, or Platinum would silently fall
 * through to the unstyled default.
 *
 * components/ui/RankBadge.tsx is the previous design's badge and is still
 * used by screens that haven't moved yet; this is the Arena one.
 */
import type { ReactNode } from "react";

export type RankTier = "Bronze" | "Silver" | "Gold" | "Platinum";

const TIER_CLASS: Record<string, string> = {
  Bronze: "bronze",
  Silver: "silver",
  Gold: "gold",
  Platinum: "plat",
};

/** Falls back to bronze for an unknown tier rather than rendering unstyled. */
function tierClass(tier: string) {
  return TIER_CLASS[tier] ?? "bronze";
}

export function RankLabel({
  tier,
  children,
  className = "",
}: {
  tier: string;
  /** Replaces the tier name, for lines like "Silver · 31" that carry the
   *  trophy count too. The hexagon still takes its colour from `tier`. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span className={`rank ${tierClass(tier)} ${className}`.trim()}>
      <i aria-hidden="true" />
      {children ?? tier}
    </span>
  );
}

export function RankHex({
  tier,
  width = 44,
  height = 50,
  children,
  className = "",
  label,
}: {
  tier: string;
  width?: number;
  height?: number;
  /** Usually a crown icon. Defaults to the board's crown. */
  children?: ReactNode;
  className?: string;
  /** Screen-reader text when the hexagon stands alone with no tier name. */
  label?: string;
}) {
  return (
    <span
      className={`rk ${tierClass(tier)} ${className}`.trim()}
      style={{ width, height }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {children ?? <CrownGlyph size={Math.round(width * 0.42)} />}
    </span>
  );
}

/** The board's crown, inline so nothing depends on a sprite sheet being mounted. */
export function CrownGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 11H5L3 7ZM5 21h14"
      />
    </svg>
  );
}
