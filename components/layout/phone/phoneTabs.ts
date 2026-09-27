import {
  Home, Users, Gamepad2, ShoppingCart, LayoutGrid,
  BarChart3, Trophy, Shield, MessageCircle, Package, Award, Gift, Target, Medal,
  type LucideIcon,
} from "lucide-react";

/**
 * The phone's navigation, from design/arena/MOBILE.md "The phone shell".
 *
 * Five slots, not ten. The desktop rail's whole list does not fit across a
 * 390px screen, and the version that scrolled sideways through all of them
 * hid the last three behind a swipe nobody makes. So the bar carries the
 * four destinations a player actually moves between plus More, and More
 * opens a sheet with everything else - two taps to anywhere, none of it
 * hidden.
 *
 * One list feeds both shapes: the bottom bar in portrait and the 76px rail
 * when the phone is held sideways (PHome). They cannot drift apart because
 * there is nothing to keep in sync.
 */

export interface PhoneTab {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  /** The raised lime diamond in the middle of the bar. */
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

/** The More sheet's 3x3 grid, in the board's order. */
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
 * Which tab lights up for a route. MOBILE.md: every page reachable only
 * through More lights More, and Profile lights nothing - it is reached
 * from the top bar's avatar, not the bar.
 */
const UNDER_MORE = MORE_TILES.map((tile) => tile.href).concat("/settings", "/collection", "/room-cards");

export function activeTab(pathname: string): string | null {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path.startsWith("/profile") || path.startsWith("/player")) return null;
  if (UNDER_MORE.some((href) => path === href || path.startsWith(href + "/"))) return "#more";
  const direct = PHONE_TABS.find((tab) => tab.href !== "#more" && (path === tab.href || path.startsWith(tab.href + "/")));
  return direct?.href ?? null;
}
