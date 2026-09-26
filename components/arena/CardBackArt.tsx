/**
 * Card backs, drawn in CSS rather than shipped as images. `.cb` plus one of
 * the thirteen art names on the boards.
 *
 * The whole back is sized by font-size - the sheet lays it out in `em`
 * (7.2em x 10.08em), so one number scales the border, the inner frame, the
 * lattice and the crown together. That is the board's own trick, and it is
 * why this takes a `size` in pixels of *width* and converts, instead of
 * setting width and height directly.
 *
 * The crown is inlined rather than pulled from a sprite sheet, so a back
 * renders correctly anywhere - a shop tile, a dialog, a preview - without
 * the page having to mount the board's SVG symbols first.
 */
import type { CSSProperties } from "react";
import { CrownGlyph } from "./RankBadge";

/** The thirteen backs drawn in app-reference.css, in the boards' order. */
export const CARD_BACK_ART = [
  "arena",
  "gold",
  "sunset",
  "wood",
  "ocean",
  "inferno",
  "marble",
  "frost",
  "shadow",
  "neon",
  "dragon",
  "phoenix",
  "vip",
] as const;

export type CardBackArtName = (typeof CARD_BACK_ART)[number];

/**
 * data/cosmetics.ts id -> board art. Every one of the app's thirteen backs
 * has its own art, so nothing here is a stand-in.
 */
const BY_ID: Record<string, CardBackArtName> = {
  cb_arena: "arena",
  cb_default: "gold",
  cb_maldives: "sunset",
  cb_wood: "wood",
  cb_ocean: "ocean",
  cb_fire: "inferno",
  cb_marble: "marble",
  cb_frost: "frost",
  cb_shadow: "shadow",
  cb_neon: "neon",
  cb_dragon: "dragon",
  cb_phoenix: "phoenix",
  cb_vip_gold: "vip",
};

/** Falls back to the house deck for an id with no art yet. */
export function cardBackArtFor(id: string | null | undefined): CardBackArtName {
  return (id && BY_ID[id]) || "arena";
}

export type CardBackArtProps = {
  /** A board art name, or a cosmetic id from data/cosmetics.ts. */
  art?: CardBackArtName;
  id?: string | null;
  /** Width in pixels. Height follows at the card's 1:1.4 ratio. */
  width?: number;
  /** Names the back for screen readers; omit for decorative use. */
  label?: string;
  className?: string;
  style?: CSSProperties;
};

/** 7.2em wide on the boards, so 1em = width / 7.2. */
const EM_PER_WIDTH = 1 / 7.2;

export function CardBackArt({ art, id, width = 72, label, className = "", style }: CardBackArtProps) {
  const name = art ?? cardBackArtFor(id);
  return (
    <span
      className={`cb ${name} ${className}`.trim()}
      style={{ fontSize: width * EM_PER_WIDTH, ...style }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <i>
        <CrownGlyph size={24} />
      </i>
    </span>
  );
}
