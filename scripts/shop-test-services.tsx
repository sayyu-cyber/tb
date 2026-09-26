import { useSyncExternalStore } from "react";

/**
 * Stand-ins for what the Shop reads.
 *
 * The balance is the Shop board's own 1,240 (design/arena/boards/Shop.dc.html),
 * which is what makes both dialog states reachable from the same fixture:
 * Fireworks at 1,000 can be afforded, Crown Jewel at 2,500 cannot - the two
 * states app-11b and app-11c draw.
 *
 * Query flags: ?poor (no coins), ?vip, ?owned (Fireworks already owned).
 */

const flag = (name: string) => typeof location !== "undefined" && location.search.includes(name);

let state = {
  economy: { coins: flag("poor") ? 0 : 1240 },
  profile: {
    coins: flag("poor") ? 0 : 1240,
    vip: { active: flag("vip"), remainingDays: 7 },
    collection: { items: flag("owned") ? ["cb_default", "va_fireworks"] : ["cb_default"] },
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

export function useAuth() { return { user: { uid: "shop-test", displayName: "Sayyu" }, isGuest: false }; }
export function useSettings() { return { settings: { language: "en" } }; }
export function useToast() { return { showToast: (message: string) => { document.body.dataset.toast = message; } }; }
export function watchMyTopups(uid: string, callback: (items: unknown[]) => void) { callback([]); return () => {}; }
export async function requestCoinTopup() { throw new Error("Test prevents real purchases"); }
