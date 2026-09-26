"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { isActiveHref } from "@/constants/navigation";
import { RankBadge } from "@/components/ui/RankBadge";
import { SIDEBAR_ITEMS } from "./sidebarItems";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarTooltip } from "./SidebarTooltip";
import { VipSidebarCard } from "./VipSidebarCard";
import { SidebarSocial } from "./SidebarSocial";

/**
 * The app's navigation: a fixed icon rail down the RIGHT edge of every
 * screen, at every window size.
 *
 * It used to widen into a 300px panel, and the widening was the problem.
 * Expanding it took 216px off the content and - while the shell still
 * centred that content - slid the whole page sideways as well. Sayyu asked
 * for a rail that cannot move, on the right, so there is no expanded state
 * here at all: no toggle, no stored preference, no drawer, no backdrop, no
 * focus trap, nothing to restore on load. The rail is 84px (62px on a
 * phone) and the content has the rest, always.
 *
 * Layout: <aside> is an in-flow spacer that reserves the rail's width; the
 * panel inside it is position:fixed against the right edge. The spacer is
 * what keeps content from sliding under the panel, and because its width
 * is now constant, nothing about the page depends on the nav's state.
 *
 * Every label lives in a tooltip instead (SidebarTooltip, which opens to
 * the LEFT of the rail), and every control carries its own aria-label, so
 * the rail is fully usable by keyboard and screen reader without labels
 * on screen.
 *
 * Widths and skin live in styles/globals.css under "Unified app sidebar",
 * retinted by styles/arena-shell.css.
 */

const PANEL_ID = "app-sidebar-panel";

/** Avatar and a route to the profile. Deliberately minimal: TopBar already
 *  carries the account menu, so this is an identity marker, not a second
 *  profile card. */
function SidebarIdentity({ onNavigate }: { onNavigate: () => void }) {
  const { user, playerStats } = useAuth();
  const t = useTranslation();
  if (!user) return null;

  const name = user.displayName || t("profile_player");

  return (
    <SidebarTooltip label={name}>
      <Link
        href="/profile"
        onClick={onNavigate}
        aria-label={`${t("nav_profile")}: ${name}`}
        className="app-sidebar-identity"
      >
        <span className="app-sidebar-avatar">
          <span className="app-sidebar-avatar-inner">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" />
            ) : (
              <User size={17} aria-hidden="true" />
            )}
          </span>
          <span className="app-sidebar-presence" aria-hidden="true" />
        </span>
        <span className="app-sidebar-identity-text">
          <strong>{name}</strong>
          <span className="app-sidebar-identity-meta">
            <RankBadge rank={playerStats?.currentRank || "Unranked"} size="sm" />
          </span>
        </span>
      </Link>
    </SidebarTooltip>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const t = useTranslation();

  // Nothing to close on navigation - the rail is never covering the page.
  const handleNavigate = () => {};

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-panel" id={PANEL_ID}>
        <div className="app-sidebar-head">
          <Link href="/home" onClick={handleNavigate} className="app-sidebar-mark" aria-label={t("nav_home")}>
            <span className="app-sidebar-mark-glyph" aria-hidden="true">
              ♠
            </span>
            <span className="app-sidebar-wordmark">Thaasbai</span>
          </Link>
        </div>

        <SidebarIdentity onNavigate={handleNavigate} />

        <nav className="app-sidebar-nav" aria-label={t("nav_moreTitle")}>
          {SIDEBAR_ITEMS.map((item) => (
            <SidebarNavItem
              key={item.href}
              item={item}
              expanded={false}
              active={isActiveHref(pathname, item.href)}
              onNavigate={handleNavigate}
            />
          ))}
        </nav>

        <div className="app-sidebar-foot">
          <VipSidebarCard expanded={false} onNavigate={handleNavigate} />
          <SidebarSocial expanded={false} onNavigate={handleNavigate} />
        </div>
      </div>
    </aside>
  );
}
