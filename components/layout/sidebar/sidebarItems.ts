import {
  Home,
  Gamepad2,
  Users,
  BarChart3,
  Package,
  ShoppingCart,
  Shield,
  Trophy,
  Award,
  Settings,
  type LucideIcon,
} from "lucide-react";

/**
 * The sidebar's destination list - one source of truth shared by the
 * collapsed rail and the expanded panel, so the two can never drift out of
 * order or out of sync.
 *
 * Every href here is an existing route under app/ (verified: /home, /play,
 * /friends, /leaderboard, /inventory, /shop, /clubs, /tournament,
 * /achievements, /settings). Nothing in this file invents a destination -
 * a nav that renders a dead link is worse than one that omits the section.
 *
 * Labels are i18n keys rather than strings, reusing the dictionary entries
 * the rest of the app already ships (lib/i18n.ts) so the sidebar translates
 * along with everything else instead of pinning four languages to English.
 */
export interface SidebarItem {
  href: string;
  /** Key into lib/i18n.ts - resolved through useTranslation() at render. */
  labelKey: string;
  icon: LucideIcon;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { href: "/home", labelKey: "nav_home", icon: Home },
  { href: "/play", labelKey: "nav_play", icon: Gamepad2 },
  { href: "/friends", labelKey: "nav_friends", icon: Users },
  { href: "/leaderboard", labelKey: "nav_leaderboard", icon: BarChart3 },
  { href: "/inventory", labelKey: "page_inventory", icon: Package },
  { href: "/shop", labelKey: "nav_shop", icon: ShoppingCart },
  { href: "/clubs", labelKey: "page_clubs", icon: Shield },
  { href: "/tournament", labelKey: "nav_tournaments", icon: Trophy },
  { href: "/achievements", labelKey: "page_achievements", icon: Award },
  { href: "/settings", labelKey: "nav_settings", icon: Settings },
];

/** Where the VIP promo sends people. /shop is the real, existing VIP
 *  purchase surface (see the VIP strip in the storefront) - there is no
 *  separate /vip route, and pointing at one would be a dead link. */
export const VIP_HREF = "/shop";
/** Online-players widget target: the Friends hub lists them for real. */
export const ONLINE_HREF = "/friends";
/** Active-chats widget target: the DM list. */
export const CHATS_HREF = "/messages";
