/**
 * A table theme, shown as the felt oval seen from above. `.tt` plus one of
 * the nine finishes on the boards.
 *
 * Like the card backs, the rail and highlight are laid out in `em`, so
 * font-size scales the whole thing; width and height are set separately
 * because the swatch is an ellipse, not a circle (124x78 on the Inventory
 * board).
 */
import type { CSSProperties } from "react";

/** The nine finishes drawn in app-reference.css. */
export const TABLE_ART = [
  "neon",
  "midnight",
  "oak",
  "crimson",
  "sapphire",
  "palace",
  "frozen",
  "magma",
  "cosmic",
] as const;

export type TableArtName = (typeof TABLE_ART)[number];

/**
 * data/cosmetics.ts id -> board art.
 *
 * The app has ten table skins and the boards drew nine finishes: VIP Lounge
 * has no art of its own, so it borrows Golden Palace's gold-railed felt,
 * which is the closest of the nine. Worth giving it its own finish when the
 * boards next get updated.
 */
const BY_ID: Record<string, TableArtName> = {
  tt_default: "neon",
  tt_midnight: "midnight",
  tt_wooden: "oak",
  tt_red: "crimson",
  tt_blue: "sapphire",
  tt_gold: "palace",
  tt_ice: "frozen",
  tt_lava: "magma",
  tt_space: "cosmic",
  tt_vip: "palace",
};

/** Falls back to the house felt for an id with no art yet. */
export function tableArtFor(id: string | null | undefined): TableArtName {
  return (id && BY_ID[id]) || "neon";
}

export type TableSwatchProps = {
  /** A board art name, or a cosmetic id from data/cosmetics.ts. */
  art?: TableArtName;
  id?: string | null;
  width?: number;
  height?: number;
  /** Names the finish for screen readers; omit for decorative use. */
  label?: string;
  className?: string;
  style?: CSSProperties;
};

/** 124px wide carried a 12px font on the Inventory board. */
const EM_PER_WIDTH = 12 / 124;

export function TableSwatch({ art, id, width = 124, height, label, className = "", style }: TableSwatchProps) {
  const name = art ?? tableArtFor(id);
  return (
    <span
      className={`tt ${name} ${className}`.trim()}
      style={{
        fontSize: width * EM_PER_WIDTH,
        width,
        height: height ?? Math.round(width * (78 / 124)),
        ...style,
      }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
