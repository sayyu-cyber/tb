"use client";

import { Check, Lock, Crown } from "lucide-react";
import type { CosmeticItem, CosmeticCategory } from "@/types/economy";
import { Pill, CoinGem } from "@/components/arena";
import { CosmeticArt } from "./CosmeticArt";

/**
 * The Inventory board's own pieces, as components
 * (design/arena/screens/app/app-03-inventory.jpg).
 *
 * `.slot` is a loadout slot, `.tile` a grid item and `.tbtn` its action in
 * one of four states: eq (lime, equip), done (outlined, already equipped),
 * buy (graphite with a price), vip (amber, VIP only). Class names are the
 * board's, so these read against styles/arena-inventory.css line for line.
 */

/* ── Loadout ────────────────────────────────────────────────────────── */

export function LoadoutSlot({
  label,
  item,
  initial,
}: {
  label: string;
  item: CosmeticItem | undefined;
  initial: string;
}) {
  return (
    <div className={`slot ${item ? "on" : ""}`.trim()}>
      <span className="lbl">{label}</span>
      <div className="sart">
        {item ? <CosmeticArt item={item} size="slot" initial={initial} /> : null}
      </div>
      <b>{item?.name ?? "None"}</b>
      {item ? (
        <Pill tone="lime"><Check aria-hidden="true" />Equipped</Pill>
      ) : (
        <Pill tone="dim">Empty</Pill>
      )}
    </div>
  );
}

/* ── Category chips ─────────────────────────────────────────────────── */

export function CategoryChips({
  categories,
  value,
  onChange,
}: {
  categories: { id: CosmeticCategory; label: string; owned: number; total: number }[];
  value: CosmeticCategory;
  onChange: (id: CosmeticCategory) => void;
}) {
  return (
    <div className="chips" role="group" aria-label="Cosmetic categories">
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          aria-pressed={category.id === value}
          onClick={() => onChange(category.id)}
          data-flat
        >
          {category.label}
          <span>{category.owned}/{category.total}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Grid tile ──────────────────────────────────────────────────────── */

export type TileAction =
  | { kind: "equipped" }
  | { kind: "equip"; onEquip: () => void }
  | { kind: "buy"; price: number; onBuy: () => void; affordable: boolean }
  | { kind: "vip" };

export function CosmeticTile({
  item,
  owned,
  action,
  initial,
  phone = false,
}: {
  item: CosmeticItem;
  owned: boolean;
  action: TileAction;
  initial: string;
  /** The board's three-column tile: smaller art, a shorter art band. */
  phone?: boolean;
}) {
  const equipped = action.kind === "equipped";
  return (
    <div className={`tile ${equipped ? "eq" : ""} ${owned ? "" : "lockd"}`.replace(/\s+/g, " ").trim()}>
      {!owned && (
        <span className="lk" aria-hidden="true"><Lock /></span>
      )}
      <span className="tile-art" style={{ margin: phone ? "4px 0 2px" : "6px 0 4px" }}>
        <CosmeticArt item={item} size={phone ? "phone" : "grid"} initial={initial} />
      </span>
      <b>{item.name}</b>
      <span className={`rar ${item.rarity.toLowerCase()}`}>{item.rarity}</span>
      <p>{item.description}</p>
      {action.kind === "equipped" && (
        <span className="tbtn done">Equipped</span>
      )}
      {action.kind === "equip" && (
        <button type="button" className="tbtn eq" onClick={action.onEquip} data-flat>
          Equip<span className="sr-only"> {item.name}</span>
        </button>
      )}
      {action.kind === "buy" && (
        <button
          type="button"
          className="tbtn buy"
          onClick={action.onBuy}
          disabled={!action.affordable}
          title={action.affordable ? undefined : "Not enough coins"}
          data-flat
        >
          <CoinGem small />
          {action.price.toLocaleString()}
          <span className="sr-only"> coins — buy {item.name}</span>
        </button>
      )}
      {action.kind === "vip" && (
        <span className="tbtn vip"><Crown aria-hidden="true" />VIP only</span>
      )}
    </div>
  );
}
