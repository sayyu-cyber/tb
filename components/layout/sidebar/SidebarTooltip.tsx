"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Label tooltip for the collapsed rail.
 *
 * A pure-CSS tooltip can't work here: the rail scrolls vertically, and an
 * element with `overflow-y: auto` clips on the x-axis too, so a tooltip
 * sitting to the right of an icon would be cut off at the rail's edge. This
 * measures the trigger on hover/focus and renders the bubble into
 * document.body through a portal, where nothing can clip it.
 *
 * The portal only mounts after a real pointer/keyboard interaction, so it
 * never runs during the static export's build-time render and can't cause a
 * hydration mismatch.
 *
 * Screen readers don't need this: every collapsed control carries its own
 * aria-label, so the bubble is purely visual affordance for sighted users
 * (hence aria-hidden on it - announcing the same name twice is noise).
 */
export function SidebarTooltip({
  label,
  /** Pass false in the expanded panel, where labels are already visible. */
  enabled = true,
  children,
}: {
  label: string;
  enabled?: boolean;
  children: React.ReactNode;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const show = useCallback(() => {
    if (!enabled || !anchorRef.current) return;
    // Touch devices never fire a matching leave/blur when you tap a link, so
    // the bubble would latch open next to whatever you last tapped. Hover
    // affordances belong to devices that can actually hover.
    if (typeof window !== "undefined" && !window.matchMedia("(hover: hover)").matches) return;
    const rect = anchorRef.current.getBoundingClientRect();
    // Vertically centred on the trigger, just past its right edge. Fixed
    // coordinates, so the page scrolling underneath doesn't drag it along.
    setPos({ top: rect.top + rect.height / 2, left: rect.right + 12 });
  }, [enabled]);

  const hide = useCallback(() => setPos(null), []);

  // Expanding the panel while the pointer rests on a rail icon would
  // otherwise leave that icon's bubble stranded on screen.
  useEffect(() => {
    if (!enabled) setPos(null);
  }, [enabled]);

  // The wrapper is rendered in both states (disabled just stops measuring),
  // so expanding the panel doesn't change the element tree around each row
  // and force React to remount every link mid-animation.
  return (
    <span
      ref={anchorRef}
      className="app-sidebar-tip-anchor"
      onMouseEnter={show}
      onMouseLeave={hide}
      // React's onFocus/onBlur use focusin/focusout semantics, so focusing
      // the link *inside* this span triggers them - keyboard users get the
      // same label hover gives.
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {pos &&
        createPortal(
          <span className="app-sidebar-tip" style={{ top: pos.top, left: pos.left }} aria-hidden="true">
            {label}
          </span>,
          document.body
        )}
    </span>
  );
}
