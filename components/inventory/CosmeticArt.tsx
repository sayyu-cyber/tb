"use client";

import { Sparkles, Smile, Sticker } from "lucide-react";
import type { CosmeticItem } from "@/types/economy";
import { CardBackArt, TableSwatch } from "@/components/arena";

/**
 * A cosmetic drawn the Arena way.
 *
 * The Inventory board illustrates two categories: card backs (`.cb`) and
 * tables (`.tt`), with the Loadout strip also showing a frame as a ringed
 * avatar, a banner as a gradient block and a victory animation as the
 * Sparkles icon. Those are the board's own drawings and are reused here for
 * every category, so a frame looks the same in its grid tile as in the
 * loadout slot.
 *
 * Emotes and stickers have no art on any board. They fall back to the
 * category's Lucide icon, which is what the board does for Victory - the
 * same treatment, not an invented one.
 */

/** Frame colours come from the item id, so a frame is the same everywhere. */
const FRAME_RING: Record<string, string> = {
  pf_default: "rgba(255,255,255,.7)",
  pf_gold: "#E0B52E",
  pf_silver: "#B9C2C9",
  pf_crown: "#FFC940",
  pf_dragon: "#50C878",
  pf_vip: "#C6FF33",
  pf_platinum: "#E5E4E2",
  pf_master: "#00BCC8",
  pf_animated_gold: "#FFE58A",
};

/** Banner gradients, from the banner's own name on the board. */
const BANNER_ART: Record<string, string> = {
  bn_default: "linear-gradient(120deg,#0E1E3A,#16305A 60%,#0B1428)",
  bn_maldives_wave: "linear-gradient(120deg,#00727A,#4FE3EC 55%,#00323A)",
  bn_sunset: "linear-gradient(120deg,#FF8A5B,#FFC940 55%,#7A2E1B)",
  bn_royal: "linear-gradient(120deg,#0B2629,#00BCC8 55%,#05161A)",
  bn_champion: "linear-gradient(120deg,#3A2A08,#FFC940 55%,#1A1206)",
  bn_vip_gold: "linear-gradient(120deg,#9A7512,#FFE58A 55%,#3A2A08)",
};

export function CosmeticArt({
  item,
  size = "grid",
  initial = "S",
}: {
  item: CosmeticItem;
  /**
   * "grid" is the wide tile, "slot" the larger loadout size, "phone" the
   * board's three-column tile - MInventory draws a card back there at
   * `font-size: 9px`, which is 65px wide, and every other category is
   * scaled to sit in the same 92px band.
   */
  size?: "grid" | "slot" | "phone";
  /** The player's initial, for the frame preview. */
  initial?: string;
}) {
  const big = size === "slot";
  const small = size === "phone";

  if (item.category === "cardBack") {
    return <CardBackArt id={item.id} width={small ? 65 : big ? 65 : 79} />;
  }

  if (item.category === "tableTheme") {
    return <TableSwatch id={item.id} width={small ? 88 : big ? 124 : 100} />;
  }

  if (item.category === "profileFrame") {
    const ring = FRAME_RING[item.id] ?? "rgba(255,255,255,.7)";
    const box = small ? 50 : big ? 70 : 58;
    return (
      <span
        className="ava"
        aria-hidden="true"
        style={{
          width: box,
          height: box,
          borderRadius: Math.round(box * 0.26),
          fontSize: Math.round(box * 0.43),
          boxShadow: `0 0 0 4px #0B0B0F, 0 0 0 6px ${ring}`,
        }}
      >
        {initial}
      </span>
    );
  }

  if (item.category === "banner") {
    return (
      <span
        aria-hidden="true"
        style={{
          width: small ? 92 : big ? 150 : 108,
          height: small ? 41 : big ? 64 : 48,
          borderRadius: "12px",
          background: BANNER_ART[item.id] ?? BANNER_ART.bn_default,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,.2)",
        }}
      />
    );
  }

  const Icon = item.category === "emote" ? Smile : item.category === "sticker" ? Sticker : Sparkles;
  const iconBox = small ? 30 : big ? 44 : 34;
  return <Icon aria-hidden="true" style={{ width: iconBox, height: iconBox, color: "#C6FF33" }} />;
}
