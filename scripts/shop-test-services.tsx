import { useSyncExternalStore } from "react";
import { translate } from "@/lib/i18n";
import { ALL_COSMETICS } from "@/data/cosmetics";
import * as rotation from "../lib/cosmeticRotation";

/**
 * Stand-ins for what the Shop reads.
 *
 * The balance is the Shop board's own 1,240 (design/arena/boards/Shop.dc.html),
 * which is what makes both dialog states reachable from the same fixture:
 * Fireworks at 1,000 can be afforded, Crown Jewel at 2,500 cannot - the two
 * states app-11b and app-11c draw.
 *
 * Query flags: ?poor (no coins), ?vip, ?owned (Fireworks already owned),
 * ?pending (a top-up waiting on an admin), ?board (the landscape boards'
 * featured week - Neon Cyber, Sapphire Blue (owned), Crown Jewel,
 * Celebrate, Fireworks, Golden Mindi - in place of this week's rotation).
 */

const flag = (name: string) => typeof location !== "undefined" && location.search.includes(name);

let state = {
  economy: { coins: flag("poor") ? 0 : 1240 },
  profile: {
    coins: flag("poor") ? 0 : 1240,
    vip: { active: flag("vip"), remainingDays: 7 },
    collection: { items: flag("owned") ? ["cb_default", "va_fireworks"] : flag("board") ? ["cb_default", "tt_blue"] : ["cb_default"] },
    equipped: { cardBack: "cb_default", tableTheme: "tt_default", profileFrame: "", victoryAnimation: "", banner: "" },
  },
  shopOverrides: { priceOverrides: {}, hiddenItemIds: [] },
};

const listeners = new Set<() => void>();
function emit() { listeners.forEach(fn => fn()); }

export function useEconomy() {
  const snapshot = useSyncExternalStore(fn => { listeners.add(fn); return () => listeners.delete(fn); }, () => state);
  return {
    state: snapshot,
    purchaseCosmetic: (id: string) => {
      document.body.dataset.bought = id;
      state = { ...state, profile: { ...state.profile, collection: { items: [...state.profile.collection.items, id] } } };
      emit();
      return true;
    },
    equipCosmetic: (category: string, id: string) => {
      document.body.dataset.equipped = `${category}:${id}`;
      state = { ...state, profile: { ...state.profile, equipped: { ...state.profile.equipped, [category]: id } } };
      emit();
    },
    activateVip: (days: number) => { document.body.dataset.vip = String(days); },
  };
}

export function useAuth() { return { user: { uid: "shop-test", displayName: "Sayyu" }, isGuest: false, playerStats: { currentRank: "Gold", trophies: 58 } }; }
/** What else the phone shell reads: the route, and the real English strings. */
export const usePathname = () => "/shop";
export const useRouter = () => ({ push: (url: string) => { document.body.dataset.destination = url; }, replace: () => {}, back: () => {}, prefetch: () => {} });
export const useTranslation = () => (key: string) => translate(key, "en");

const BOARD_WEEK = ["cb_neon", "tt_blue", "pf_crown", "em_celebrate", "va_fireworks", "st_mindi_gold"];
export const getRotationWeekNumber = rotation.getRotationWeekNumber;
export function getWeeklyFeaturedRotation(count = 6, date?: Date) {
  if (!flag("board")) return rotation.getWeeklyFeaturedRotation(count, date);
  return BOARD_WEEK.map(id => ALL_COSMETICS.find(item => item.id === id)!).slice(0, count);
}
export function useSettings() { return { settings: { language: "en" } }; }
export function useToast() { return { showToast: (message: string) => { document.body.dataset.toast = message; } }; }
/** ?pending puts a Standard Pack request in flight, as the VIP board shows. */
export function watchMyTopups(uid: string, callback: (items: unknown[]) => void) {
  callback(flag("pending")
    ? [{ id: "tp-1", status: "pending", packName: "Standard Pack", coins: 1500, priceMVR: 100 }]
    : []);
  return () => {};
}
export async function requestCoinTopup() { throw new Error("Test prevents real purchases"); }
