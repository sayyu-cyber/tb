"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { ALL_COSMETICS } from "@/data/cosmetics";
import type { CosmeticCategory } from "@/types/economy";
import type { TileAction } from "./InventoryPieces";

/**
 * What the Inventory screen shows, worked out once for both compositions -
 * the wide screen (app/inventory/page.tsx) and LInventory on a phone
 * (components/inventory/land/LandInventory.tsx) - so the two can never
 * disagree about what you own.
 *
 * Every count is derived from ALL_COSMETICS rather than written down: the
 * "15 / 56 collected" header, the per-category chips and the meter all count
 * the real catalogue, so adding a cosmetic updates them and nothing can
 * drift (see code issue 4 in design/arena/APP_SCREENS.md).
 */

export type Cosmetic = (typeof ALL_COSMETICS)[number];

/** The seven categories, in the board's order. */
export const CATEGORIES: { id: CosmeticCategory; labelKey: string; collection: string }[] = [
  { id: "cardBack", labelKey: "inv_cardBacks", collection: "cardBacks" },
  { id: "tableTheme", labelKey: "inv_tables", collection: "tableThemes" },
  { id: "profileFrame", labelKey: "inv_frames", collection: "profileFrames" },
  { id: "emote", labelKey: "inv_emotes", collection: "emotes" },
  { id: "victoryAnimation", labelKey: "inv_victory", collection: "victoryAnimations" },
  { id: "sticker", labelKey: "inv_stickers", collection: "stickers" },
  { id: "banner", labelKey: "inv_banners", collection: "banners" },
];

/** The five slots the loadout shows, in the board's order. */
export const SLOTS: { key: string; label: string }[] = [
  { key: "cardBack", label: "Card Back" },
  { key: "tableTheme", label: "Table" },
  { key: "profileFrame", label: "Frame" },
  { key: "victoryAnimation", label: "Victory" },
  { key: "banner", label: "Banner" },
];

export function useInventory({ category, query }: { category: CosmeticCategory; query: string }) {
  const { user } = useAuth();
  const { state, equipCosmetic, purchaseCosmetic } = useEconomy();
  const t = useTranslation();

  const collection = state.profile.collection as unknown as Record<string, string[]>;
  const equipped = state.profile.equipped as unknown as Record<string, string>;
  const vip = Boolean(state.profile.vip?.active);
  const coins = state.economy.coins;
  const initial = (user?.displayName ?? "P").charAt(0).toUpperCase();

  // Totals come from the catalogue, never from a written-down number.
  const totals = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const item of ALL_COSMETICS) byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + 1);
    return byCategory;
  }, []);

  const owned = useMemo(() => {
    const ids = new Set<string>();
    for (const { collection: key } of CATEGORIES) for (const id of collection[key] ?? []) ids.add(id);
    return ids;
  }, [collection]);

  const collected = ALL_COSMETICS.filter((item) => owned.has(item.id)).length;
  const catalogue = ALL_COSMETICS.length;

  const chips = CATEGORIES.map(({ id, labelKey, collection: key }) => ({
    id,
    label: t(labelKey),
    owned: (collection[key] ?? []).filter((cosmeticId) =>
      ALL_COSMETICS.some((item) => item.id === cosmeticId && item.category === id)
    ).length,
    total: totals.get(id) ?? 0,
  }));

  const needle = query.trim().toLowerCase();
  const items = ALL_COSMETICS
    .filter((item) => item.category === category && (!needle || item.name.toLowerCase().includes(needle)))
    // Owned first, then by price, so what you have leads and what is
    // cheapest to get comes next - the board's own order. A VIP-only item
    // has no coin price (0), and both boards put it last, not first.
    .sort((a, b) => Number(owned.has(b.id)) - Number(owned.has(a.id))
      || Number(!!a.isVipExclusive) - Number(!!b.isVipExclusive)
      || a.price - b.price);

  // Emotes and stickers are played in-match rather than worn, so they have
  // no equipped slot; owning one is the whole state.
  const wearable = category !== "emote" && category !== "sticker";

  function actionFor(item: Cosmetic): TileAction {
    const isOwned = owned.has(item.id);
    if (isOwned && wearable && equipped[item.category] === item.id) return { kind: "equipped" };
    if (isOwned) return { kind: "equip", onEquip: () => equipCosmetic(item.category, item.id) };
    if (item.isVipExclusive && !vip) return { kind: "vip" };
    return {
      kind: "buy",
      price: item.price,
      affordable: coins >= item.price,
      onBuy: () => purchaseCosmetic(item.id),
    };
  }

  const slots = SLOTS.map(({ key, label }) => ({
    key, label, item: ALL_COSMETICS.find((item) => item.id === equipped[key]),
  }));

  const readyCards = (state.profile.roomCards ?? []).filter((card) => !card.activated).length;

  return { t, equipped, initial, owned, collected, catalogue, chips, items, actionFor, slots, readyCards };
}
