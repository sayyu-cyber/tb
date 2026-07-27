// lib/admin.ts
//
// Admin panel access + shared config documents (GDD "Add an admin panel -
// to control everything"). There's no backend server in this app, so the
// REAL access control is entirely in firestore.rules, keyed on the signed-in
// user's auth token email matching one of ADMIN_EMAILS - this file's
// isAdminEmail() is only a client-side convenience for showing/hiding the
// admin UI, not the security boundary itself.
//
// Scope note (see PROGRESS.md for the full writeup): a "reset leaderboard"
// or "reset season" that actually rewrites every player's trophies at scale
// isn't something a client-only app can safely do (that's thousands of
// individual writes with no batch/transaction spanning them, and no way to
// guarantee it completes if the admin closes the tab mid-reset) - that
// needs a real Cloud Function. What's implemented here is the part that
// genuinely works from a client: config overrides (season number, mission
// rewards, ranked rewards, shop prices/visibility) and additive manual
// entries (Hall of Fame), not bulk rewrites of player data.

import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const ADMIN_EMAILS = ["sayyu9898@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

const CONFIG_COLLECTION = "appConfig";

export interface SeasonOverride {
  seasonNumber: number;
  startedAt: number;
}

export interface ShopOverrides {
  priceOverrides: Record<string, number>;
  hiddenItemIds: string[];
}

export interface MissionRewardOverrides {
  dailyRewards: Record<string, number>;
  weeklyRewards: Record<string, number>;
}

export interface RankRewardOverrides {
  weeklyRewards: Record<string, number>; // keyed by RankTier
}

async function getConfigDoc<T>(id: string): Promise<T | null> {
  const snap = await getDoc(doc(db, CONFIG_COLLECTION, id));
  return snap.exists() ? (snap.data() as T) : null;
}

function watchConfigDoc<T>(id: string, onUpdate: (data: T | null) => void): Unsubscribe {
  return onSnapshot(doc(db, CONFIG_COLLECTION, id), (snap) => {
    onUpdate(snap.exists() ? (snap.data() as T) : null);
  });
}

export const getSeasonOverride = () => getConfigDoc<SeasonOverride>("season");
export const watchSeasonOverride = (cb: (d: SeasonOverride | null) => void) => watchConfigDoc<SeasonOverride>("season", cb);
// A seasonNumber of 0 is treated by useSeasonInfo as "no override" - the
// admin panel's "Reset to automatic" button writes exactly that instead of
// deleting the doc, so the override doc's shape stays predictable.
export const setSeasonOverride = (data: SeasonOverride) => setDoc(doc(db, CONFIG_COLLECTION, "season"), data);

export const getShopOverrides = () => getConfigDoc<ShopOverrides>("shopOverrides");
export const watchShopOverrides = (cb: (d: ShopOverrides | null) => void) => watchConfigDoc<ShopOverrides>("shopOverrides", cb);
export const setShopOverrides = (data: ShopOverrides) => setDoc(doc(db, CONFIG_COLLECTION, "shopOverrides"), data);

export const getMissionRewardOverrides = () => getConfigDoc<MissionRewardOverrides>("missionRewards");
export const watchMissionRewardOverrides = (cb: (d: MissionRewardOverrides | null) => void) =>
  watchConfigDoc<MissionRewardOverrides>("missionRewards", cb);
export const setMissionRewardOverrides = (data: MissionRewardOverrides) =>
  setDoc(doc(db, CONFIG_COLLECTION, "missionRewards"), data);

export const getRankRewardOverrides = () => getConfigDoc<RankRewardOverrides>("rankRewards");
export const watchRankRewardOverrides = (cb: (d: RankRewardOverrides | null) => void) =>
  watchConfigDoc<RankRewardOverrides>("rankRewards", cb);
export const setRankRewardOverrides = (data: RankRewardOverrides) => setDoc(doc(db, CONFIG_COLLECTION, "rankRewards"), data);
