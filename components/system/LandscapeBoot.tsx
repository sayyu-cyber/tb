"use client";

import { useEffect } from "react";
import { canLockOrientation, lockLandscape } from "@/lib/orientationLock";

/**
 * The quiet first try - design/arena/LANDSCAPE.md "The turn gate": "Also
 * try the same two calls quietly on the first tap of any session (sign in,
 * Play). On success the gate never shows."
 *
 * Fullscreen and the orientation lock are both gesture-gated, so they can
 * only be asked for from a real tap. This listens for the session's first
 * one, anywhere, on a touch screen whose browser can lock (Android), asks
 * once, and stops listening. A refusal is not an error: the gate is there
 * for exactly that case. Once per browser session, not per page, so a
 * player who leaves fullscreen is not dragged back into it on every tap.
 */
const ASKED = "thaasbai.landscapeAsked";

export function LandscapeBoot() {
  useEffect(() => {
    if (!canLockOrientation() || !window.matchMedia("(pointer: coarse)").matches) return;
    try { if (sessionStorage.getItem(ASKED)) return; } catch { /* storage blocked: ask anyway */ }
    const onTap = () => {
      window.removeEventListener("click", onTap, true);
      try { sessionStorage.setItem(ASKED, "1"); } catch { /* fine */ }
      void lockLandscape();
    };
    window.addEventListener("click", onTap, true);
    return () => window.removeEventListener("click", onTap, true);
  }, []);
  return null;
}
