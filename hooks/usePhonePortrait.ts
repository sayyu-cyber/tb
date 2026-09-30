"use client";

import { useSyncExternalStore } from "react";

/**
 * A phone held upright, as the PORTRAIT VIEW rather than as a physical
 * gesture — design/arena/MOBILE.md "Turning the phone".
 *
 * Deliberately the phone shell's own width rule (below 768px) and not the
 * rotate gate's, which adds `pointer: coarse` because it asks someone to
 * physically turn a device and a tall desktop window cannot be turned. This
 * one decides which composition is on screen, and that has to agree with the
 * shell: a narrow window gets the phone chrome, so it gets the phone lobby
 * and the phone's sheet too.
 */
export const PHONE_PORTRAIT = "(max-width: 767px) and (orientation: portrait)";

/**
 * True while the portrait phone view is the one on screen.
 *
 * Most of the phone layout does NOT use this - which composition shows is a
 * media query, so it is right on the first paint and free on a turn. This is
 * for the things CSS cannot do: opening the rotate sheet over the lobby after
 * a tap, starting Vs AI or Pass & Play the moment the phone is sideways, and
 * the handful of screens whose two compositions cannot both be mounted -
 * Messages, whose thread holds a live subscription and must exist once.
 *
 * `useSyncExternalStore` rather than an effect, so the value is right during
 * the first CLIENT render: arriving at a screen is a client navigation, and
 * an effect would paint the wrong composition for a frame first. A cold load
 * hydrates with the server's answer (false) and corrects on the next tick,
 * which React allows without a hydration warning precisely because
 * getServerSnapshot is declared.
 */
function subscribe(onChange: () => void) {
  const query = window.matchMedia(PHONE_PORTRAIT);
  query.addEventListener("change", onChange);
  // Re-read after a viewport resize even if WebKit delays the query event
  // while turning the phone with the Play sheet open.
  window.addEventListener("resize", onChange);
  return () => {
    query.removeEventListener("change", onChange);
    window.removeEventListener("resize", onChange);
  };
}

export function usePhonePortrait(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE_PORTRAIT).matches,
    () => false
  );
}
