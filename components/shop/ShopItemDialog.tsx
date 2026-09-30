"use client";

import { useEffect, useRef } from "react";
import type { CosmeticItem } from "@/types/economy";
import { CoinGem } from "@/components/arena";
import { RARITY_COLORS } from "@/data/cosmetics";
import { Sheet } from "@/components/layout/phone/Sheet";
import { categoryLabel } from "./categoryLabel";
import { ShopArt } from "./ShopItemCard";
import { formatCoins } from "@/lib/wallet";

/**
 * The purchase dialog — design/arena/screens/app/app-11b-shop-buy-dialog.jpg
 * and app-11c-shop-not-enough-coins.jpg.
 *
 * Three rows: the price, the balance, and what is left afterwards. When the
 * price is higher than the balance the third row flips to "More coins
 * needed" in the danger colour, a line of copy appears, and the action
 * becomes Get Coins. Those are the two states the boards draw.
 *
 * It is a real <dialog> opened with showModal(), so Escape, the focus trap
 * and the inert backdrop come from the platform rather than from us. The
 * board's `.scrim` styling is applied to ::backdrop.
 *
 * Held upright a phone gets the same confirm as a bottom sheet, with the
 * item's art beside its name - design/arena/boards/MShopBuy.dc.html and
 * MShopShort.dc.html, phone-11b-buy-sheet.jpg and
 * phone-11c-not-enough-coins.jpg. The rows, the states and the actions are
 * written once and used by both, so "Not enough coins." cannot say one
 * thing on one composition and another on the other.
 */
export function ShopItemDialog({
  item, intent, price, balance, owned, equipped, onClose, onBuy, onEquip, onCoins,
  phone = false, initial = "S",
}: {
  item: CosmeticItem;
  intent: "preview" | "buy";
  price: number;
  balance: number;
  owned: boolean;
  equipped: boolean;
  onClose: () => void;
  onBuy: () => void;
  onEquip: () => void;
  onCoins: () => void;
  /** Draw MShopBuy's bottom sheet instead of the wide screen's dialog. */
  phone?: boolean;
  /** The player's initial, for the profile-frame art. */
  initial?: string;
}) {
  const modal = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (!phone) modal.current?.showModal(); }, [phone]);

  const short = !owned && balance < price;
  const passive = item.category === "emote" || item.category === "sticker";
  const buying = intent === "buy" && !owned;
  const colour = RARITY_COLORS[item.rarity];

  /* The rows and the states are identical in both, so they are written once:
     price, balance, what is left afterwards, and the "Not enough coins."
     line that MShopShort is entirely about. */
  const rows = !owned ? (
    <>
      <div className="dl">
        <span>Price</span>
        <b><CoinGem small /><span>{price.toLocaleString()} coins</span></b>
      </div>
      <div className="dl">
        <span>Current balance</span>
        <b><CoinGem small />{formatCoins(balance)}</b>
      </div>
      <div className="dl" style={{ borderBottom: 0 }}>
        <span>{short ? "More coins needed" : "After purchase"}</span>
        <b style={{ color: short ? "#FF6B80" : "#C6FF33" }}>
          <CoinGem small />{Math.abs(balance - price).toLocaleString()}
        </b>
      </div>
      {short && (
        <p role="status" style={{ margin: "8px 0 0", fontSize: "14px", fontWeight: 600, color: "#FF6B80" }}>
          Not enough coins.
        </p>
      )}
    </>
  ) : (
    <p className="muted" style={{ margin: 0 }}>{item.description}</p>
  );

  const actions = (
    <>
      <button type="button" className="ar-btn ghost sm" onClick={onClose}>Cancel</button>
      {owned ? (
        <button type="button" className="ar-btn sm" disabled={equipped || passive} onClick={onEquip}>
          {equipped ? "Equipped" : passive ? "Owned" : "Equip"}
        </button>
      ) : short ? (
        <button type="button" className="ar-btn blue sm" onClick={onCoins}>Get Coins</button>
      ) : (
        <button type="button" className="ar-btn sm" onClick={onBuy}>Buy for {price.toLocaleString()}</button>
      )}
    </>
  );

  /* MShopBuy and MShopShort: the same confirm as a bottom sheet, with the
     item's own art beside its name. Their stylesheets came out identical to
     MShop's, because they ARE MShop with this open. */
  if (phone) return (
    /* The sheet portals to <body>, so the board namespace its art square
       (`.sart`) is scoped under has to travel with it. */
    <Sheet open onClose={onClose} label={buying ? `Buy ${item.name}?` : item.name} headingId="shop-sheet-title" namespace="arena-mshop">
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span className="sart" style={{ ["--rg" as string]: colour }}>
          <ShopArt item={item} initial={initial} />
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <span className={`rar ${item.rarity.toLowerCase()}`}>
            {item.rarity} · {categoryLabel(item.category)}
          </span>
          <h2 id="shop-sheet-title" className="disp" style={{ margin: 0, fontSize: 26, lineHeight: 0.95 }}>
            {buying ? `Buy ${item.name}?` : item.name}
          </h2>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>{rows}</div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.5fr)", gap: 10, marginTop: 18 }}>
        {actions}
      </div>
    </Sheet>
  );

  return (
    <dialog
      ref={modal}
      className="dlg"
      aria-labelledby="store-dialog-title"
      onCancel={onClose}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(event) => { if (event.target === modal.current) onClose(); }}
    >
      <span className={`rar ${item.rarity.toLowerCase()}`}>
        {item.rarity} · {categoryLabel(item.category)}
      </span>
      <h2 id="store-dialog-title" className="disp" style={{ margin: "10px 0 18px", fontSize: "32px" }}>
        {buying ? `Buy ${item.name}?` : item.name}
      </h2>

      {rows}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "22px" }}>
        {actions}
      </div>
    </dialog>
  );
}
