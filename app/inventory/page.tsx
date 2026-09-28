"use client";

import { useMemo, useState } from "react";
import { Package, Ticket, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { ALL_COSMETICS } from "@/data/cosmetics";
import type { CosmeticCategory } from "@/types/economy";
import RoomCardManager from "@/components/roomcards/RoomCardManager";
import { Meter } from "@/components/arena";
import { LoadoutSlot, CategoryChips, CosmeticTile, type TileAction } from "@/components/inventory/InventoryPieces";
import { PhoneInventory } from "@/components/inventory/phone/PhoneInventory";

/**
 * Inventory — design/arena/screens/app/app-03-inventory.jpg, from the
 * Inventory board.
 *
 * Every count on this screen is derived from ALL_COSMETICS rather than
 * written down: the "15 / 56 collected" header, the per-category chips and
 * the meter all count the real catalogue, so adding a cosmetic updates them
 * and nothing can drift (see code issue 4 in design/arena/APP_SCREENS.md).
 */

/** The seven categories, in the board's order. */
const CATEGORIES: { id: CosmeticCategory; labelKey: string; collection: string }[] = [
  { id: "cardBack", labelKey: "inv_cardBacks", collection: "cardBacks" },
  { id: "tableTheme", labelKey: "inv_tables", collection: "tableThemes" },
  { id: "profileFrame", labelKey: "inv_frames", collection: "profileFrames" },
  { id: "emote", labelKey: "inv_emotes", collection: "emotes" },
  { id: "victoryAnimation", labelKey: "inv_victory", collection: "victoryAnimations" },
  { id: "sticker", labelKey: "inv_stickers", collection: "stickers" },
  { id: "banner", labelKey: "inv_banners", collection: "banners" },
];

/** The five slots the loadout shows, in the board's order. */
const SLOTS: { key: string; label: string }[] = [
  { key: "cardBack", label: "Card Back" },
  { key: "tableTheme", label: "Table" },
  { key: "profileFrame", label: "Frame" },
  { key: "victoryAnimation", label: "Victory" },
  { key: "banner", label: "Banner" },
];

export default function InventoryPage() {
  const { user } = useAuth();
  const { state, equipCosmetic, purchaseCosmetic } = useEconomy();
  const t = useTranslation();
  const [tab, setTab] = useState<"cosmetics" | "roomCards">("cosmetics");
  const [category, setCategory] = useState<CosmeticCategory>("cardBack");
  const [query, setQuery] = useState("");

  const collection = state.profile.collection as unknown as Record<string, string[]>;
  const equipped = state.profile.equipped as unknown as Record<string, string>;
  const vip = Boolean(state.profile.vip?.active);
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
    // cheapest to get comes next - the board's own order.
    .sort((a, b) => Number(owned.has(b.id)) - Number(owned.has(a.id)) || a.price - b.price);

  // Emotes and stickers are played in-match rather than worn, so they have
  // no equipped slot; owning one is the whole state.
  const wearable = category !== "emote" && category !== "sticker";

  function actionFor(item: (typeof ALL_COSMETICS)[number]): TileAction {
    const isOwned = owned.has(item.id);
    if (isOwned && wearable && equipped[item.category] === item.id) return { kind: "equipped" };
    if (isOwned) return { kind: "equip", onEquip: () => equipCosmetic(item.category, item.id) };
    if (item.isVipExclusive && !vip) return { kind: "vip" };
    return {
      kind: "buy",
      price: item.price,
      affordable: state.economy.coins >= item.price,
      onBuy: () => purchaseCosmetic(item.id),
    };
  }

  const readyCards = state.profile.roomCards.filter((card) => !card.activated).length;

  return (
    <>
    <div className="portrait-view">
      <PhoneInventory
        title={t("page_inventory")}
        collected={collected}
        catalogue={catalogue}
        tab={tab}
        onTab={setTab}
        cosmeticsLabel={t("inventory_cosmetics")}
        roomCardsLabel={t("inventory_roomCards")}
        readyCards={readyCards}
        slots={SLOTS.map(({ key, label }) => ({
          key, label, item: ALL_COSMETICS.find((item) => item.id === equipped[key]),
        }))}
        chips={chips}
        category={category}
        onCategory={setCategory}
        query={query}
        onQuery={setQuery}
        items={items}
        owned={owned}
        actionFor={actionFor}
        initial={initial}
      />
    </div>
    <div className="landscape-view">
    <div className="arena-inventory ar-page" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="phead">
        <div>
          <span className="lbl dash" style={{ color: "#C6FF33" }}>
            Everything you own &mdash; cosmetics and Room Cards.
          </span>
          <h1 className="disp chrome ar-h1">{t("page_inventory")}</h1>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
          <span style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <b className="num" style={{ fontSize: "34px" }}>{collected}</b>
            <span className="muted">/ {catalogue} collected</span>
          </span>
          <Meter
            value={catalogue ? collected / catalogue : 0}
            tone="blue"
            segmented
            label="Collection progress"
            valueText={`${collected} of ${catalogue} cosmetics`}
            className="inv-meter"
          />
        </div>
      </div>

      <div className="tabs" style={{ alignSelf: "flex-start" }} role="group" aria-label="Inventory sections">
        <button type="button" aria-pressed={tab === "cosmetics"} onClick={() => setTab("cosmetics")} data-flat>
          <Package aria-hidden="true" />{t("inventory_cosmetics")}
        </button>
        <button type="button" aria-pressed={tab === "roomCards"} onClick={() => setTab("roomCards")} data-flat>
          <Ticket aria-hidden="true" />{t("inventory_roomCards")}
          {readyCards > 0 && <span className="n">{readyCards}</span>}
        </button>
      </div>

      {tab === "cosmetics" ? (
        <>
          <section className="panel tick" aria-label="Loadout" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="ph"><h2>Loadout</h2><span className="lbl">One equipped item per slot</span></div>
            <div className="loadout-grid">
              {SLOTS.map(({ key, label }) => (
                <LoadoutSlot
                  key={key}
                  label={label}
                  item={ALL_COSMETICS.find((item) => item.id === equipped[key])}
                  initial={initial}
                />
              ))}
            </div>
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="inv-toolbar">
              <CategoryChips categories={chips} value={category} onChange={setCategory} />
              <label className="field inv-search">
                <Search aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search inventory"
                  aria-label="Search inventory"
                />
              </label>
            </div>
            {items.length === 0 ? (
              <p className="muted">Nothing matches &ldquo;{query}&rdquo; in this category.</p>
            ) : (
              <div className="inv-grid">
                {items.map((item) => (
                  <CosmeticTile
                    key={item.id}
                    item={item}
                    owned={owned.has(item.id)}
                    action={actionFor(item)}
                    initial={initial}
                  />
                ))}
              </div>
            )}
          </section>

          <RoomCardManager />
        </>
      ) : (
        <RoomCardManager />
      )}
    </div>
    </div>
    </>
  );
}
