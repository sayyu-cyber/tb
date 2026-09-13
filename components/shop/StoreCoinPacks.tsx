"use client";
import { Coins } from "lucide-react";
import { COIN_PACKS } from "@/data/cosmetics";

export function CoinPackCard({ pack, disabled, onPurchase }: { pack: typeof COIN_PACKS[number]; disabled: boolean; onPurchase: () => void }) {
  return <article className="store-coin-card"><div className="store-coin-art" aria-hidden="true"><Coins size={45} /></div><div><h3>{pack.name}</h3><strong>{pack.coins.toLocaleString()} coins</strong><button disabled={disabled} onClick={onPurchase}>Request · MVR {pack.priceMVR}</button></div>{(pack.isBestValue || pack.isPopular) && <span>{pack.isBestValue ? "BEST VALUE" : "POPULAR"}</span>}</article>;
}
