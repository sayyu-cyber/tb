"use client";

import type { COIN_PACKS } from "@/data/cosmetics";
import { Pill } from "@/components/arena";
import { formatCoins } from "@/lib/wallet";

/**
 * A coin pack — the Shop board's `.pack`
 * (design/arena/screens/app/app-11-shop.jpg).
 *
 * The gem cluster grows with the pack: one gem for the starter, two, three,
 * then four with the last one larger. Those are the board's own positions.
 * The flag above the card is Popular (blue) or Best Value (lime), from the
 * pack's own isPopular / isBestValue.
 */

/** The board's gem layouts, smallest pack to largest. */
const CLUSTERS: { left: number; top: number; size?: number }[][] = [
  [{ left: 30, top: 14 }],
  [{ left: 16, top: 18 }, { left: 44, top: 10 }],
  [{ left: 6, top: 22 }, { left: 30, top: 6 }, { left: 54, top: 22 }],
  [{ left: 0, top: 24 }, { left: 22, top: 6 }, { left: 44, top: 24 }, { left: 60, top: 4, size: 22 }],
];

export function CoinPackCard({
  pack,
  index,
  disabled,
  onPurchase,
}: {
  pack: (typeof COIN_PACKS)[number];
  /** Which gem cluster to draw. Clamped to the four the board defines. */
  index: number;
  disabled: boolean;
  onPurchase: () => void;
}) {
  const cluster = CLUSTERS[Math.min(index, CLUSTERS.length - 1)];
  const highlight = pack.isBestValue ? "best" : pack.isPopular ? "pop" : "";
  // The board gives the popular pack the blue button and the best-value
  // pack the lime one; the rest are ghosts.
  const button = pack.isBestValue ? "ar-btn sm" : pack.isPopular ? "ar-btn blue sm" : "ar-btn ghost sm";

  return (
    <div className={`pack ${highlight}`.trim()}>
      {pack.isBestValue && <Pill tone="lime" className="flag">Best Value</Pill>}
      {pack.isPopular && !pack.isBestValue && <Pill tone="blue" className="flag">Popular</Pill>}
      <div className="gems" aria-hidden="true">
        {cluster.map((gem, position) => (
          <i
            key={position}
            style={{ left: gem.left, top: gem.top, ...(gem.size ? { width: gem.size, height: gem.size } : {}) }}
          />
        ))}
      </div>
      <span className="lbl">{pack.name}</span>
      <b className="amt">{formatCoins(pack.coins)} coins</b>
      <button type="button" className={button} style={{ width: "100%" }} disabled={disabled} onClick={onPurchase}>
        Request · MVR {pack.priceMVR}
        <span className="sr-only"> for {formatCoins(pack.coins)} coins</span>
      </button>
    </div>
  );
}
