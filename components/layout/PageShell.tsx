"use client";

import { BottomNav } from "./BottomNav";
import { ProtectedRoute } from "./ProtectedRoute";

/**
 * Shell for the feature routes that live outside the (main) route group -
 * Shop, Collection, Achievements, Inventory, Missions, Daily Rewards, Room
 * Cards, Hall of Fame, Weekend League and Player Profile.
 *
 * Those pages were rendering completely bare: no width constraint (so they
 * sprawled edge-to-edge on a desktop monitor while every (main) page stayed
 * centred), no bottom navigation (so opening the Shop from Home left the
 * player with no way back except the browser's back button), and no auth
 * gate. This gives them the same frame as the rest of the app.
 *
 * Deliberately mirrors MainLayout rather than sharing an implementation:
 * MainLayout also mounts the background-music player and coin-topup
 * watcher, which are singletons that must not be mounted twice.
 */
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto min-h-screen bg-[rgb(var(--c1))] relative pb-24">
        {children}
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
