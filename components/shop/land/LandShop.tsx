"use client";

import type { CSSProperties } from "react";
import {
  ArrowRight, Check, ChevronDown, ChevronRight, Clock, Coins, Crown, Eye, Info, Layers, Plus, Search, Sparkles,
} from "lucide-react";
import type { CosmeticItem } from "@/types/economy";
import type { COIN_PACKS } from "@/data/cosmetics";
import type { CoinTopupRequest } from "@/lib/coinTopups";
import { useTranslation } from "@/hooks/useTranslation";
import { CardBackArt, CoinGem, TableSwatch } from "@/components/arena";
import { ArenaSprite, Suit } from "@/components/game/ArenaSprite";
import { formatCoins } from "@/lib/wallet";
import { usePhoneTopBar } from "@/components/layout/phone/topBarStore";
import { categoryLabel } from "../categoryLabel";
import { rarityStyle } from "../ShopItemCard";

/**
 * The Shop on a phone - design/arena/boards/LShop.dc.html and LShopVip
 * (with LShopBuy and LShopShort, the dialog), design/arena/screens/
 * landscape/landscape-11, 11b, 11c and 12.
 *
 * Featured: the balance chip and the four tabs on one row; Weekly Featured
 * three across with its refresh countdown; the VIP strip; four coin packs
 * across with their Popular and Best Value flags. VIP Pass: the tabs over
 * the VIP hero (six perks, the VIP-only taste) beside the two plans and
 * Activate, then every coin pack as rows in two columns. Permanent and
 * Coins are not drawn; they use the same pieces - the item grid under the
 * category chips, search and sort, and the coin pack rows.
 *
 * CosmeticShop keeps every rule - the weekly rotation, admin price and
 * visibility overrides, the top-up request that waits on an admin, the VIP
 * billing switch - and passes the results in, the same as the wide screen.
 */

type Tab = "featured" | "permanent" | "coins" | "vip";
type Pack = (typeof COIN_PACKS)[number];

/** The board's gem clusters: four for the cards, five for the rows. */
const CARD_GEMS = [
  [{ left: 28, top: 13 }],
  [{ left: 15, top: 15 }, { left: 40, top: 9 }],
  [{ left: 4, top: 19 }, { left: 28, top: 5 }, { left: 52, top: 19 }],
  [{ left: 0, top: 21 }, { left: 20, top: 5 }, { left: 40, top: 21 }, { left: 56, top: 3, size: 18 }],
];
const ROW_GEMS = [
  [{ left: 13, top: 11 }],
  [{ left: 4, top: 13 }, { left: 22, top: 7 }],
  [{ left: 0, top: 15 }, { left: 13, top: 3 }, { left: 26, top: 15 }],
  [{ left: 0, top: 17 }, { left: 12, top: 3 }, { left: 24, top: 17 }, { left: 30, top: 1, size: 13 }],
  [{ left: 0, top: 17 }, { left: 12, top: 3 }, { left: 24, top: 17 }, { left: 12, top: 22, size: 14 }],
];

function gems(cluster: { left: number; top: number; size?: number }[]) {
  return cluster.map((gem, position) => (
    <i key={position} style={{ left: gem.left, top: gem.top, ...(gem.size ? { width: gem.size, height: gem.size } : {}) }} />
  ));
}

export interface LandShopProps {
  tab: Tab;
  onTab: (next: Tab) => void;
  coins: number;
  timeLeft: string;
  featured: CosmeticItem[];
  permanent: CosmeticItem[];
  categories: { id: string; label: string }[];
  category: string;
  onCategory: (id: string) => void;
  query: string;
  onQuery: (next: string) => void;
  sort: string;
  onSort: (next: string) => void;
  priceFor: (item: CosmeticItem) => number;
  isOwned: (id: string) => boolean;
  isEquipped: (item: CosmeticItem) => boolean;
  onBuy: (item: CosmeticItem) => void;
  onEquip: (item: CosmeticItem) => void;
  onPreview: (item: CosmeticItem) => void;
  initial: string;
  vipActive: boolean;
  remainingDays: number;
  plans: readonly { id: "weekly" | "monthly"; days: number; priceMVR: number; savingsNote?: string }[];
  plan: "weekly" | "monthly";
  onPlan: (id: "weekly" | "monthly") => void;
  onActivate: () => void;
  /** VIP billing is off: the plans are shown, and say so, but cannot be bought. */
  vipUnavailable: boolean;
  packs: readonly Pack[];
  pending: CoinTopupRequest | undefined;
  packsDisabled: boolean;
  onPack: (pack: Pack) => void;
}

export function LandShop(p: LandShopProps) {
  const t = useTranslation();
  // LShopVip's bar is titled VIP Pass under a Shop label; the other tabs keep the route's.
  usePhoneTopBar(p.tab === "vip" ? { kind: "page", labelKey: "page_shop", titleKey: "vip_pass" } : null);
  const tabs = ([
    { id: "featured", label: t("shop_tabFeatured"), Icon: Sparkles },
    { id: "permanent", label: t("shop_tabPermanent"), Icon: Layers },
    { id: "coins", label: t("shop_tabCoins"), Icon: Coins },
    { id: "vip", label: t("shop_tabVip"), Icon: Crown },
  ] as const).map(({ id, label, Icon }) => (
    <button key={id} type="button" aria-pressed={p.tab === id} onClick={() => p.onTab(id)} data-flat>
      <Icon aria-hidden="true" />{label}
    </button>
  ));
  const card = (item: CosmeticItem, featured = false) => (
    <ItemCard key={item.id} item={item} featured={featured} price={p.priceFor(item)} owned={p.isOwned(item.id)}
      equipped={p.isEquipped(item)} initial={p.initial} onBuy={() => p.onBuy(item)} onEquip={() => p.onEquip(item)}
      onPreview={() => p.onPreview(item)} />
  );
  const note = (
    <>
      <Info aria-hidden="true" style={{ flex: "none", width: 15, height: 15, color: "#00BCC8" }} />
      Prices in MVR. Top-ups require admin approval before coins are credited.
    </>
  );
  const pending = p.pending && (
    <div className="pending" role="status">
      <i className="spin" aria-hidden="true" />
      <span style={{ flex: "1 1 0", fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }}>Your {p.pending.packName} request is pending admin approval.</span>
      <span className="lbl" style={{ color: "#8AF0F5", fontSize: 9.5, letterSpacing: ".14em" }}>Coins arrive once approved</span>
    </div>
  );
  /** Every pack as a row, two columns - LShopVip's treatment of the whole catalogue. */
  const packRows = (
    <section className="sec" aria-label="Coin Packs" style={{ gap: 12 }}>
      <div className="sech">
        <div><h2>Coin Packs</h2><p>Get coins to buy exclusive cosmetics</p></div>
        <span className="coins" style={{ height: 36, fontSize: 14, padding: "0 12px 0 10px" }}><CoinGem />{formatCoins(p.coins)}</span>
      </div>
      {pending}
      <div className="cols c2" style={{ rowGap: 16, marginTop: 6 }}>
        {p.packs.map((pack, index) => (
          <div className={`prow ${pack.isBestValue ? "best" : pack.isPopular ? "pop" : ""}`.trim()} key={pack.id}>
            {pack.isBestValue ? <span className="pill lime flag">Best Value</span> : pack.isPopular ? <span className="pill blue flag">Popular</span> : null}
            <div className="gms" aria-hidden="true">{gems(ROW_GEMS[Math.min(index, ROW_GEMS.length - 1)])}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <b className="disp" style={{ fontSize: 14 }}>{pack.name}</b>
              <b className="c">{formatCoins(pack.coins)} <span className="muted2">coins</span></b>
            </div>
            <button type="button" className="ar-btn ghost sm" disabled={p.packsDisabled} onClick={() => p.onPack(pack)}>
              Request · MVR {pack.priceMVR}<span className="sr-only"> for {formatCoins(pack.coins)} coins</span>
            </button>
          </div>
        ))}
        <p className="pnote muted2" style={{ margin: 0, lineHeight: 1.4 }}>{note}</p>
      </div>
    </section>
  );

  if (p.tab === "vip") {
    const plan = p.plans.find((option) => option.id === p.plan) ?? p.plans[0];
    const planLabel = p.plan === "weekly" ? t("vip_weeklyLabel") : t("vip_monthlyLabel");
    const perks = [t("vip_benefit1"), t("vip_benefit2"), t("vip_benefit3"), t("vip_benefit4"), t("vip_benefit5"), t("vip_benefit6")];
    return (
      <div className="arena-land is-m is-land arena-lshop arena-lshopvip">
        <ArenaSprite />
        <div className="mpage">
          {p.vipUnavailable && <p role="status" className="sr-only">VIP purchases are currently unavailable.</p>}
          <div className="cols sideR stretch fit">
            <div className="stk fill" style={{ gap: 12 }}>
              <div className="tabs vtabs" role="group" aria-label={t("page_shop")}>{tabs}</div>
              <section className="viphero grow" aria-label={t("vip_pass")}>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="foilcrown" aria-hidden="true"><Crown /></span>
                      <h2 className="disp" style={{ margin: 0, fontSize: 28 }}>{t("vip_pass")}</h2>
                    </div>
                    <p className="body" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.3 }}>
                      {p.vipActive ? t("vip_activeStatus").replace("{n}", String(p.remainingDays)) : `${plan.days} Days of Premium Benefits`}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.1)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <CardBackArt id="cb_vip_gold" width={4.6 * 7.2} style={{ flex: "none" }} />
                      {/* VIP Lounge borrows Golden Palace's felt (see TableSwatch); the board rails it gold. */}
                      <span className="tt palace" aria-hidden="true" style={{ flex: "none", fontSize: 7, width: 74, height: 50, background: "#0B0B0F", boxShadow: "inset 0 0 0 .5em #0B0B0F, inset 0 0 0 .7em #FFC940, 0 0 18px rgba(255,201,64,.3)" }} />
                    </div>
                    <span style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span className="rar legendary" style={{ fontSize: 9.5 }}>Legendary · VIP only</span>
                      <span className="muted2" style={{ fontSize: 11.5, lineHeight: 1.35 }}>VIP Royal Gold, VIP Lounge, VIP Elite and more</span>
                    </span>
                  </div>
                </div>
                <div className="perks">
                  {perks.map((perk) => <div className="perk" key={perk}><span className="pk" aria-hidden="true"><Check /></span>{perk}</div>)}
                </div>
              </section>
            </div>
            {/* VIP billing is not switched on: the plans can be read but not
                bought, exactly as on the wide screen. */}
            <fieldset disabled={p.vipUnavailable} className="stk fill" style={{ gap: 12, border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              {p.plans.map((option) => (
                <button key={option.id} type="button" className="plan" aria-pressed={p.plan === option.id} onClick={() => p.onPlan(option.id)} data-flat>
                  <span className="radio" aria-hidden="true" />
                  {option.savingsNote
                    ? <span style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="lbl">{t("vip_monthlyLabel")}</span><span className="pill lime">Save</span></span>
                    : <span className="lbl">{option.id === "weekly" ? t("vip_weeklyLabel") : t("vip_monthlyLabel")}</span>}
                  <span className="price"><small>MVR</small><b>{option.priceMVR}</b></span>
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    {option.savingsNote ? `${option.days} days · ${option.savingsNote}` : `${option.days} days of premium benefits`}
                  </span>
                </button>
              ))}
              <button type="button" className="ar-btn" style={{ flex: "none", height: 54, fontSize: 15 }} disabled={p.vipActive} onClick={p.onActivate}>
                <Crown aria-hidden="true" />{p.vipActive ? "VIP Active" : t("vip_activateBtn").replace("{plan}", planLabel)}
              </button>
            </fieldset>
          </div>
          {packRows}
        </div>
      </div>
    );
  }

  return (
    <div className="arena-land is-m is-land arena-lshop arena-lshopvip">
      <ArenaSprite />
      <div className="mpage">
        <div className="dock">
          <div className="bal">
            <span className="lbl">Your Balance</span>
            <b><CoinGem />{formatCoins(p.coins)}</b>
            <button type="button" className="ar-btn" aria-label="Get coins" onClick={() => p.onTab("coins")}><Plus aria-hidden="true" /></button>
          </div>
          <div className="tabs" role="group" aria-label={t("page_shop")}>{tabs}</div>
        </div>

        {p.tab === "featured" && (
          <section className="sec" aria-label={t("shop_weeklyFeatured")} style={{ gap: 10 }}>
            <div className="sech">
              <div><h2>{t("shop_weeklyFeatured")}</h2><p>Customize your table, cards, and experience. Stand out in every game.</p></div>
              <span className="pill line" style={{ height: 30, padding: "0 11px" }}><Clock aria-hidden="true" />Refreshes in {p.timeLeft}</span>
            </div>
            {p.featured.length === 0
              ? <p className="muted" style={{ margin: 0 }}>No featured items right now. Check back after the next rotation.</p>
              : <div className="cols c3">{p.featured.map((item) => card(item, true))}</div>}
            <div className="vipstrip">
              <span className="cr" aria-hidden="true"><Crown /></span>
              <div style={{ flex: "1 1 0", minWidth: 0 }}>
                <b className="disp" style={{ fontSize: 15, lineHeight: 1.1 }}>{p.vipActive ? "VIP Active" : "VIP Exclusive: +1 Featured cosmetic"}</b>
                <p className="muted" style={{ margin: "5px 0 0", fontSize: 12.5, lineHeight: 1.35 }}>
                  {p.vipActive ? "Your extra weekly cosmetic slot is unlocked." : "Upgrade to VIP Pass to unlock an extra featured item every week."}
                </p>
              </div>
              {!p.vipActive && (
                <button type="button" className="ar-btn blue sm" style={{ flex: "none" }} onClick={() => p.onTab("vip")}>View VIP Plans<ArrowRight aria-hidden="true" /></button>
              )}
            </div>
          </section>
        )}

        {p.tab === "featured" && (
          <section className="sec" aria-label="Coin Packs" style={{ gap: 14 }}>
            <div className="sech">
              <div><h2>Coin Packs</h2><p>Get coins to buy exclusive cosmetics</p></div>
              <button type="button" className="link" onClick={() => p.onTab("coins")} data-flat>View All<ChevronRight aria-hidden="true" /></button>
            </div>
            {pending}
            <div className="cols c4" style={{ marginTop: 4 }}>
              {p.packs.slice(0, 4).map((pack, index) => (
                <div className={`pack ${pack.isBestValue ? "best" : pack.isPopular ? "pop" : ""}`.trim()} key={pack.id}>
                  {pack.isBestValue ? <span className="pill lime flag">Best Value</span> : pack.isPopular ? <span className="pill blue flag">Popular</span> : null}
                  <div className="gems" aria-hidden="true">{gems(CARD_GEMS[Math.min(index, CARD_GEMS.length - 1)])}</div>
                  <span className="lbl">{pack.name}</span>
                  <b className="amt">{formatCoins(pack.coins)} coins</b>
                  <button type="button" className={pack.isBestValue ? "ar-btn sm" : pack.isPopular ? "ar-btn blue sm" : "ar-btn ghost sm"}
                    disabled={p.packsDisabled} onClick={() => p.onPack(pack)}>
                    Request · MVR {pack.priceMVR}<span className="sr-only"> for {formatCoins(pack.coins)} coins</span>
                  </button>
                </div>
              ))}
            </div>
            <p className="muted2" style={{ margin: 0, display: "flex", gap: 8, lineHeight: 1.4 }}>{note}</p>
          </section>
        )}

        {p.tab === "permanent" && (
          <section className="sec" aria-label={t("shop_tabPermanent")} style={{ gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label className="field" style={{ flex: "1 1 0", height: 38, minWidth: 0 }}>
                <Search aria-hidden="true" />
                <input type="search" value={p.query} onChange={(event) => p.onQuery(event.target.value)} placeholder="Search cosmetics" aria-label="Search cosmetics" />
              </label>
              <span className="select" style={{ height: 38 }}>
                <select value={p.sort} onChange={(event) => p.onSort(event.target.value)} aria-label="Sort cosmetics">
                  <option value="default">Collection order</option>
                  <option value="price">Price: low to high</option>
                  <option value="name">Name: A to Z</option>
                </select>
                <ChevronDown aria-hidden="true" />
              </span>
            </div>
            <div className="chips" role="group" aria-label="Cosmetic categories">
              {p.categories.map((category) => (
                <button key={category.id} type="button" aria-pressed={p.category === category.id} onClick={() => p.onCategory(category.id)} data-flat>{category.label}</button>
              ))}
            </div>
            {p.permanent.length === 0
              ? <p className="muted" style={{ margin: 0 }}>{t("inventory_nothingHere")}</p>
              : <div className="cols c3">{p.permanent.map((item) => card(item))}</div>}
          </section>
        )}

        {p.tab === "coins" && packRows}
      </div>
    </div>
  );
}

/* ── An item ────────────────────────────────────────────────────────── */

function ItemCard({ item, featured, price, owned, equipped, initial, onBuy, onEquip, onPreview }: {
  item: CosmeticItem; featured: boolean; price: number; owned: boolean; equipped: boolean; initial: string;
  onBuy: () => void; onEquip: () => void; onPreview: () => void;
}) {
  const wearable = item.category !== "emote" && item.category !== "sticker";
  return (
    <article className="item" style={rarityStyle(item) as CSSProperties}>
      <div className="art">
        {featured && <span className="pill lime feat">Featured</span>}
        <button type="button" className="ibtn eye" aria-label={`Preview ${item.name}`} onClick={onPreview}><Eye aria-hidden="true" /></button>
        <LandShopArt item={item} initial={initial} />
      </div>
      <div className="info">
        <span className={`rar ${item.rarity.toLowerCase()}`}>{item.rarity} · {categoryLabel(item.category)}</span>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        {owned ? (
          wearable && !equipped
            ? <button type="button" className="buy eq" onClick={onEquip} data-flat><span>Equip</span><span className="sr-only"> {item.name}</span></button>
            : <span className="buy eq" aria-disabled="true"><span>{equipped ? "Equipped" : "Owned"}</span></span>
        ) : (
          <button type="button" className="buy" onClick={onBuy} data-flat>
            <CoinGem small /><span>{price.toLocaleString("en-US")}</span><span className="sr-only"> coins - buy {item.name}</span>
          </button>
        )}
      </div>
    </article>
  );
}

/**
 * An item drawn the way the landscape boards draw it, at the card's size or
 * the dialog's: a tilted back, the felt, the framed initial, a bubble for an
 * emote, the firework burst, a tilted sticker. The frame, bubble, burst and
 * sticker take their sizes from the board's own classes (`.bart` grows them).
 */
export function LandShopArt({ item, initial, dialog = false }: { item: CosmeticItem; initial: string; dialog?: boolean }) {
  if (item.category === "cardBack") return <CardBackArt id={item.id} width={(dialog ? 12 : 7) * 7.2} style={{ transform: "rotate(-6deg)" }} />;
  if (item.category === "tableTheme") return <TableSwatch id={item.id} width={dialog ? 150 : 104} height={dialog ? 96 : 64} style={dialog ? undefined : { fontSize: 11 }} />;
  if (item.category === "profileFrame") return <span className="frame" aria-hidden="true">{initial}</span>;
  if (item.category === "emote") return <span className="bubble" aria-hidden="true"><Sparkles /></span>;
  if (item.category === "victoryAnimation") {
    return <span className="fw" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ transform: `rotate(${index * 30}deg)` }} />)}</span>;
  }
  if (item.category === "sticker") {
    return (
      <span className="sticker" aria-hidden="true">
        <Suit suit="S" style={{ width: dialog ? 30 : 20, height: dialog ? 30 : 20 }} />
        <b>{item.name}</b>
      </span>
    );
  }
  return <span aria-hidden="true" style={{ width: dialog ? 150 : 110, height: dialog ? 74 : 54, borderRadius: 12, background: "linear-gradient(120deg,#0E1E3A,#16305A 60%,#0B1428)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.2)" }} />;
}
