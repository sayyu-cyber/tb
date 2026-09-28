"use client";

import { Package, Ticket, Search } from "lucide-react";
import type { CosmeticCategory } from "@/types/economy";
import type { ALL_COSMETICS } from "@/data/cosmetics";
import RoomCardManager from "@/components/roomcards/RoomCardManager";
import { LoadoutSlot, CategoryChips, CosmeticTile, type TileAction } from "../InventoryPieces";

/**
 * Inventory on a phone held upright — design/arena/boards/MInventory.dc.html,
 * design/arena/screens/phone/phone-03-inventory.jpg.
 *
 * The board recomposes the wide screen rather than redrawing it: the header
 * splits into the page title and a full-width collected meter under it, the
 * loadout's five slots become an `.hs` side-scroller, the category chips and
 * the search field stack instead of sharing a row, and the tile grid drops
 * from six columns to three. The Room Cards panel is the same panel.
 *
 * Everything inside those containers is the wide screen's own pieces -
 * LoadoutSlot, CategoryChips, CosmeticTile, RoomCardManager - because the
 * board draws them with the same classes at both sizes. So a cosmetic buys,
 * equips and reads identically whichever way the phone is held, and there is
 * one implementation of each to keep right.
 */

type Cosmetic = (typeof ALL_COSMETICS)[number];

export interface PhoneInventoryProps {
  title: string;
  collected: number;
  catalogue: number;
  tab: "cosmetics" | "roomCards";
  onTab: (next: "cosmetics" | "roomCards") => void;
  cosmeticsLabel: string;
  roomCardsLabel: string;
  /** Room Cards bought but not yet activated. */
  readyCards: number;
  /** The five loadout slots, in the board's order. */
  slots: { key: string; label: string; item: Cosmetic | undefined }[];
  chips: { id: CosmeticCategory; label: string; owned: number; total: number }[];
  category: CosmeticCategory;
  onCategory: (next: CosmeticCategory) => void;
  query: string;
  onQuery: (next: string) => void;
  items: Cosmetic[];
  owned: Set<string>;
  actionFor: (item: Cosmetic) => TileAction;
  initial: string;
}

export function PhoneInventory(p: PhoneInventoryProps) {
  const pct = p.catalogue ? Math.round((p.collected / p.catalogue) * 100) : 0;

  return (
    <div className="arena-minventory mpage">
      <div className="mh">
        <span className="lbl dash" style={{ color: "#C6FF33" }}>Cosmetics and Room Cards</span>
        <h1 className="disp chrome">{p.title}</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <b className="num" style={{ fontSize: 26 }}>{p.collected}</b>
            <span className="muted">/ {p.catalogue} collected</span>
          </span>
          <span className="lbl" style={{ color: "#8AF0F5" }}>{pct}%</span>
        </div>
        <div
          className="meter seg b"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Collection progress"
          aria-valuetext={`${p.collected} of ${p.catalogue} cosmetics`}
        >
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="tabs" role="group" aria-label="Inventory sections">
        <button type="button" aria-pressed={p.tab === "cosmetics"} onClick={() => p.onTab("cosmetics")} data-flat>
          <Package aria-hidden="true" />{p.cosmeticsLabel}
        </button>
        <button type="button" aria-pressed={p.tab === "roomCards"} onClick={() => p.onTab("roomCards")} data-flat>
          <Ticket aria-hidden="true" />{p.roomCardsLabel}
          {p.readyCards > 0 && <span className="n">{p.readyCards}</span>}
        </button>
      </div>

      {p.tab === "cosmetics" ? (
        <>
          <section className="sec" aria-label="Loadout">
            <div className="sech"><h2>Loadout</h2><span className="lbl">One per slot</span></div>
            {/* `.hs` runs to the screen edges and snaps to each slot -
                MOBILE.md "Side scrollers". */}
            <div className="hs">
              {p.slots.map(({ key, label, item }) => (
                <LoadoutSlot key={key} label={label} item={item} initial={p.initial} />
              ))}
            </div>
          </section>

          <section className="sec" aria-label="Collection">
            <CategoryChips categories={p.chips} value={p.category} onChange={p.onCategory} />
            <label className="field">
              <Search aria-hidden="true" />
              <input
                type="search"
                value={p.query}
                onChange={(event) => p.onQuery(event.target.value)}
                placeholder="Search inventory"
                aria-label="Search inventory"
              />
            </label>
            {p.items.length === 0 ? (
              <p className="muted">Nothing matches &ldquo;{p.query}&rdquo; in this category.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                {p.items.map((item) => (
                  <CosmeticTile
                    key={item.id}
                    item={item}
                    owned={p.owned.has(item.id)}
                    action={p.actionFor(item)}
                    initial={p.initial}
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
