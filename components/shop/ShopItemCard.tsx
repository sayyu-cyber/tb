"use client";
import { Eye, Check, Coins, Crown } from "lucide-react";
import { CosmeticItem } from "@/types/economy";
import { RARITY_COLORS } from "@/data/cosmetics";
import { CosmeticPreview } from "@/components/ui/CosmeticPreview";

export function ShopItemCard({ item, isOwned, isFeatured, isEquipped, price, onPurchase, onEquip, onPreview }: {
  item: CosmeticItem; isOwned: boolean; isFeatured?: boolean; isEquipped: boolean;
  price: number; onPurchase: () => void; onEquip: () => void; onPreview: () => void;
}) {
  const passive = item.category === "emote" || item.category === "sticker";
  return <article className="store-item" style={{ "--rarity": RARITY_COLORS[item.rarity] } as React.CSSProperties}>
    <div className="store-item-art">
      <CosmeticPreview item={item} />
      {isFeatured && <span className="store-featured-label">FEATURED</span>}
      {item.isVipExclusive && <span className="store-vip-label"><Crown size={13} />VIP</span>}
      <button className="store-preview-button" aria-label={"Preview " + item.name} title="Preview item" onClick={onPreview}><Eye size={19} /></button>
    </div>
    <div className="store-item-info"><h3>{item.name}</h3><span className="store-rarity">{item.rarity}</span><p>{item.description}</p>
      <button className={isEquipped ? "store-equipped" : isOwned ? "store-equip" : "store-buy"} onClick={isOwned ? onEquip : onPurchase} disabled={isEquipped || (isOwned && passive)}>
        {isEquipped ? <><Check size={15} />Equipped</> : isOwned ? (passive ? "Owned" : "Equip") : <><Coins size={16} />{price.toLocaleString()}</>}
      </button>
    </div>
  </article>;
}
