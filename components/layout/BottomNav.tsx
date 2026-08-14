"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  MoreHorizontal,
  Package,
  Layers,
  Award,
  Crown,
  Shield,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import CoinBalance from "@/components/economy/CoinBalance";
import { useTranslation } from "@/hooks/useTranslation";
import { sheetIn, staggerParent, riseIn, SPRING } from "@/lib/motion";

interface NavItem {
  icon: LucideIcon;
  key: string;
  href: string;
  /** Accent token for the active state. Defaults to gold. */
  accent?: string;
}

/**
 * Five primary destinations.
 *
 * This used to be eleven items in a horizontally scrolling bar. At 375px
 * that overflows by ~150px, so roughly half the app's navigation sat
 * off-screen behind a scroll gesture nobody discovers on a bar that looks
 * fixed. Five is the most that fits without scrolling; the rest moved into
 * the More sheet below.
 */
const PRIMARY: NavItem[] = [
  { icon: Home, key: "nav_home", href: "/home" },
  { icon: Gamepad2, key: "nav_play", href: "/play", accent: "var(--lagoon)" },
  { icon: Trophy, key: "nav_leaderboard", href: "/leaderboard" },
  { icon: Users, key: "nav_friends", href: "/friends", accent: "var(--deep)" },
];

/** Everything else, grouped so the sheet reads as sections rather than a wall. */
const SECONDARY: { titleKey: string; items: NavItem[] }[] = [
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
 * The old check was `pathname.startsWith(item.href)`, which lit up "Play"
 * whenever you opened a player profile — /player starts with /play. This
 * requires a path separator, so /play and /play/mindi match but /player
 * does not.
 */
function isActiveHref(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const t = useTranslation();
  const accent = item.accent ?? "var(--gold)";

  return (
    <Link
      href={item.href}
      scroll={false}
      prefetch={false}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className="relative flex flex-1 flex-col items-center gap-1 py-2 min-w-0 min-h-[52px] rounded-xl"
      style={{ ["--accent" as string]: accent } as React.CSSProperties}
    >
      {/* Shared layout id makes the pill glide between tabs rather than
          cross-fading in place. */}
      {active && (
        <motion.span
          layoutId="navActive"
          transition={SPRING}
          className="absolute inset-x-1 inset-y-0.5 rounded-xl bg-[rgb(var(--accent)/12%)] border border-[rgb(var(--accent)/22%)]"
        />
      )}
      <item.icon
        size={20}
        strokeWidth={active ? 2.4 : 1.75}
        className={cn(
          "relative z-10 transition-colors duration-200",
          active ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--c4))]"
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          "relative z-10 text-[9px] font-semibold leading-none truncate max-w-full transition-colors duration-200",
          active ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--c4))]"
        )}
      >
        {t(item.key)}
      </span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);

  const secondaryActive = SECONDARY.some((g) => g.items.some((i) => isActiveHref(pathname, i.href)));

  return (
    <>
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          >
            <motion.div
              variants={sheetIn}
              initial="hidden"
              animate="show"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={t("nav_moreTitle")}
              className="absolute bottom-0 inset-x-0 max-h-[80vh] overflow-y-auto rounded-t-3xl surface-raised
                         border-t border-[rgb(var(--gold)/20%)] px-4 pt-3 pb-28
                         max-w-md md:max-w-3xl lg:max-w-5xl mx-auto"
            >
              {/* Grab handle - signals the sheet is dismissible. */}
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[rgb(var(--c3))]" />

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-[rgb(var(--text-primary))]">{t("nav_moreTitle")}</h2>
                <button
                  onClick={() => setMoreOpen(false)}
                  aria-label={t("a11y_close")}
                  className="p-2 -mr-2 rounded-lg text-[rgb(var(--c4))] hover:text-[rgb(var(--text-primary))]"
                >
                  <X size={18} />
                </button>
              </div>

              <motion.div variants={staggerParent(0.03)} initial="hidden" animate="show" className="space-y-5">
                {SECONDARY.map((group) => (
                  <div key={group.titleKey}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--c4))] mb-2 px-1">
                      {t(group.titleKey)}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {group.items.map((item) => {
                        const accent = item.accent ?? "var(--gold)";
                        return (
                          <motion.div key={`${group.titleKey}-${item.key}`} variants={riseIn}>
                            <Link
                              href={item.href}
                              prefetch={false}
                              onClick={() => setMoreOpen(false)}
                              style={{ ["--accent" as string]: accent } as React.CSSProperties}
                              className="flex flex-col items-center gap-2 rounded-2xl border border-[rgb(var(--c3))]
                                         bg-[rgb(var(--c2))] px-2 py-3 min-h-[76px] justify-center
                                         transition-colors hover:border-[rgb(var(--accent)/45%)]"
                            >
                              <item.icon size={20} className="text-[rgb(var(--accent))]" aria-hidden="true" />
                              <span className="text-[10px] font-medium text-center leading-tight text-[rgb(var(--c5))] line-clamp-2">
                                {t(item.key)}
                              </span>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav
        initial={{ y: 88 }}
        animate={{ y: 0 }}
        transition={SPRING}
        className="fixed bottom-0 left-0 right-0 z-[56] border-t border-[rgb(var(--c3))]
                   bg-[rgb(var(--c1)/92%)] backdrop-blur-xl
                   pb-[env(safe-area-inset-bottom)]"
      >
        <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto px-4 pt-2 flex justify-center">
          <CoinBalance size="sm" />
        </div>

        <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto flex items-stretch gap-0.5 px-2 pb-1">
          {PRIMARY.map((item) => (
            <NavLink key={item.href} item={item} active={isActiveHref(pathname, item.href)} />
          ))}

          <button
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            className="relative flex flex-1 flex-col items-center gap-1 py-2 min-w-0 min-h-[52px] rounded-xl"
            style={{ ["--accent" as string]: "var(--gold)" } as React.CSSProperties}
          >
            {secondaryActive && (
              <motion.span
                layoutId="navActive"
                transition={SPRING}
                className="absolute inset-x-1 inset-y-0.5 rounded-xl bg-[rgb(var(--accent)/12%)] border border-[rgb(var(--accent)/22%)]"
              />
            )}
            <MoreHorizontal
              size={20}
              strokeWidth={secondaryActive ? 2.4 : 1.75}
              className={cn(
                "relative z-10 transition-colors duration-200",
                secondaryActive ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--c4))]"
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "relative z-10 text-[9px] font-semibold leading-none transition-colors duration-200",
                secondaryActive ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--c4))]"
              )}
            >
              {t("nav_more")}
            </span>
          </button>
        </div>
      </motion.nav>
    </>
  );
}
