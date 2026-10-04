"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { TopBar } from "./phoneTabs";

/**
 * A page's say over the phone top bar.
 *
 * Most bars follow the route (phoneTabs.ts `topBarFor`). A few depend on
 * what the page is showing - the Shop's VIP tab is titled "VIP Pass" under
 * a "Shop" label, and a drill-down wants a back button - so the page sets
 * the bar while it is mounted and the shell reads it. One value, held
 * outside React, because the bar and the page are siblings in the tree.
 */
let current: TopBar | null = null;
const listeners = new Set<() => void>();

function set(next: TopBar | null) {
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The bar a page has asked for, or null to follow the route. */
export function useTopBarOverride(): TopBar | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}

/** Show this bar while the calling page is mounted. Pass null for the route's own. */
export function usePhoneTopBar(bar: TopBar | null) {
  const key = bar ? JSON.stringify(bar) : "";
  useEffect(() => {
    if (!key) return;
    set(JSON.parse(key) as TopBar);
    return () => set(null);
  }, [key]);
}
