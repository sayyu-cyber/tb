import {
  Home, Users, Gamepad2, ShoppingCart, LayoutGrid,
  BarChart3, Trophy, Shield, MessageCircle, Package, Award, Gift, Target, Medal,
  type LucideIcon,
} from "lucide-react";

/**
 * The phone's navigation, from design/arena/LANDSCAPE.md "The shell".
 *
 * The phone runs in landscape only, and its navigation is the 76px rail
 * down the left: four destinations a player actually moves between plus
 * More, which opens a side panel with everything else - two taps to
 * anywhere, none of it hidden.
 */

export interface PhoneTab {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  /** The raised lime diamond in the middle of the rail. */
  play?: boolean;
  /** Which count sits on it, if any. */
  badge?: "friendRequests";
}

export const PHONE_TABS: PhoneTab[] = [
  { href: "/home", labelKey: "nav_home", icon: Home },
  { href: "/friends", labelKey: "nav_friends", icon: Users, badge: "friendRequests" },
  { href: "/play", labelKey: "nav_play", icon: Gamepad2, play: true },
  { href: "/shop", labelKey: "nav_shop", icon: ShoppingCart },
  { href: "#more", labelKey: "nav_more", icon: LayoutGrid },
];

export interface MoreTile {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  /** The lime "live" pip, for the Weekend League while it is running. */
  live?: boolean;
  badge?: "unreadMessages";
}

/** The More panel's 3x3 Explore grid, in the LMore board's order. */
export const MORE_TILES: MoreTile[] = [
  { href: "/leaderboard", labelKey: "nav_leaderboard", icon: BarChart3 },
  { href: "/tournament", labelKey: "page_weekendLeague", icon: Trophy, live: true },
  { href: "/clubs", labelKey: "nav_clubs", icon: Shield },
  { href: "/messages", labelKey: "page_messages", icon: MessageCircle, badge: "unreadMessages" },
  { href: "/inventory", labelKey: "nav_inventory", icon: Package },
  { href: "/achievements", labelKey: "page_achievements", icon: Award },
  { href: "/rewards", labelKey: "page_dailyRewards", icon: Gift },
  { href: "/missions", labelKey: "page_missions", icon: Target },
  { href: "/hall-of-fame", labelKey: "page_hallOfFame", icon: Medal },
];

/**
 * Which rail slot lights up for a route. LANDSCAPE.md: pages reached from
 * More light More, and Profile lights none - it is reached from the top
 * bar's avatar, not the rail. Home, Friends and Shop light themselves.
 */
const UNDER_MORE = MORE_TILES.map((tile) => tile.href).concat("/settings", "/collection", "/room-cards");

export function activeTab(pathname: string): string | null {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path.startsWith("/profile") || path.startsWith("/player")) return null;
  if (UNDER_MORE.some((href) => path === href || path.startsWith(href + "/"))) return "#more";
  const direct = PHONE_TABS.find((tab) => tab.href !== "#more" && (path === tab.href || path.startsWith(tab.href + "/")));
  return direct?.href ?? null;
}

/**
 * The 52px top bar comes in three kinds (LANDSCAPE.md "The shell"):
 *   home  the wordmark, on Home only
 *   page  a small lime dashed label over the page name in chrome
 *   back  a back button and a title, for a drill-down
 * The right side - coins, the bell and your avatar - is the same on all.
 */
export type TopBar =
  | { kind: "home" }
  | { kind: "page"; labelKey?: string; label?: string; titleKey: string }
  | { kind: "back"; titleKey?: string; title?: string; backHref: string };

/** Each page's bar, word for word from its L* board's `.mtop`. */
const PAGE_BARS: Array<[prefix: string, bar: TopBar]> = [
  ["/home", { kind: "home" }],
  ["/profile", { kind: "page", labelKey: "ltop_profile", titleKey: "nav_profile" }],
  ["/inventory", { kind: "page", labelKey: "ltop_inventory", titleKey: "page_inventory" }],
  ["/collection", { kind: "page", labelKey: "ltop_inventory", titleKey: "page_inventory" }],
  ["/room-cards", { kind: "page", labelKey: "ltop_inventory", titleKey: "page_inventory" }],
  ["/friends", { kind: "page", labelKey: "ltop_friends", titleKey: "page_friends" }],
  ["/messages", { kind: "page", labelKey: "ltop_messages", titleKey: "page_messages" }],
  ["/clubs", { kind: "page", labelKey: "ltop_clubs", titleKey: "page_clubs" }],
  ["/leaderboard", { kind: "page", labelKey: "ltop_leaderboard", titleKey: "page_leaderboard" }],
  ["/achievements", { kind: "page", labelKey: "ltop_achievements", titleKey: "page_achievements" }],
  ["/tournament", { kind: "page", labelKey: "ltop_league", titleKey: "page_weekendLeague" }],
  ["/hall-of-fame", { kind: "page", labelKey: "ltop_hallOfFame", titleKey: "page_hallOfFame" }],
  ["/shop", { kind: "page", labelKey: "ltop_shop", titleKey: "page_shop" }],
  ["/rewards", { kind: "page", labelKey: "ltop_rewards", titleKey: "page_dailyRewards" }],
  ["/missions", { kind: "page", labelKey: "ltop_rewards", titleKey: "page_dailyRewards" }],
  // The board's label here is the brand, which is a name, not a string.
  ["/settings", { kind: "page", label: "Thaasbai", titleKey: "settings_title" }],
];

export function topBarFor(pathname: string): TopBar | null {
  const path = pathname.replace(/\/$/, "") || "/";
  const hit = PAGE_BARS.find(([prefix]) => path === prefix || path.startsWith(prefix + "/"));
  return hit ? hit[1] : null;
}
