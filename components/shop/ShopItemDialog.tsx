"use client";

import { useEffect, useRef } from "react";
import type { CosmeticItem } from "@/types/economy";
import { CoinGem } from "@/components/arena";
import { categoryLabel } from "./categoryLabel";

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
 */
export function ShopItemDialog({
  item, intent, price, balance, owned, equipped, onClose, onBuy, onEquip, onCoins,
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
}) {
  const modal = useRef<HTMLDialogElement>(null);
  useEffect(() => { modal.current?.showModal(); }, []);

  const short = !owned && balance < price;
  const passive = item.category === "emote" || item.category === "sticker";
  const buying = intent === "buy" && !owned;

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

      {!owned ? (
        <>
          <div className="dl">
            <span>Price</span>
            <b><CoinGem small /><span>{price.toLocaleString()} coins</span></b>
          </div>
          <div className="dl">
            <span>Current balance</span>
            <b><CoinGem small />{balance.toLocaleString()}</b>
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
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "22px" }}>
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
      </div>
    </dialog>
  );
}
