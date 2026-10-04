"use client";

import { useState } from "react";
import { Check, Clock, Lock, Package, Search, Sparkles, Ticket, X } from "lucide-react";
import type { CosmeticCategory } from "@/types/economy";
import { useEconomy } from "@/contexts/EconomyContext";
import { ALL_COSMETICS, ROOM_CARD_PRICES } from "@/data/cosmetics";
import { CardBackArt, CoinGem, TableSwatch } from "@/components/arena";
import { Sheet } from "@/components/layout/phone/Sheet";
import { DURATIONS, LABEL, remaining } from "@/components/roomcards/RoomCardManager";
import { CosmeticArt } from "../CosmeticArt";
import type { TileAction } from "../InventoryPieces";
import { useInventory, type Cosmetic } from "../useInventory";

/**
 * Inventory on a phone - design/arena/boards/LInventory.dc.html (+
 * LInventoryRoom, LInventoryPreview, LInventoryLocked),
 * design/arena/screens/landscape/landscape-03 to 03d.
 *
 * Cosmetics / Room Cards tabs beside the collected meter. Cosmetics: the
 * Loadout as five slots across, then Collection - search, the category
 * chips and a seven-across grid that ends in a "4/13 Collected" cell. A
 * tile's art opens the preview, a 540px panel from the right. Room Cards:
 * your cards and Activate beside Buy with Coins (3 x 2).
 *
 * /inventory, /collection and /room-cards all land here (Collection and
 * Room Cards are Inventory's tabs on a phone), so `initialTab` picks the
 * one the route was for. Figures come from useInventory, the same as the
 * wide screen's.
 */

const fmt = (n: number) => n.toLocaleString("en-US");

/** The preview names one item, so its label is the singular - "Card Back". */
const SINGULAR: Record<CosmeticCategory, string> = {
  cardBack: "Card Back", tableTheme: "Table", profileFrame: "Frame", emote: "Emote",
  victoryAnimation: "Victory", sticker: "Sticker", banner: "Banner",
};

export function LandInventory({ initialTab = "cosmetics" }: { initialTab?: "cosmetics" | "roomCards" }) {
  const [tab, setTab] = useState(initialTab);
  const [category, setCategory] = useState<CosmeticCategory>("cardBack");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const inv = useInventory({ category, query });
  const { t, collected, catalogue, chips, items, owned, slots, initial, readyCards } = inv;
  const pct = catalogue ? Math.round((collected / catalogue) * 100) : 0;
  const chip = chips.find((entry) => entry.id === category);
  const previewing = preview ? ALL_COSMETICS.find((item) => item.id === preview) : undefined;
  const table = slots.find((slot) => slot.key === "tableTheme")?.item;
  const back = slots.find((slot) => slot.key === "cardBack")?.item;

  return (
    <div className="arena-land is-m is-land arena-linventory">
      <div className="mpage" style={{ paddingBottom: tab === "roomCards" ? 10 : 28 }}>
        <div className="cols" style={{ gridTemplateColumns: "296px minmax(0, 1fr)", gap: 20, alignItems: "center" }}>
          <div className="tabs" role="group" aria-label="Inventory sections">
            <button type="button" aria-pressed={tab === "cosmetics"} onClick={() => setTab("cosmetics")} data-flat>
              <Package aria-hidden="true" />{t("inventory_cosmetics")}
            </button>
            <button type="button" aria-pressed={tab === "roomCards"} onClick={() => { setTab("roomCards"); setPreview(null); }} data-flat>
              <Ticket aria-hidden="true" />{t("inventory_roomCards")}
              {readyCards > 0 && <span className="n">{readyCards}</span>}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <b className="num" style={{ fontSize: 24 }}>{collected}</b>
                <span className="muted">/ {catalogue} collected</span>
              </span>
              <span className="lbl" style={{ color: "#8AF0F5" }}>{pct}%</span>
            </div>
            <div className="meter seg b" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
              aria-label="Collection progress" aria-valuetext={`${collected} of ${catalogue} cosmetics`}>
              <i style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {tab === "cosmetics" ? (
          <>
            <section className="panel tick" aria-label="Loadout" style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="ph"><h2>Loadout</h2><span className="lbl">One per slot</span></div>
              <div className="cols c5 stretch" style={{ gap: 10 }}>
                {slots.map(({ key, label, item }) => (
                  <div className={`slot ${item ? "on" : ""}`.trim()} key={key}>
                    <span className="lbl">{label}</span>
                    <div className="sart">{item ? <SlotArt item={item} initial={initial} /> : null}</div>
                    <b>{item?.name ?? "None"}</b>
                    {item
                      ? <span className="pill lime"><Check aria-hidden="true" />Equipped</span>
                      : <span className="pill dim">Empty</span>}
                  </div>
                ))}
              </div>
            </section>

            <section className="sec" aria-label={t("collection_title")} style={{ gap: 10 }}>
              <div className="sech">
                <h2>{t("collection_title")}</h2>
                <label className="field" style={{ width: 232, height: 36, padding: "0 12px", fontSize: 13 }}>
                  <Search aria-hidden="true" />
                  <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search inventory" aria-label="Search inventory" />
                </label>
              </div>
              <div className="chips" role="group" aria-label="Cosmetic categories">
                {chips.map((entry) => (
                  <button type="button" key={entry.id} aria-pressed={entry.id === category} onClick={() => setCategory(entry.id)} data-flat>
                    {entry.label}<span className="cn">{entry.owned}/{entry.total}</span>
                  </button>
                ))}
              </div>
              {items.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>Nothing matches &ldquo;{query}&rdquo; in this category.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
                  {items.map((item) => (
                    <Tile key={item.id} item={item} owned={owned.has(item.id)} action={inv.actionFor(item)}
                      initial={initial} onPreview={() => setPreview(item.id)} />
                  ))}
                  {chip && (
                    <div className="tile sum" role="status" aria-label={`${chip.owned} of ${chip.total} ${chip.label} collected`}>
                      <div className="wr">
                        <svg viewBox="0 0 96 96" aria-hidden="true">
                          <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="9" />
                          <circle cx="48" cy="48" r="40" fill="none" stroke="#C6FF33" strokeWidth="9" strokeLinecap="round"
                            strokeDasharray="251.3" strokeDashoffset={(251.3 * (1 - (chip.total ? chip.owned / chip.total : 0))).toFixed(1)} />
                        </svg>
                        <b>{chip.owned}/{chip.total}</b>
                      </div>
                      <span className="lbl" style={{ fontSize: 9.5, letterSpacing: ".14em" }}>{t("inv_collected")}</span>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        ) : (
          <RoomCards />
        )}
      </div>

      <Sheet open={!!previewing} onClose={() => setPreview(null)} label="Item preview" namespace="arena-linventory"
        className="right w2 tick" scrimFull style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {previewing && (
          <Preview item={previewing} owned={owned.has(previewing.id)} action={inv.actionFor(previewing)}
            category={SINGULAR[previewing.category]}
            table={table} back={back} initial={initial} onClose={() => setPreview(null)} />
        )}
      </Sheet>
    </div>
  );
}

/* ── Art ────────────────────────────────────────────────────────────── */

/** The loadout slot's art, at the board's sizes (a back at 8.8px, the table 112 x 70). */
function SlotArt({ item, initial }: { item: Cosmetic; initial: string }) {
  if (item.category === "cardBack") return <CardBackArt id={item.id} width={8.8 * 7.2} />;
  if (item.category === "tableTheme") return <TableSwatch id={item.id} width={112} height={70} style={{ fontSize: 11 }} />;
  if (item.category === "profileFrame") {
    return (
      <span className="ava" aria-hidden="true" style={{ width: 64, height: 64, borderRadius: 17, fontSize: 28, boxShadow: "0 0 0 4px #0B0B0F, 0 0 0 6px rgba(255,255,255,.7)" }}>
        {initial}
      </span>
    );
  }
  if (item.category === "victoryAnimation") return <Sparkles aria-hidden="true" style={{ width: 54, height: 54, color: "#C6FF33" }} />;
  return <span style={{ display: "flex", transform: "scale(.75)" }}><CosmeticArt item={item} size="slot" initial={initial} /></span>;
}

/** A grid tile's art: a card back at the board's 7px, everything else in the same band. */
function TileArt({ item, initial }: { item: Cosmetic; initial: string }) {
  if (item.category === "cardBack") return <CardBackArt id={item.id} width={7 * 7.2} style={{ margin: "4px 0 2px" }} />;
  return (
    <span style={{ height: 70.56, margin: "4px 0 2px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CosmeticArt item={item} size="phone" initial={initial} />
    </span>
  );
}

/* ── Grid tile ──────────────────────────────────────────────────────── */

function Tile({ item, owned, action, initial, onPreview }: {
  item: Cosmetic; owned: boolean; action: TileAction; initial: string; onPreview: () => void;
}) {
  const equipped = action.kind === "equipped";
  return (
    <div className={`tile ${equipped ? "eq" : ""} ${owned ? "" : "lockd"}`.replace(/\s+/g, " ").trim()}>
      {!owned && <span className="lk" aria-hidden="true"><Lock /></span>}
      <button type="button" className="tprev" aria-label={`Preview ${item.name}`} onClick={onPreview} data-flat>
        <TileArt item={item} initial={initial} />
        <b>{item.name}</b>
        <span className={`rar ${item.rarity.toLowerCase()}`}>{item.rarity}</span>
      </button>
      <TileButton item={item} action={action} />
    </div>
  );
}

function TileButton({ item, action }: { item: Cosmetic; action: TileAction }) {
  if (action.kind === "equipped") return <span className="tbtn done"><span>Equipped</span></span>;
  if (action.kind === "equip") {
    return (
      <button type="button" className="tbtn eq" onClick={action.onEquip} data-flat>
        <span>Equip</span><span className="sr-only"> {item.name}</span>
      </button>
    );
  }
  if (action.kind === "vip") return <span className="tbtn vip"><span>VIP only</span></span>;
  return (
    <button type="button" className="tbtn buy" onClick={action.onBuy} disabled={!action.affordable}
      title={action.affordable ? undefined : "Not enough coins"} data-flat>
      <CoinGem small /><span>{fmt(action.price)}</span><span className="sr-only"> coins - buy {item.name}</span>
    </button>
  );
}

/* ── Preview ────────────────────────────────────────────────────────── */

/**
 * LInventoryPreview / LInventoryLocked. The board draws a card back: the
 * back on the lit ring, then "On {your table}" with three of it fanned on
 * the felt. A table is shown with your card back fanned on it; the other
 * categories have no table to sit on, so their art takes the stage alone.
 */
function Preview({ item, owned, action, category, table, back, initial, onClose }: {
  item: Cosmetic; owned: boolean; action: TileAction; category: string;
  table: Cosmetic | undefined; back: Cosmetic | undefined; initial: string; onClose: () => void;
}) {
  const vip = action.kind === "vip";
  const equipped = action.kind === "equipped";
  const onTable = item.category === "cardBack" ? table : item.category === "tableTheme" ? item : undefined;
  const fanned = item.category === "cardBack" ? item : back;
  const status = owned ? "Owned" : vip ? "VIP only" : "Locked";
  const price = vip ? "VIP" : item.price > 0 ? fmt(item.price) : "Free";
  const label = equipped ? "Equipped" : owned ? "Equip" : vip ? "VIP only" : `Buy for ${fmt(item.price)}`;
  const tone = equipped || vip ? "ghost" : owned ? "" : "blue";
  const run = action.kind === "equip" ? action.onEquip : action.kind === "buy" ? action.onBuy : undefined;
  const disabled = vip || (action.kind === "buy" && !action.affordable);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="lbl dash">{category}</span>
        <button type="button" className="ibtn" aria-label="Close preview" onClick={onClose} style={{ width: 38, height: 38 }}>
          <X aria-hidden="true" />
        </button>
      </div>
      <div style={{ flex: "1 1 0", minHeight: 0, display: "grid", gridTemplateColumns: "200px minmax(0, 1fr)", gap: 18 }}>
        <div className="pvstage">
          <i className="ring" aria-hidden="true" />
          {item.category === "cardBack"
            ? <CardBackArt id={item.id} width={18 * 7.2} />
            : <span style={{ position: "relative", marginBottom: 12 }}><CosmeticArt item={item} size="slot" initial={initial} /></span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <b className="disp" style={{ fontSize: 27, lineHeight: 0.95 }}>{item.name}</b>
          <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.4, fontWeight: 500 }}>{item.description}</p>
          {onTable && (
            <div className="pvtbl" aria-label="Preview on your table">
              <TableSwatch id={onTable.id} width={0} style={{ fontSize: 8, width: undefined, height: undefined }} />
              <span className="lbl cap" style={{ fontSize: 8.5, letterSpacing: ".16em" }}>On {onTable.name}</span>
              {fanned && (
                <span className="f3" aria-hidden="true">
                  {[-13, 0, 13].map((turn) => (
                    <CardBackArt key={turn} id={fanned.id} width={4.6 * 7.2} style={{ ["--r" as string]: `${turn}deg` }} />
                  ))}
                </span>
              )}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div className="pvrow"><span>Rarity</span><b className={`rar ${item.rarity.toLowerCase()}`} style={{ fontSize: 12 }}>{item.rarity}</b></div>
            <div className="pvrow"><span>Status</span><b>{status}</b></div>
            <div className="pvrow"><span>Price</span><b>{!owned && !vip && <CoinGem small />}{price}</b></div>
          </div>
          <button type="button" className={`ar-btn sm ${tone}`.trim()} aria-pressed={equipped} disabled={disabled}
            title={action.kind === "buy" && !action.affordable ? "Not enough coins" : undefined} onClick={run}>
            {equipped && <Check aria-hidden="true" />}{label}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Room Cards ─────────────────────────────────────────────────────── */

/**
 * LInventoryRoom: what a Room Card is and the cards you hold, beside the six
 * durations you can buy. The same actions as the wide screen's
 * RoomCardManager, laid out as the board draws them.
 */
function RoomCards() {
  const { state, activateRoomCard, purchaseRoomCard } = useEconomy();
  const cards = state.profile.roomCards ?? [];
  const idle = cards.filter((card) => !card.activated);
  const active = cards.filter((card) => card.activated && (card.expiresAt ?? 0) > Date.now());
  const coins = state.economy.coins;

  return (
    <div className="cols sideL2 stretch" style={{ minHeight: 254 }}>
      <section className="panel tick b" aria-label="Room Cards" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="ph">
          <h2>Room Cards</h2>
          {idle.length > 0 ? <span className="pill blue">{idle.length} ready</span>
            : active.length > 0 ? <span className="pill lime">Active</span> : null}
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.4, fontWeight: 500 }}>
          Creating a private room requires an active Room Card - once activated, you can create as many rooms as you like until it expires.
        </p>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {active.map((card) => (
            <div className="ticket" key={card.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="ti" aria-hidden="true"><Clock /></span>
                <div>
                  <b className="disp" style={{ display: "block", fontSize: 16, lineHeight: 1 }}>{LABEL[card.type]} Room Card</b>
                  <p className="muted2" style={{ margin: "5px 0 0", fontSize: 12, lineHeight: 1.3 }}>Active - {remaining(card.expiresAt)}</p>
                </div>
              </div>
            </div>
          ))}
          {idle.map((card) => (
            <div className="ticket" key={card.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="ti" aria-hidden="true"><Ticket /></span>
                <div>
                  <b className="disp" style={{ display: "block", fontSize: 16, lineHeight: 1 }}>{LABEL[card.type]} Room Card</b>
                  <p className="muted2" style={{ margin: "5px 0 0", fontSize: 12, lineHeight: 1.3 }}>Activate to create unlimited private rooms</p>
                </div>
              </div>
              <button type="button" className="ar-btn sm full" onClick={() => activateRoomCard(card.id)}>
                Activate<span className="sr-only"> your {LABEL[card.type]} Room Card</span>
              </button>
            </div>
          ))}
          {active.length === 0 && idle.length === 0 && (
            <p className="muted2" style={{ margin: 0, fontSize: 12 }}>
              You don&apos;t have a Room Card yet. Buy one on the right, or earn one from the daily rewards.
            </p>
          )}
        </div>
      </section>
      <section className="panel" aria-label="Buy Room Cards" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
        <span className="lbl dash">Buy with Coins</span>
        <div className="cols c3 stretch" style={{ gap: 8, flex: "1 1 0" }}>
          {DURATIONS.map(({ type, label }) => {
            const price = ROOM_CARD_PRICES[type];
            const affordable = coins >= price;
            return (
              <div className="rc" key={type}>
                <b>{label}</b>
                <span className="pr"><CoinGem small />{fmt(price)}</span>
                <button type="button" className="tbtn buy" onClick={() => purchaseRoomCard(type)} disabled={!affordable}
                  title={affordable ? undefined : "Not enough coins"} data-flat>
                  Buy<span className="sr-only"> a {label} Room Card for {fmt(price)} coins</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
