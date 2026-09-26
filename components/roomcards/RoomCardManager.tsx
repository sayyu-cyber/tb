"use client";

import { Ticket, Clock } from "lucide-react";
import { useEconomy } from "@/contexts/EconomyContext";
import { ROOM_CARD_PRICES } from "@/data/cosmetics";
import type { RoomCardType } from "@/types/economy";
import { CoinGem } from "@/components/arena";

/**
 * Room Cards — the lower panel of the Inventory board
 * (design/arena/screens/app/app-03-inventory.jpg), reused whole by
 * /room-cards.
 *
 * Left: what a Room Card is, then each card you own but have not started.
 * Right: the six durations you can buy with coins. The board's `.ticket`
 * and `.rc` classes are kept as written.
 */

/** The board's labels, in its order. */
const DURATIONS: { type: RoomCardType; label: string }[] = [
  { type: "1h", label: "1-Hour" },
  { type: "3h", label: "3-Hour" },
  { type: "6h", label: "6-Hour" },
  { type: "24h", label: "24-Hour" },
  { type: "1w", label: "1-Week" },
  { type: "1m", label: "1-Month" },
];

const LABEL: Record<RoomCardType, string> = Object.fromEntries(
  DURATIONS.map(({ type, label }) => [type, label])
) as Record<RoomCardType, string>;

/** "2h 14m", or "Expired" once the clock has run out. */
function remaining(expiresAt: number | undefined) {
  if (!expiresAt) return null;
  const ms = expiresAt - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return hours ? `${hours}h ${minutes}m left` : `${minutes}m left`;
}

export default function RoomCardManager() {
  const { state, activateRoomCard, purchaseRoomCard } = useEconomy();
  const { profile, economy } = state;
  const cards = profile.roomCards ?? [];
  const idle = cards.filter((card) => !card.activated);
  const active = cards.filter((card) => card.activated && (card.expiresAt ?? 0) > Date.now());

  return (
    <section
      className="panel tick b roomcards"
      aria-label="Room Cards"
      style={{ padding: "20px", display: "grid", gridTemplateColumns: "420px minmax(0, 1fr)", gap: "22px" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div className="ph"><h2>Room Cards</h2></div>
        <p className="muted" style={{ margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
          Creating a private room requires an active Room Card &mdash; once activated, you can create
          as many rooms as you like until it expires.
        </p>

        {active.map((card) => (
          <div className="ticket" key={card.id}>
            <span className="ti" aria-hidden="true"><Clock /></span>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <b className="disp" style={{ fontSize: "17px" }}>{LABEL[card.type]} Room Card</b>
              <p className="muted2" style={{ margin: "5px 0 0" }}>Active &mdash; {remaining(card.expiresAt)}</p>
            </div>
            <span className="pill lime">Active</span>
          </div>
        ))}

        {idle.map((card) => (
          <div className="ticket" key={card.id}>
            <span className="ti" aria-hidden="true"><Ticket /></span>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <b className="disp" style={{ fontSize: "17px" }}>{LABEL[card.type]} Room Card</b>
              <p className="muted2" style={{ margin: "5px 0 0" }}>Activate to create unlimited private rooms</p>
            </div>
            <button type="button" className="ar-btn sm" onClick={() => activateRoomCard(card.id)}>
              Activate<span className="sr-only"> your {LABEL[card.type]} Room Card</span>
            </button>
          </div>
        ))}

        {active.length === 0 && idle.length === 0 && (
          <p className="muted2" style={{ margin: 0 }}>
            You don&apos;t have a Room Card yet. Buy one on the right, or earn one from the daily rewards.
          </p>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <span className="lbl dash">Buy with Coins</span>
        <div className="rc-grid">
          {DURATIONS.map(({ type, label }) => {
            const price = ROOM_CARD_PRICES[type];
            const affordable = economy.coins >= price;
            return (
              <div className="rc" key={type}>
                <b>{label}</b>
                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-display), sans-serif", fontWeight: 700 }}>
                  <CoinGem small />
                  {price.toLocaleString()}
                </span>
                <button
                  type="button"
                  className="tbtn buy"
                  onClick={() => purchaseRoomCard(type)}
                  disabled={!affordable}
                  title={affordable ? undefined : "Not enough coins"}
                  data-flat
                >
                  Buy<span className="sr-only"> a {label} Room Card for {price.toLocaleString()} coins</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
