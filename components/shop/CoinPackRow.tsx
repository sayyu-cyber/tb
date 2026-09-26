"use client";

import type { COIN_PACKS } from "@/data/cosmetics";
import { Pill } from "@/components/arena";

/**
 * A coin pack as a row — the ShopVip board's `.prow`
 * (design/arena/screens/app/app-12-vip-and-coin-packs.jpg).
 *
 * The same five packs the Featured tab shows as cards, listed instead: gem
 * cluster, name (with its flag inline rather than above), the amount, and
 * the request button. Rows are what the board uses wherever the whole
 * catalogue is shown, because five cards would not fit the width.
 */

/** The board's gem layouts for the row's smaller 56x44 cluster. */
const CLUSTERS: { left: number; top: number; size?: number }[][] = [
  [{ left: 17, top: 11 }],
  [{ left: 6, top: 14 }, { left: 28, top: 8 }],
  [{ left: 0, top: 16 }, { left: 17, top: 4 }, { left: 34, top: 16 }],
  [{ left: 0, top: 18 }, { left: 16, top: 4 }, { left: 32, top: 18 }, { left: 40, top: 2, size: 16 }],
  [{ left: 0, top: 18 }, { left: 16, top: 4 }, { left: 32, top: 18 }, { left: 16, top: 24, size: 18 }],
];

export function CoinPackRow({
  pack,
  index,
  disabled,
  onPurchase,
}: {
  pack: (typeof COIN_PACKS)[number];
  index: number;
  disabled: boolean;
  onPurchase: () => void;
}) {
  const cluster = CLUSTERS[Math.min(index, CLUSTERS.length - 1)];
  const highlight = pack.isBestValue ? "best" : pack.isPopular ? "pop" : "";

  return (
    <div className={`prow ${highlight}`.trim()}>
      <div className="gms" aria-hidden="true">
        {cluster.map((gem, position) => (
          <i
            key={position}
            style={{ left: gem.left, top: gem.top, ...(gem.size ? { width: gem.size, height: gem.size } : {}) }}
          />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
        <b className="disp" style={{ fontSize: "17px" }}>{pack.name}</b>
        {pack.isBestValue && <Pill tone="lime">Best Value</Pill>}
        {pack.isPopular && !pack.isBestValue && <Pill tone="blue">Popular</Pill>}
      </div>
      <b className="c">{pack.coins.toLocaleString()} <span className="muted2">coins</span></b>
      <button type="button" className="ar-btn ghost sm" disabled={disabled} onClick={onPurchase}>
        Request · MVR {pack.priceMVR}
        <span className="sr-only"> for {pack.coins.toLocaleString()} coins</span>
      </button>
    </div>
  );
}
