// constants/navigation.ts
//
// Single source of truth for the app's destinations, shared by BottomNav
// (mobile: 5 primary tabs + a grouped "More" sheet) and SideNav (desktop:
// everything listed top-to-bottom in one persistent column). Previously
// this lived only inside BottomNav.tsx, so a desktop sidebar would have
// had to duplicate - and inevitably drift from - the same list.

import {
  Home,
  Gamepad2,
  Trophy,
  User,
  Settings,
  ShoppingBag,
  Target,
  Gift,
  Users,
  Flame,
  MessageCircle,
  Package,
  Layers,
  Award,
  Crown,
  Shield,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  icon: LucideIcon;
  key: string;
  href: string;
  /** Accent token for the active state. Defaults to gold. */
  accent?: string;
}

/**
 * Five primary destinations.
 *
 * The mobile bottom bar used to carry eleven items in a horizontally
 * scrolling row. At 375px that overflows by ~150px, so roughly half the
 * app's navigation sat off-screen behind a scroll gesture nobody discovers
 * on a bar that looks fixed. Five is the most that fits without scrolling;
 * the rest live in SECONDARY below.
 */
export const PRIMARY: NavItem[] = [
  { icon: Home, key: "nav_home", href: "/home" },
  { icon: Gamepad2, key: "nav_play", href: "/play", accent: "var(--lagoon)" },
  { icon: Trophy, key: "nav_leaderboard", href: "/leaderboard" },
  { icon: Users, key: "nav_friends", href: "/friends", accent: "var(--deep)" },
];

/** Everything else, grouped so it reads as sections rather than a wall. */
export const SECONDARY: { titleKey: string; items: NavItem[] }[] = [
  {
    titleKey: "nav_play",
    items: [
      { icon: Flame, key: "nav_weekend", href: "/tournament", accent: "var(--coral)" },
      { icon: Shield, key: "home_shortcutClubs", href: "/clubs", accent: "var(--deep)" },
      { icon: Award, key: "home_shortcutHof", href: "/hall-of-fame" },
      { icon: MessageCircle, key: "nav_messages", href: "/messages", accent: "var(--deep)" },
    ],
  },
  {
    titleKey: "nav_shop",
    items: [
      { icon: ShoppingBag, key: "nav_shop", href: "/shop" },
      { icon: Crown, key: "home_shortcutVip", href: "/shop", accent: "var(--orchid)" },
      { icon: Package, key: "home_shortcutInventory", href: "/inventory" },
      { icon: Layers, key: "page_collection", href: "/collection", accent: "var(--lagoon)" },
    ],
  },
  {
    titleKey: "nav_profile",
    items: [
      { icon: Target, key: "nav_missions", href: "/missions", accent: "var(--lagoon)" },
      { icon: Gift, key: "nav_rewards", href: "/rewards", accent: "var(--coral)" },
      { icon: User, key: "nav_profile", href: "/profile" },
      { icon: Settings, key: "nav_settings", href: "/settings" },
    ],
  },
];

/**
 * Exact-or-child match.
 *
 * A plain `pathname.startsWith(item.href)` lights up "Play" whenever you
 * open a player profile - /player starts with /play. This requires a path
 * separator, so /play and /play/mindi match but /player does not.
 */
export function isActiveHref(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
