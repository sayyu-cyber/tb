"use client";
import { useEffect, useRef } from "react";
import { X, Coins } from "lucide-react";
import { CosmeticItem } from "@/types/economy";
import { CosmeticPreview } from "@/components/ui/CosmeticPreview";
import { Button } from "@/components/ui/Button";

export function ShopItemDialog({ item, intent, price, balance, owned, equipped, onClose, onBuy, onEquip, onCoins }: {
  item: CosmeticItem; intent: "preview" | "buy"; price: number; balance: number; owned: boolean; equipped: boolean;
  onClose: () => void; onBuy: () => void; onEquip: () => void; onCoins: () => void;
}) {
  const modal = useRef<HTMLDialogElement>(null);
  useEffect(() => { modal.current?.showModal(); }, []);
  const passive = item.category === "emote" || item.category === "sticker";
  return <dialog ref={modal} className="store-modal" aria-labelledby="store-dialog-title" onCancel={onClose}>
    <button className="store-modal-close" aria-label="Close item preview" onClick={onClose}><X size={20} /></button>
    <div className="store-modal-art"><CosmeticPreview item={item} /></div>
    <p className="store-item-meta">{item.rarity} / {item.category}</p>
    <h2 id="store-dialog-title">{intent === "buy" && !owned ? "Buy " + item.name + "?" : item.name}</h2>
    <p>{item.description}</p>
    {!owned && <dl><div><dt>Price</dt><dd>{price.toLocaleString()} coins</dd></div><div><dt>Current balance</dt><dd>{balance.toLocaleString()}</dd></div><div><dt>{balance >= price ? "After purchase" : "More coins needed"}</dt><dd>{Math.abs(balance - price).toLocaleString()}</dd></div></dl>}
    <div className="store-modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button>
      {owned ? <Button disabled={equipped || passive} onClick={onEquip}>{equipped ? "Equipped" : passive ? "Owned" : "Equip"}</Button> : balance < price ? <Button onClick={onCoins}>Get Coins</Button> : <Button onClick={onBuy}><Coins size={16} />Buy for {price.toLocaleString()}</Button>}
    </div>
    {!owned && balance < price && <p role="status">Not enough coins.</p>}
  </dialog>;
}
