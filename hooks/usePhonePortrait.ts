"use client";

import { useEffect, useState } from "react";

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
 * Nothing about the LAYOUT uses this - that is all media queries, so it is
 * right on the first paint and free on a turn. This is for the two things
 * CSS cannot do: opening the rotate sheet over the lobby after a tap, and
 * starting Vs AI or Pass & Play the moment the phone is sideways, which
 * MOBILE.md asks for because those two have nothing to queue for. Both are
 * actions, and an action needs to know.
 *
 * Starts false, including in the static export's server render, so the first
 * client paint agrees with the server; a portrait phone corrects it in the
 * effect before anything is painted from it.
 */
export function usePhonePortrait(): boolean {
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(PHONE_PORTRAIT);
    const update = () => setPortrait(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return portrait;
}
