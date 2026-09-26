import React, { useState } from "react";
import { ACHIEVEMENTS, ROOM_CARD_PRICES } from "@/data/cosmetics";
import type { RoomCardType } from "@/types/economy";

/**
 * Stand-ins for what Inventory, Collection and Room Cards read.
 *
 * The collection is the Inventory board's own
 * (design/arena/boards/Inventory.dc.html): Card Backs 4/13, Tables 2/10,
 * Frames 2/9, Emotes 2/8, Victory 1/5, Stickers 2/5, Banners 2/6 - fifteen
 * of fifty-six, which is the "15 / 56 collected" the board's header shows.
 * Equipped is the board's Loadout: Arena, Neon Arena, Simple Border,
 * Classic Clap, Classic Navy. Coins are the board's 1,240.
 *
 * Query flags: ?broke (no coins), ?vip, ?noroom (no Room Cards),
 * ?activeroom (one already running).
 */

const flag = (name: string) => typeof location !== "undefined" && location.search.includes(name);

const hour = 3_600_000;

export function useAuth() {
  return { user: { uid: "test-inv", displayName: "Sayyu", photoURL: null }, isGuest: false, playerStats: null };
}

export function useEconomy() {
  const [collection, setCollection] = useState({
    cardBacks: ["cb_arena", "cb_default", "cb_maldives", "cb_ocean"],
    tableThemes: ["tt_default", "tt_midnight"],
    profileFrames: ["pf_default", "pf_gold"],
    emotes: ["em_thumbs", "em_laugh"],
    victoryAnimations: ["va_default"],
    stickers: ["st_gg", "st_nice"],
    banners: ["bn_default", "bn_maldives_wave"],
  });
  const [equipped, setEquipped] = useState({
    cardBack: "cb_arena",
    tableTheme: "tt_default",
    profileFrame: "pf_default",
    title: "Novice",
    victoryAnimation: "va_default",
    banner: "bn_default",
  });
  const [roomCards, setRoomCards] = useState(
    flag("noroom") ? []
      : flag("activeroom")
        ? [{ id: "rc-a", type: "3h" as RoomCardType, duration: 3, activated: true, activatedAt: Date.now(), expiresAt: Date.now() + 2 * hour }]
        : [{ id: "rc-1", type: "1h" as RoomCardType, duration: 1, activated: false }]
  );

  return {
    state: {
      achievements: ACHIEVEMENTS,
      economy: { coins: flag("broke") ? 0 : 1240 },
      profile: {
        vip: { active: flag("vip") },
        equipped,
        collection,
        roomCards,
        stats: { matchesWon: 54, highestRank: "Gold", weekendChampion: false },
      },
    },
    equipCosmetic: (category: string, itemId: string) => {
      setEquipped(current => ({ ...current, [category]: itemId }));
      document.body.dataset.equipped = `${category}:${itemId}`;
    },
    purchaseCosmetic: (itemId: string) => {
      document.body.dataset.bought = itemId;
      setCollection(current => ({ ...current, cardBacks: [...current.cardBacks, itemId] }));
      return true;
    },
    purchaseRoomCard: (type: RoomCardType) => {
      document.body.dataset.boughtroom = `${type}:${ROOM_CARD_PRICES[type]}`;
      return true;
    },
    activateRoomCard: (cardId: string) => {
      document.body.dataset.activated = cardId;
      setRoomCards(current => current.map(card => card.id === cardId
        ? { ...card, activated: true, activatedAt: Date.now(), expiresAt: Date.now() + card.duration * hour }
        : card));
    },
  };
}

export const useTranslation = () => (key: string) => ({
  page_inventory: "Inventory",
  page_roomCards: "Room Cards",
  page_collection: "Collection",
  inventory_cosmetics: "Cosmetics",
  inventory_roomCards: "Room Cards",
  inv_cardBacks: "Card Backs",
  inv_tables: "Tables",
  inv_frames: "Frames",
  inv_emotes: "Emotes",
  inv_victory: "Victory",
  inv_stickers: "Stickers",
  inv_banners: "Banners",
  collection_cardBacks: "Card Backs",
  collection_tableThemes: "Tables",
  collection_profileFrames: "Frames",
  collection_emotes: "Emotes",
  collection_victoryAnimations: "Victory",
  collection_collected: "/ {total} collected",
}[key] || key);

export default function Link({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={href} {...props}>{children}</a>;
}
