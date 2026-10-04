"use client";

import { useSyncExternalStore } from "react";

/**
 * When the phone version applies - design/arena/LANDSCAPE.md "Orientation".
 *
 * The phone runs in landscape only, and its layout applies on
 * `(orientation: landscape) and (max-height: 500px)`. Held upright, a phone
 * sees the turn gate over the page (`PHONE_GATE`), and the page underneath is
 * still the landscape composition, so turning back finds it exactly as it
 * was: same tree, same state, nothing remounted. So `usePhoneLayout()` is true
 * for both. Desktop at 768 wide and up with a normal height is untouched.
 *
 * styles/arena-phone-shell.css holds the same strings; these are for the
 * decisions that are renders rather than styles.
 */
export const PHONE_LANDSCAPE = "(orientation: landscape) and (max-height: 500px)";
export const PHONE_GATE = "(orientation: portrait) and (max-width: 767px)";
export const PHONE_LAYOUT = `${PHONE_LANDSCAPE}, ${PHONE_GATE}`;

function subscribe(onChange: () => void) {
  const query = window.matchMedia(PHONE_LAYOUT);
  query.addEventListener("change", onChange);
  // WebKit can delay a media-query change while the phone turns; a resize
  // re-reads the snapshot so the previous composition cannot linger.
  window.addEventListener("resize", onChange);
  return () => {
    query.removeEventListener("change", onChange);
    window.removeEventListener("resize", onChange);
  };
}

export function usePhoneLayout(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE_LAYOUT).matches,
    () => false
  );
}
