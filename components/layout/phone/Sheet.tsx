"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const layers: HTMLElement[] = [];
const inertBefore = new Map<HTMLElement, boolean>();
let overflowBefore = "";

function syncBackground() {
  const top = layers[layers.length - 1];
  if (!top) {
    inertBefore.forEach((inert, element) => { element.inert = inert; });
    inertBefore.clear();
    document.body.style.overflow = overflowBefore;
    return;
  }
  for (const element of Array.from(document.body.children)) {
    if (!(element instanceof HTMLElement)) continue;
    if (!inertBefore.has(element)) inertBefore.set(element, element.inert);
    element.inert = element !== top;
  }
  document.body.style.overflow = "hidden";
}

function tabStops(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(
    'a[href],area[href],button,input,select,textarea,iframe,object,embed,summary,[contenteditable],[tabindex],audio[controls],video[controls]'
  )).filter((item) => {
    const style = getComputedStyle(item);
    const tabbable = item.tabIndex >= 0 || (item.isContentEditable && !item.hasAttribute("tabindex"));
    return tabbable && !item.matches(':disabled,input[type="hidden"]') &&
      !item.closest('[inert],[hidden],[aria-hidden="true"]') && item.getClientRects().length > 0 &&
      style.visibility !== "hidden" && style.visibility !== "collapse";
  }).filter((item, _, items) => {
    if (!(item instanceof HTMLInputElement) || item.type !== "radio" || !item.name) return true;
    const group = items.filter((other): other is HTMLInputElement => other instanceof HTMLInputElement &&
      other.type === "radio" && other.name === item.name && other.form === item.form);
    return item === (group.find((radio) => radio.checked) ?? group[0]);
  }).sort((a, b) => (a.tabIndex > 0 ? a.tabIndex : Infinity) - (b.tabIndex > 0 ? b.tabIndex : Infinity));
}

/**
 * The phone's side panel - design/arena/LANDSCAPE.md "Patterns", drawn on
 * LMore, LFriendActions and LInventoryPreview.
 *
 * The phone is landscape only, so the portrait bottom sheet is gone: a
 * panel opens from the rail's edge, 392px (`.sheet`), 540px (`.sheet.w2`)
 * or 640px (`.sheet.w3`), or from the right edge (`.sheet.right`), on
 * `sideIn` .38s `cubic-bezier(.2,.9,.25,1)` over a `rgba(0,0,0,.66)` scrim
 * with a 3px blur. A left panel's scrim starts at the rail, which stays
 * lit; a right panel's covers it (`.mscrim.full`), as on the boards.
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
  scrimFull = false,
  dialog = false,
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
  /** Extra classes on the panel itself: "w2", "w3", "right". */
  className?: string;
  /** Cover the rail too, as the right-edge panels and dialogs do. */
  scrimFull?: boolean;
  /**
   * A centred dialog on the content area instead of a side panel -
   * LANDSCAPE.md "Patterns": `.ldlg > .card` on `pop` .32s, for the buy
   * dialog, the not-enough-coins state and the claimed-day celebration.
   * `className` then goes on the card. Its scrim covers the rail.
   */
  dialog?: boolean;
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
  const host = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const titleId = useId();

  useEffect(() => {
    if (!open || !panel.current || !host.current) return;
    const dialog = panel.current;
    const container = host.current;
    const opener = document.activeElement as HTMLElement | null;
    if (layers.length === 0) overflowBefore = document.body.style.overflow;
    layers.push(container);
    syncBackground();
    const observer = new MutationObserver(syncBackground);
    observer.observe(document.body, { childList: true });
    const isTop = () => layers[layers.length - 1] === container;

    // Focus the panel itself rather than its first link: a sheet that opens
    // with the first destination focused reads as if it had been chosen.
    dialog.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (!isTop()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        close.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = tabStops(dialog);
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = index < 0 ? (event.shiftKey ? items.length - 1 : 0)
        : (index + (event.shiftKey ? -1 : 1) + items.length) % items.length;
      event.preventDefault();
      (items[next] ?? dialog).focus({ preventScroll: true });
    };
    const onFocus = (event: FocusEvent) => {
      if (isTop() && !dialog.contains(event.target as Node)) dialog.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("focusin", onFocus, true);

    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("focusin", onFocus, true);
      observer.disconnect();
      const wasTop = isTop();
      layers.splice(layers.indexOf(container), 1);
      syncBackground();
      if (wasTop) {
        const remaining = layers[layers.length - 1];
        if (opener?.isConnected && !opener.closest("[inert]") && (!remaining || remaining.contains(opener))) {
          opener.focus({ preventScroll: true });
        } else {
          remaining?.querySelector<HTMLElement>('[role="dialog"]')?.focus({ preventScroll: true });
        }
      }
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    /* The portal lands on <body>, outside the shell, so the namespaces the
       generated sheets are scoped under have to travel with it - otherwise
       none of the board's classes match and the sheet arrives unstyled. */
    <div ref={host} className={`arena-app arena-phone arena-land land ${namespace} mview phone-sheet-host`.replace(/\s+/g, " ").trim()}>
      <button type="button" className={scrimFull || dialog ? "mscrim full" : "mscrim"} tabIndex={-1} aria-hidden="true" onClick={onClose} data-flat />
      {dialog ? (
      <div className="ldlg">
        <div
          className={`card ${className}`.trim()}
          style={style}
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId ?? titleId}
          aria-label={label}
          tabIndex={-1}
          ref={panel}
        >
          {!headingId && <h2 id={titleId} className="sr-only">{label}</h2>}
          {children}
          {/* No board draws a close button - Escape and the scrim close a
              panel - but a keyboard needs something to land on, so it is
              here and only shows while it has focus (.sheet-close). */}
          <button type="button" className="sheet-close" aria-label={`Close ${label}`} title={`Close ${label}`} onClick={onClose} data-flat>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
      ) : (
      <div
        className={`sheet tick ${className}`.trim()}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId ?? titleId}
        aria-label={label}
        tabIndex={-1}
        ref={panel}
      >
        <span className="sheet-handle" aria-hidden="true" />
        {!headingId && <h2 id={titleId} className="sr-only">{label}</h2>}
        {children}
        {/* No board draws a close button - Escape and the scrim close a
            panel - but a keyboard needs something to land on, so it is
            here and only shows while it has focus (.sheet-close). */}
        <button type="button" className="sheet-close" aria-label={`Close ${label}`} title={`Close ${label}`} onClick={onClose} data-flat>
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      )}
    </div>,
    document.body
  );
}
