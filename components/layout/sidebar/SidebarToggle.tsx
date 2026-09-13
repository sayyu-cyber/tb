"use client";

import { ChevronsLeft, Menu } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { SidebarTooltip } from "./SidebarTooltip";

/**
 * The expand/collapse control - a hamburger on the rail, a double-chevron in
 * the expanded panel's top-right corner, mirroring how the two states read
 * in the reference: "open this" versus "push this back".
 *
 * It's a real <button> with aria-expanded and aria-controls pointing at the
 * panel, so assistive tech announces the state rather than just "button".
 */
export function SidebarToggle({
  expanded,
  panelId,
  onToggle,
}: {
  expanded: boolean;
  panelId: string;
  onToggle: () => void;
}) {
  const t = useTranslation();
  const label = expanded ? t("nav_collapseMenu") : t("nav_expandMenu");

  return (
    <SidebarTooltip label={label} enabled={!expanded}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="app-sidebar-toggle"
      >
        {expanded ? <ChevronsLeft size={18} aria-hidden="true" /> : <Menu size={17} aria-hidden="true" />}
      </button>
    </SidebarTooltip>
  );
}
