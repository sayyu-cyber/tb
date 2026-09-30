"use client";

import { useSyncExternalStore } from "react";

/**
 * A phone held sideways — design/arena/MOBILE.md "Tables fit what is
 * visible": "A phone held sideways (max-height 500 px) gets these phone
 * compositions. Larger screens keep the desktop tables."
 *
 * The same query the phone shell uses for its rail, so a player who leaves a
 * match still holding the phone sideways never sees the two disagree.
 */
export const PHONE_TABLE = "(orientation: landscape) and (max-height: 500px) and (pointer: coarse)";

/**
 * Which table composition to render: true for the 844x390 phone boards,
 * false for the 1440x900 desktop ones.
 *
 * This one cannot be CSS, and it is the only place in the phone work that
 * isn't. The two are different artboards, not one layout at two sizes -
 * PMindi puts the seats down the sides and the hand in an arc where Main
 * puts them round a table - so hiding one with a media query would mean
 * mounting two full tables, two hands of live cards and two sets of
 * listeners for every hand played.
 *
 * `useSyncExternalStore` rather than an effect, because an effect would
 * paint the wrong table for a frame. Arriving at a table is a client
 * navigation, so the store is read during that first render and the right
 * composition is the first thing drawn. A cold load straight onto a match
 * URL hydrates with the server's answer (false) and corrects on the next
 * tick, which React allows without a hydration warning precisely because
 * getServerSnapshot is declared.
 */
function subscribe(onChange: () => void) {
  const query = window.matchMedia(PHONE_TABLE);
  query.addEventListener("change", onChange);
  // WebKit can delay a media-query change during rotation. A resize must
  // also re-read the snapshot so the previous composition cannot linger.
  window.addEventListener("resize", onChange);
  return () => {
    query.removeEventListener("change", onChange);
    window.removeEventListener("resize", onChange);
  };
}

export function usePhoneTable(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE_TABLE).matches,
    () => false
  );
}
