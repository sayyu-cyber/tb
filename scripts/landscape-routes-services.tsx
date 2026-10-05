// Isolated component-test services. Never imported by application code.
import React from "react";
// '@/lib/i18n' is real here; the dictionary gives the shell its words.
import { translate } from "@/lib/i18n";

/**
 * Stand-ins for the routes without a board (scripts/check-landscape-routes.cjs).
 *
 * A signed-in player - Sayyu, Gold on 58 trophies, 1,240 coins - and a
 * catch-all Supabase client: every query resolves empty and every channel
 * subscribes to nothing, so the real libraries run without a network and
 * each screen shows its no-data state. The route comes from ?route=.
 *
 * Query flags: ?route=<path>, ?guest, ?admin, ?full.
 */
const params = () => new URLSearchParams(typeof location === "undefined" ? "" : location.search);
export const ROUTE = () => params().get("route") || "/home";
/** A flag on the page's URL or on the route's own query. */
const flag = (name: string) => params().has(name) || new URLSearchParams(ROUTE().split("?")[1] || "").has(name);

const ME = "test-self";
const user = {
  uid: ME, id: ME, displayName: "Sayyu", email: flag("admin") ? "sayyu9898@gmail.com" : "sayyu@gmail.com",
  photoURL: null, isGuest: flag("guest"),
};

export const useAuth = () => ({
  user, loading: false, isGuest: flag("guest"), accountBusy: false, accountCompletion: null,
  playerStats: { trophies: 58, currentRank: "Gold", highestRank: "Gold", wins: 54, losses: 42, totalMatches: 96, playerCode: "K7M4QRT" },
  profileLoading: false, profileError: false, retryProfile: () => {}, logout: async () => {}, clearAccountCompletion: () => {},
  updatePlayerProfile: async () => {},
});
export const AuthProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export const useEconomy = () => ({
  state: {
    economy: { coins: 1240 },
    profile: {
      vip: { active: false, remainingDays: 0 }, rank: "Gold", roomCards: [],
      stats: { matchesWon: 54, highestRank: "Gold", weekendChampion: false },
      collection: { cardBacks: ["cb_arena"], tableThemes: ["tt_default"], profileFrames: [], emotes: [], victoryAnimations: [], stickers: [], banners: [] },
      equipped: { cardBack: "cb_arena", tableTheme: "tt_default", profileFrame: "", victoryAnimation: "", banner: "" },
    },
    achievements: [], missions: { daily: [], weekly: [], dailyAllBonus: 50 },
    dailyLogin: { streak: 1, rewards: [] }, shopOverrides: { priceOverrides: {}, hiddenItemIds: [] },
  },
  balanceReady: true, refreshBalance: async () => {}, purchaseCosmetic: async () => false, equipCosmetic: async () => false,
  processMatchEnd: () => {}, showReward: () => {}, clearReward: () => {}, updateProgress: () => {},
  getActiveRoomCards: () => [], getAvailableRoomCards: () => [], getOwnedCosmetics: () => [], isCosmeticOwned: () => false,
  getCollectionProgress: () => ({ total: 56, owned: 2, percentage: 4 }), claimDailyReward: async () => false, purchaseRoomCard: async () => false,
  activateRoomCard: () => {}, spendCoins: async () => false, dispatch: () => {},
});

export const useToast = () => ({ showToast: (message: string) => { document.body.dataset.toast = message; } });
export const useSettings = () => ({ settings: { music: false, language: "en", notifications: false, sound: false }, updateSettings: () => {} });
export const useHomeSocial = () => ({ friends: [], requests: [], chats: [], online: [], profiles: {}, loading: false, error: false, retry: () => {} });
export const HomeSocialProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const useTranslation = () => (key: string) => translate(key, "en");

export const usePathname = () => ROUTE().split("?")[0];
export const useSearchParams = () => new URLSearchParams(ROUTE().split("?")[1] || "");
export const useRouter = () => ({ push: (url: string) => { document.body.dataset.destination = url; }, replace: (url: string) => { document.body.dataset.destination = url; }, back: () => {}, prefetch: () => {} });

export default function Link({ href, children, prefetch: _prefetch, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) {
  return <a href={href} {...props}>{children}</a>;
}

/** Any chain of calls, awaited, is an empty result; a channel subscribes to nothing. */
function nothing(): unknown {
  const target = function () { /* callable */ };
  return new Proxy(target, {
    get(_target, prop) {
      if (prop === "then") return (resolve?: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null, count: 0 }).then(resolve, reject);
      if (prop === "unsubscribe") return () => {};
      return nothing();
    },
    apply() { return nothing(); },
  });
}
/** The one answer that is not empty: a finished Mindi match for the result
 *  screen (?route=/play/post-match?m=test), won - or lost with ?lost. */
function rpc(name: string) {
  if (name !== "get_match_view" || !params().has("m") && !ROUTE().includes("m=")) return nothing();
  const match = { id: "test", gameType: "mindi", players: [ME, "a", "b", "c"], status: "completed", state: { outcome: { winner: flag("lost") ? "B" : "A" } } };
  return Promise.resolve({ data: match, error: null });
}
export const getSupabaseBrowserClient = () => new Proxy({}, { get: (_target, prop) => (prop === "rpc" ? rpc : (nothing() as Record<string | symbol, unknown>)[prop]) });

/** A ranked-duo party (?route=/play/mindi/ranked-duo?code=K7M4QR): you,
 *  and with ?full your partner too. Every other room call is the real one. */
export * from "../lib/rooms";
export function watchRoom(code: string, onUpdate: (room: import("../lib/rooms").RoomDoc | null) => void) {
  const players = flag("full") ? [ME, "nashid"] : [ME];
  onUpdate({
    code, gameType: "mindi", ownerUid: ME, password: false, maxPlayers: 2, players,
    playerNames: { [ME]: "Sayyu", nashid: "Nashid" }, status: "waiting", matchId: null, createdAt: Date.now(), mode: "rankedDuo",
  });
  return () => {};
}
