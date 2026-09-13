"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { VIEWPORT_HOOK } from "@/lib/desktopViewport";

/**
 * Keeps the desktop layout viewport applied across hydration and routing.
 *
 * The pre-paint script in lib/desktopViewport.ts sets it for the first
 * paint, but Next renders the viewport meta as part of the React tree: it
 * is re-rendered when the app hydrates and again on every navigation, each
 * of which resets the tag to `width=device-width` and drops a phone back to
 * the cramped mobile layout mid-session.
 *
 * So this re-runs the script's own `apply` (published on window - one
 * implementation, not a second copy of the rules) after hydration and after
 * every route change. The rAF pass covers the case where React commits the
 * head update just after this effect runs.
 *
 * Renders nothing.
 */
export function ViewportManager() {
  const pathname = usePathname();

  useEffect(() => {
    const apply = (window as unknown as Record<string, undefined | (() => void)>)[VIEWPORT_HOOK];
    if (typeof apply !== "function") return;
    apply();
    const frame = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
