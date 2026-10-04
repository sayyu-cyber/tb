"use client";

import { useState } from "react";
import { Package, Ticket, Search } from "lucide-react";
import type { CosmeticCategory } from "@/types/economy";
import RoomCardManager from "@/components/roomcards/RoomCardManager";
import { Meter } from "@/components/arena";
import { LoadoutSlot, CategoryChips, CosmeticTile } from "@/components/inventory/InventoryPieces";
import { useInventory } from "@/components/inventory/useInventory";
import { LandInventory } from "@/components/inventory/land/LandInventory";
import { usePhoneLayout } from "@/hooks/usePhoneLayout";

/**
 * Inventory — design/arena/screens/app/app-03-inventory.jpg, from the
 * Inventory board.
 *
 * A phone gets LInventory instead (components/inventory/land), the same
 * screen recomposed for 844x390. Only one composition mounts, and both read
 * their figures from useInventory, so they can never disagree.
 */
export default function InventoryPage() {
  const phone = usePhoneLayout();
  const [tab, setTab] = useState<"cosmetics" | "roomCards">("cosmetics");
  const [category, setCategory] = useState<CosmeticCategory>("cardBack");
  const [query, setQuery] = useState("");
  const { t, initial, owned, collected, catalogue, chips, items, actionFor, slots, readyCards } =
    useInventory({ category, query });

  if (phone) return <LandInventory />;

  return (
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
              {slots.map(({ key, label, item }) => (
                <LoadoutSlot key={key} label={label} item={item} initial={initial} />
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
  );
}
