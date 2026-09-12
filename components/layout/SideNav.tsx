"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  LogOut,
  Menu,
  X,
  Home,
  Gamepad2,
  Trophy,
  Flame,
  Users,
  KeyRound,
  ShoppingBag,
  Package,
  Shield,
  Crown,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isActiveHref } from "@/constants/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { RankBadge } from "@/components/ui/RankBadge";
import { SPRING } from "@/lib/motion";

/**
 * Desktop navigation for the gaming hub (Home/Play), collapsed by default:
 * a slim icon-only rail that expands into a full labeled sheet when its top
 * toggle is pressed, and collapses again on a second press, a backdrop
 * click, or Escape.
 *
 * Unlike the previous version, this list is the whole hub in one place -
 * Home, Games, Ranked, Weekend League, Leaderboard, Friends, Private Rooms,
 * Shop, Inventory, Clubs and VIP Pass - rather than deliberately excluding
 * the primary tabs BottomNav already carries. That old split made sense for
 * a plain content sidebar; a game-launcher-style rail is expected to be a
 * complete map of the platform on its own. BottomNav is untouched and still
 * carries the same five items + More for mobile.
 */

const RAIL_WIDTH = "w-14";
const SHEET_WIDTH = "w-72";

interface HubItem {
  icon: LucideIcon;
  key: string;
  href: string;
  accent: string;
}

const HUB_ITEMS: HubItem[] = [
  { icon: Home, key: "nav_home", href: "/home", accent: "var(--gold)" },
  { icon: Gamepad2, key: "nav_games", href: "/play", accent: "var(--lagoon)" },
  { icon: Trophy, key: "nav_ranked", href: "/play/mindi/ranked", accent: "var(--deep)" },
  { icon: Flame, key: "nav_weekend", href: "/tournament", accent: "var(--coral)" },
  { icon: Trophy, key: "nav_leaderboard", href: "/leaderboard", accent: "var(--gold)" },
  { icon: Users, key: "nav_friends", href: "/friends", accent: "var(--deep)" },
  { icon: KeyRound, key: "gamesel_privateRoom", href: "/play/mindi/room", accent: "var(--orchid)" },
  { icon: ShoppingBag, key: "nav_shop", href: "/shop", accent: "var(--gold)" },
  { icon: Package, key: "home_shortcutInventory", href: "/inventory", accent: "var(--lagoon)" },
  { icon: Shield, key: "home_shortcutClubs", href: "/clubs", accent: "var(--deep)" },
];

/** Small wordmark shared by the rail (glyph only) and the expanded sheet
 *  (glyph + "THAASBAI"). A crown-in-a-spade mark rather than an uploaded
 *  logo file, since there isn't one in the repo yet - built from the same
 *  suit glyph the games already use, so it doesn't introduce a fourth
 *  visual language. */
function Wordmark({ expanded }: { expanded?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                   bg-gradient-to-br from-[rgb(var(--gold-bright))] to-[rgb(var(--gold-deep))]
                   font-serif text-base font-black text-[#0C0E12] shadow-[0_0_16px_-2px_rgb(var(--gold)/60%)]"
      >
        ♠
      </span>
      {expanded && (
        <span className="gold-text-gradient text-lg font-black tracking-widest">THAASBAI</span>
      )}
    </div>
  );
}

function CollapsedRow({ item, active }: { item: HubItem; active: boolean }) {
  const t = useTranslation();

  return (
    <Link
      href={item.href}
      prefetch
      aria-label={t(item.key)}
      title={t(item.key)}
      style={{ ["--accent" as string]: item.accent } as React.CSSProperties}
      className="relative flex h-11 w-11 items-center justify-center rounded-xl"
    >
      {active && (
        <motion.span
          layoutId="sideNavActiveCollapsed"
          transition={SPRING}
          className="absolute inset-0 rounded-xl bg-[rgb(var(--accent)/16%)] border border-[rgb(var(--accent)/55%)]
                     shadow-[0_0_18px_-3px_rgb(var(--accent)/70%)]"
        />
      )}
      <item.icon
        size={18}
        strokeWidth={active ? 2.4 : 1.75}
        className={cn("relative z-10", active ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--c4))]")}
        aria-hidden="true"
      />
    </Link>
  );
}

function ExpandedRow({ item, active, onNavigate }: { item: HubItem; active: boolean; onNavigate: () => void }) {
  const t = useTranslation();

  return (
    <Link
      href={item.href}
      prefetch
      onClick={onNavigate}
      style={{ ["--accent" as string]: item.accent } as React.CSSProperties}
      className="relative flex items-center gap-3 rounded-xl px-3 py-2.5"
    >
      {active && (
        <motion.span
          layoutId="sideNavActiveExpanded"
          transition={SPRING}
          className="absolute inset-0 rounded-xl bg-[rgb(var(--accent)/14%)] border border-[rgb(var(--accent)/50%)]
                     shadow-[0_0_20px_-4px_rgb(var(--accent)/65%)]"
        />
      )}
      <item.icon
        size={18}
        strokeWidth={active ? 2.4 : 1.75}
        className={cn("relative z-10 shrink-0", active ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--c4))]")}
        aria-hidden="true"
      />
      <span
        className={cn(
          "relative z-10 text-[13px] truncate",
          active ? "font-bold text-[rgb(var(--text-primary))]" : "font-medium text-[rgb(var(--c5))]"
        )}
      >
        {t(item.key)}
      </span>
      {active && (
        <span
          aria-hidden="true"
          className="relative z-10 ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--accent))]"
        />
      )}
    </Link>
  );
}

/** Avatar-only identity, for the collapsed rail. Real rank ring colour
 *  aside, this deliberately shows no fabricated level or online-friends
 *  count - see the full IdentityCard below for the reasoning. */
function IdentityAvatar() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Link href="/profile" aria-label="Profile" className="relative flex h-11 w-11 items-center justify-center">
      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[rgb(var(--gold-bright))] to-[rgb(var(--gold-deep))] p-[2px]">
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[rgb(var(--c2))]">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
          ) : (
            <User size={18} className="text-[rgb(var(--gold-ink))]" aria-hidden="true" />
          )}
        </div>
      </div>
      <span
        className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[rgb(var(--lagoon))] border-2 border-[rgb(var(--c1))]"
        aria-hidden="true"
      />
    </Link>
  );
}

/** Full identity card for the expanded sheet - who's signed in, and a route
 *  to their profile. Shows real rank (RankBadge, same source as
 *  ProfileCard) rather than a fabricated level number: the app has no level
 *  system, so inventing one here would show a number nothing else in the
 *  app agrees with. "Online" is trivially true for the account viewing its
 *  own nav. */
function IdentityCard({ onNavigate }: { onNavigate: () => void }) {
  const { user, playerStats } = useAuth();
  const t = useTranslation();
  if (!user) return null;

  return (
    <Link
      href="/profile"
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-xl px-2 py-2 mb-4 hover:bg-[rgb(var(--c2))] transition-colors"
    >
      <div className="relative h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-[rgb(var(--gold-bright))] to-[rgb(var(--gold-deep))] p-[2px]">
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[rgb(var(--c2))]">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
          ) : (
            <User size={20} className="text-[rgb(var(--gold-ink))]" aria-hidden="true" />
          )}
        </div>
        <span
          className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[rgb(var(--lagoon))] border-2 border-[rgb(var(--c1))]"
          aria-hidden="true"
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[rgb(var(--text-primary))]">
          {user.displayName || t("profile_player")}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <RankBadge rank={playerStats?.currentRank || "Unranked"} size="sm" />
          <span className="text-[10px] font-semibold text-[rgb(var(--lagoon-ink))]">{t("nav_online")}</span>
        </div>
      </div>
    </Link>
  );
}

/** Compact premium VIP card at the foot of the expanded sheet - gold-to-
 *  violet gradient border (see .premium-border in globals.css) so it reads
 *  as its own exclusive tier rather than another accent-coloured tile.
 *  Routes to /shop, the same real destination the Home shortcuts grid
 *  already uses for VIP - no separate VIP flow exists to send this to. */
function VipCard({ onNavigate }: { onNavigate: () => void }) {
  const t = useTranslation();
  return (
    <Link href="/shop" onClick={onNavigate} className="block">
      <div className="premium-border relative overflow-hidden rounded-2xl p-3.5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[rgb(var(--orchid)/25%)] blur-2xl"
        />
        <div className="relative flex items-center gap-1.5">
          <Crown size={15} className="text-[rgb(var(--gold-ink))]" aria-hidden="true" />
          <span className="gold-text-gradient text-xs font-black uppercase tracking-widest">
            {t("home_shortcutVip")}
          </span>
        </div>
        <p className="relative mt-1.5 text-[11px] leading-snug text-[rgb(var(--c5))]">{t("vip_pitch")}</p>
        <span
          className="relative mt-3 inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-wide
                     bg-gradient-to-b from-[rgb(var(--gold-bright))] to-[rgb(var(--gold-deep))] text-[#0C0E12]
                     shadow-[0_4px_14px_-2px_rgb(var(--gold)/55%)]"
        >
          {t("vip_upgradeNow")}
        </span>
      </div>
    </Link>
  );
}

export function SideNav() {
  const pathname = usePathname();
  const t = useTranslation();
  const { logout } = useAuth();
  const [expanded, setExpanded] = useState(false);

  // Close on Escape - the sheet is a modal-like overlay, so it needs a
  // keyboard way out for anyone not using a mouse.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  // Hub pages only by design: a persistent nav column reads as a dashboard
  // there, but would compete with each other page's own back button/title
  // bar and eat into already-tight content width (e.g. in-match screens).
  // next.config.js sets trailingSlash: true (needed for the static export
  // Netlify serves), so usePathname() returns "/home/", not "/home" - strip
  // a trailing slash before comparing.
  const path = pathname?.replace(/\/$/, "");

  const closeAndNavigate = () => setExpanded(false);

  return (
    <>
      {/* Collapsed rail - always present, part of the layout, at every
          breakpoint (including mobile - narrower via RAIL_WIDTH's base
          class, full size from md+). */}
      <aside
        className={cn(
          "app-side-nav flex flex-col shrink-0 sticky top-0 overflow-y-auto items-center gap-2",
          "border-r border-[rgb(var(--c3))] bg-[rgb(var(--c1))] px-2 py-5",
          RAIL_WIDTH
        )}
      >
        <div className="mb-1">
          <Wordmark />
        </div>

        <button
          onClick={() => setExpanded(true)}
          aria-label={t("nav_expandMenu")}
          aria-expanded={expanded}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c5))] mb-2"
        >
          <Menu size={17} aria-hidden="true" />
        </button>

        <IdentityAvatar />

        <div className="mt-3 flex flex-1 flex-col items-center gap-1.5 overflow-y-auto">
          {HUB_ITEMS.map((item) => (
            <CollapsedRow key={item.key} item={item} active={isActiveHref(pathname, item.href)} />
          ))}
        </div>

        <Link
          href="/shop"
          aria-label={t("home_shortcutVip")}
          title={t("home_shortcutVip")}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--gold)/12%)] border border-[rgb(var(--gold)/35%)] text-[rgb(var(--gold-ink))] mb-1"
        >
          <Crown size={16} aria-hidden="true" />
        </Link>

        <button
          onClick={() => logout()}
          aria-label={t("settings_logout")}
          title={t("settings_logout")}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[rgb(var(--coral-ink))] hover:bg-[rgb(var(--coral)/10%)] transition-colors"
        >
          <LogOut size={17} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </aside>

      {/* Expanded sheet - overlays the rail and the content beside it,
          rather than pushing layout width around, so opening/closing it
          never reflows the rest of the page. */}
      <AnimatePresence>
        {expanded && (
          <>
            <motion.div
              key="sidenav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpanded(false)}
              className="fixed inset-0 z-40 bg-black/60"
              aria-hidden="true"
            />
            <motion.aside
              key="sidenav-sheet"
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={SPRING}
              className={cn(
                "flex flex-col fixed left-0 top-0 z-50 h-screen overflow-y-auto",
                "border-r border-[rgb(var(--c3))] bg-[rgb(var(--c1))] px-3 py-5 shadow-[var(--shadow-lg)]",
                SHEET_WIDTH
              )}
            >
              <div className="mb-4 flex items-center justify-between px-1">
                <Wordmark expanded />
                <button
                  onClick={() => setExpanded(false)}
                  aria-label={t("nav_collapseMenu")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c5))]"
                >
                  <X size={17} aria-hidden="true" />
                </button>
              </div>

              <IdentityCard onNavigate={closeAndNavigate} />

              <div className="flex-1">
                <nav className="flex flex-col gap-0.5">
                  {HUB_ITEMS.map((item) => (
                    <ExpandedRow
                      key={item.key}
                      item={item}
                      active={isActiveHref(pathname, item.href)}
                      onNavigate={closeAndNavigate}
                    />
                  ))}
                </nav>
              </div>

              <div className="mt-4 space-y-3">
                <VipCard onNavigate={closeAndNavigate} />

                <button
                  onClick={() => logout()}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[rgb(var(--coral-ink))]
                             hover:bg-[rgb(var(--coral)/10%)] transition-colors"
                >
                  <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
                  <span className="text-[13px] font-semibold">{t("settings_logout")}</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
