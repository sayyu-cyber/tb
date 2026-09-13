"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { SidebarTooltip } from "./SidebarTooltip";
import type { SidebarItem } from "./sidebarItems";

/**
 * One navigation row. The same component in both states - only the label's
 * visibility differs (CSS handles the fade/slide) - so an icon can never end
 * up at a different vertical position between collapsed and expanded, which
 * is what makes the width animation read as one panel widening rather than
 * two different menus cross-fading.
 *
 * Accessibility: it's a real <Link> (never a div with onClick), carries
 * aria-current="page" on the active route, and swaps to an aria-label when
 * collapsed so the accessible name survives the label being visually hidden.
 */
export function SidebarNavItem({
  item,
  active,
  expanded,
  onNavigate,
}: {
  item: SidebarItem;
  active: boolean;
  expanded: boolean;
  onNavigate: () => void;
}) {
  const t = useTranslation();
  const label = t(item.labelKey);
  const Icon = item.icon;

  return (
    <SidebarTooltip label={label} enabled={!expanded}>
      <Link
        href={item.href}
        prefetch
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        // Expanded: the visible text is the accessible name. Collapsed: the
        // text is transparent, so name the link explicitly instead.
        aria-label={expanded ? undefined : label}
        className="app-sidebar-item"
        data-active={active ? "true" : undefined}
      >
        {/* Fixed-width icon box, the same width in both states, so the icon
            never shifts horizontally while the panel animates - it is simply
            centred in the rail when collapsed and the label grows beside it
            when expanded. */}
        <span className="app-sidebar-item-icon" aria-hidden="true">
          <Icon size={19} strokeWidth={active ? 2.2 : 1.75} />
        </span>
        <span className="app-sidebar-label">{label}</span>
      </Link>
    </SidebarTooltip>
  );
}
