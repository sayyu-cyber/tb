"use client";

import { Eye, Crown, Sparkles } from "lucide-react";
import type { CosmeticItem } from "@/types/economy";
import { RARITY_COLORS } from "@/data/cosmetics";
import { Pill, CoinGem, CardBackArt, TableSwatch } from "@/components/arena";
import { categoryLabel } from "./categoryLabel";

/**
 * A shop item — the Shop board's `.item`
 * (design/arena/screens/app/app-11-shop.jpg).
 *
 * The card takes its glow from the item's rarity through two custom
 * properties, exactly as the board does: `--rc` is the border colour on
 * hover, `--rg` the bloom behind the art. Both come from RARITY_COLORS, so
 * a rarity is the same colour here, in the dialog and on a rarity label.
 */

/** The rarity bloom: the rarity colour at the board's own opacity. */
const GLOW_ALPHA: Record<string, string> = {
  Common: "40", Rare: "59", Epic: "4D", Legendary: "59",
};

export function ShopItemCard({
  item,
  price,
  isOwned,
  isEquipped,
  isFeatured,
  onPurchase,
  onEquip,
  onPreview,
  initial = "S",
}: {
  item: CosmeticItem;
  price: number;
  isOwned: boolean;
  isEquipped: boolean;
  isFeatured?: boolean;
  onPurchase: () => void;
  onEquip: () => void;
  onPreview: () => void;
  initial?: string;
}) {
  const colour = RARITY_COLORS[item.rarity];
  const glow = `${colour}${GLOW_ALPHA[item.rarity] ?? "40"}`;
  // Emotes and stickers are played rather than worn, so owning one is the
  // end state - there is nothing to equip.
  const wearable = item.category !== "emote" && item.category !== "sticker";

  return (
    <article className="item" style={{ ["--rc" as string]: colour, ["--rg" as string]: glow }}>
      <div className="art">
        {isFeatured && <Pill tone="lime" className="feat">Featured</Pill>}
        <button type="button" className="ibtn eye" aria-label={`Preview ${item.name}`} onClick={onPreview}>
          <Eye aria-hidden="true" />
        </button>
        <ShopArt item={item} initial={initial} />
      </div>
      <div className="info">
        <span className={`rar ${item.rarity.toLowerCase()}`}>
          {item.rarity} · {categoryLabel(item.category)}
        </span>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        {isOwned ? (
          wearable && !isEquipped ? (
            <button type="button" className="buy eq" onClick={onEquip} data-flat>
              Equip<span className="sr-only"> {item.name}</span>
            </button>
          ) : (
            <span className="buy eq" aria-disabled="true">{isEquipped ? "Equipped" : "Owned"}</span>
          )
        ) : (
          <button type="button" className="buy" onClick={onPurchase} data-flat>
            <CoinGem small />
            {price.toLocaleString()}
            <span className="sr-only"> coins — buy {item.name}</span>
          </button>
        )}
      </div>
    </article>
  );
}

/**
 * The art for each category, drawn the way the Shop board draws it:
 * a tilted card back, a table swatch, the framed initial, a speech bubble
 * for an emote, a firework burst for a victory animation, and a tilted
 * sticker. Nothing here is an image file - `/public/cosmetics/*` does not
 * exist (APP_SCREENS.md, "Card-back art").
 */
export function ShopArt({ item, initial }: { item: CosmeticItem; initial: string }) {
  if (item.category === "cardBack") {
    return <CardBackArt id={item.id} width={101} style={{ transform: "rotate(-6deg)" }} />;
  }
  if (item.category === "tableTheme") {
    return <TableSwatch id={item.id} width={150} height={96} />;
  }
  if (item.category === "profileFrame") {
    return <span className="frame" aria-hidden="true">{initial}</span>;
  }
  if (item.category === "emote") {
    return <span className="bubble" aria-hidden="true"><Sparkles /></span>;
  }
  if (item.category === "victoryAnimation") {
    // Twelve spokes at 30-degree steps, as the board draws them.
    return (
      <span className="fw" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <i key={index} style={{ transform: `rotate(${index * 30}deg)` }} />
        ))}
      </span>
    );
  }
  if (item.category === "sticker") {
    return (
      <span className="sticker" aria-hidden="true">
        <Crown style={{ width: "34px", height: "34px" }} />
        <b>{item.name}</b>
      </span>
    );
  }
  // Banners: the board has no banner in its featured week, so this uses
  // the Loadout strip's banner block at the art's size.
  return (
    <span
      aria-hidden="true"
      style={{
        width: "170px",
        height: "84px",
        borderRadius: "14px",
        background: "linear-gradient(120deg,#0E1E3A,#16305A 60%,#0B1428)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,.2)",
      }}
    />
  );
}
