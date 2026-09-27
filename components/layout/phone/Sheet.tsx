"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * The phone's bottom sheet — design/arena/MOBILE.md "Patterns", drawn on
 * MMore, MShopBuy and MFriends.
 *
 * One component for all of them: the purchase confirm, the friend actions,
 * More. On the boards these are dialogs and dropdown menus on desktop; at
 * 390px a sheet is the pattern, so this replaces both.
 *
 * Top corners 24px, a 40x5 handle, a short lime line across the top edge
 * (`.tick`), `sheetUp` .42s `cubic-bezier(.2,.9,.25,1)` over a
 * `rgba(0,0,0,.66)` scrim with a 3px blur on `scrimIn` .25s. Held
 * sideways it comes in from the rail as a 392px side panel on `sideIn`
 * instead - one class, decided in CSS (styles/arena-phone-shell.css).
 *
 * Behaviour the boards imply but cannot show: Escape closes it, the scrim
 * closes it, focus moves in and returns to whatever opened it, the page
 * behind stops scrolling, and everything behind is inert so a swipe or a
 * screen reader cannot reach it.
 *
 * Portalled to <body> so no page's stacking context or overflow can clip
 * it - the same reason the sidebar's tooltips are portalled.
 */
export function Sheet({
  open,
  onClose,
  label,
  headingId,
  className = "",
  namespace = "",
  style,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Names the sheet for assistive tech, e.g. "More". */
  label: string;
  /**
   * The id of a heading the sheet's own content draws, as MPlayFind's
   * "Rotate your phone" does. Given one, the hidden title below is left out
   * rather than announcing the sheet's name twice.
   */
  headingId?: string;
  /** Extra classes on the panel itself, e.g. "more-sheet". */
  className?: string;
  /**
   * Inline layout on the panel, for the sheets whose boards write it inline
   * rather than in a class - MPlayFind centres its column that way.
   */
  style?: React.CSSProperties;
  /**
   * A board namespace for content that needs one class the shared phone
   * layer does not carry - "arena-mplay" for the rotate sheet's `.qrow` and
   * `.spin`. The host already carries `arena-app arena-phone`, so most
   * sheets need nothing here.
   */
  namespace?: string;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const main = document.querySelector<HTMLElement>(".app-shell-main");
    const wasInert = main?.inert ?? false;
    const previousOverflow = document.body.style.overflow;
    if (main) main.inert = true;
    document.body.style.overflow = "hidden";

    // Focus the panel itself rather than its first link: a sheet that opens
    // with the first destination focused reads as if it had been chosen.
    panel.current?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); onClose(); return; }
      if (event.key !== "Tab") return;
      const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),[tabindex="0"]') ?? [])
        .filter((item) => item.getClientRects().length > 0);
      if (items.length === 0) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey, true);

    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = previousOverflow;
      if (main) main.inert = wasInert;
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    /* The portal lands on <body>, outside the shell, so the namespaces the
       generated sheets are scoped under have to travel with it - otherwise
       none of the board's classes match and the sheet arrives unstyled. */
    <div className={`arena-app arena-phone ${namespace} mview phone-sheet-host`.replace(/\s+/g, " ").trim()}>
      {/* A real button, so the scrim is reachable by keyboard and announces
          what it does instead of being an unlabelled div that eats taps. */}
      <button type="button" className="mscrim" aria-label={`Close ${label}`} onClick={onClose} data-flat />
      <div
        className={`sheet tick ${className}`.trim()}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId ?? titleId}
        tabIndex={-1}
        ref={panel}
      >
        <span className="sheet-handle" aria-hidden="true" />
        {!headingId && <h2 id={titleId} className="sr-only">{label}</h2>}
        {children}
      </div>
    </div>,
    document.body
  );
}
