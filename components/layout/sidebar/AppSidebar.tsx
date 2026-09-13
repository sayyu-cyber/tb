"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { isActiveHref } from "@/constants/navigation";
import { RankBadge } from "@/components/ui/RankBadge";
import { SIDEBAR_ITEMS } from "./sidebarItems";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarToggle } from "./SidebarToggle";
import { SidebarTooltip } from "./SidebarTooltip";
import { VipSidebarCard } from "./VipSidebarCard";
import { SidebarSocial } from "./SidebarSocial";

/**
 * The app's single left navigation - a premium game-launcher rail that
 * widens into a full panel, replacing the two sidebars that used to share
 * the job (a 56px icon rail everywhere, plus a separate 210px Home-only
 * panel that appeared at >=1200px). One component now owns both states, so
 * the icon order, active styling and destinations can't drift apart.
 *
 * Layout: <aside> is an in-flow spacer that reserves horizontal room; the
 * panel inside it is position:fixed. That split is what lets the same markup
 * push content on desktop (the spacer grows with the panel) and overlay it
 * on tablet/mobile (the spacer stays at rail width while the fixed panel
 * slides over the page) - no JS breakpoint branching, no layout thrash.
 *
 * All widths, transitions and the push/overlay breakpoint live in
 * styles/globals.css under "Unified app sidebar".
 */

const STORAGE_KEY = "thaasbai:sidebarExpanded";
/** Wider than this, the panel pushes content; narrower, it overlays.
 *  Must match the (min-width: 1024px) block in globals.css. */
const PUSH_QUERY = "(min-width: 1024px)";
const PANEL_ID = "app-sidebar-panel";

/** True when the viewport is wide enough that the panel pushes rather than
 *  overlays. Guarded for the static export's server render, where there is
 *  no window at all. */
function pushesContent(): boolean {
  return typeof window !== "undefined" && window.matchMedia(PUSH_QUERY).matches;
}

/** Avatar + (when expanded) who's signed in. Deliberately minimal: TopBar
 *  already carries the account menu, so this is an identity marker and a
 *  route to the profile, not a second profile card. */
function SidebarIdentity({ expanded, onNavigate }: { expanded: boolean; onNavigate: () => void }) {
  const { user, playerStats } = useAuth();
  const t = useTranslation();
  if (!user) return null;

  const name = user.displayName || t("profile_player");

  return (
    <SidebarTooltip label={name} enabled={!expanded}>
      <Link
        href="/profile"
        onClick={onNavigate}
        aria-label={expanded ? undefined : `${t("nav_profile")}: ${name}`}
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
  // Collapsed is the default - both for the server render and for anyone
  // with no stored preference, per the brief.
  const [expanded, setExpanded] = useState(false);
  // Until the stored preference has been read, transitions are suppressed so
  // a restored "expanded" doesn't animate open on every page load.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      // Only restore "expanded" where it pushes content. Re-opening a
      // full-width drawer over the page on a phone every time the app loads
      // would be hostile, so small screens always start closed.
      if (window.localStorage.getItem(STORAGE_KEY) === "true" && pushesContent()) {
        setExpanded(true);
      }
    } catch {
      // Storage can throw in private mode / with cookies blocked. The
      // default (collapsed) is already correct, so there's nothing to do.
    }
    setReady(true);
  }, []);

  const apply = useCallback((next: boolean) => {
    setExpanded(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Preference just won't persist; the sidebar still works this session.
    }
  }, []);

  // Escape closes it - required for the mobile/tablet drawer, harmless on
  // desktop where it's simply another way to collapse.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") apply(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, apply]);

  // While the drawer covers the page, the page behind it shouldn't scroll.
  // Only at the overlay breakpoints - locking the body on desktop, where the
  // panel is just part of the layout, would strand the player mid-page.
  useEffect(() => {
    if (!expanded || pushesContent()) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  // Following a link closes the drawer only where it was covering the page.
  // On desktop the panel is part of the layout, so navigating shouldn't
  // collapse the thing the player just chose to keep open.
  const handleNavigate = useCallback(() => {
    if (!pushesContent()) apply(false);
  }, [apply]);

  return (
    <>
      <aside
        className="app-sidebar"
        data-expanded={expanded ? "true" : "false"}
        data-ready={ready ? "true" : undefined}
      >
        <div className="app-sidebar-panel" id={PANEL_ID}>
          <div className="app-sidebar-head">
            <Link href="/home" onClick={handleNavigate} className="app-sidebar-mark" aria-label={t("nav_home")}>
              <span className="app-sidebar-mark-glyph" aria-hidden="true">
                ♠
              </span>
              <span className="app-sidebar-wordmark">Thaasbai</span>
            </Link>
            <SidebarToggle expanded={expanded} panelId={PANEL_ID} onToggle={() => apply(!expanded)} />
          </div>

          <SidebarIdentity expanded={expanded} onNavigate={handleNavigate} />

          <nav className="app-sidebar-nav" aria-label={t("nav_moreTitle")}>
            {SIDEBAR_ITEMS.map((item) => (
              <SidebarNavItem
                key={item.href}
                item={item}
                expanded={expanded}
                active={isActiveHref(pathname, item.href)}
                onNavigate={handleNavigate}
              />
            ))}
          </nav>

          <div className="app-sidebar-foot">
            <VipSidebarCard expanded={expanded} onNavigate={handleNavigate} />
            <SidebarSocial expanded={expanded} onNavigate={handleNavigate} />
          </div>
        </div>
      </aside>

      {/* Dismiss layer for the overlay breakpoints. CSS hides it wherever the
          panel pushes content instead of covering it, so desktop never gets
          a stray click-blocker. */}
      {expanded && (
        <button
          type="button"
          className="app-sidebar-backdrop"
          aria-label={t("nav_collapseMenu")}
          onClick={() => apply(false)}
        />
      )}
    </>
  );
}
