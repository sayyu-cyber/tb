"use client";

import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import { ProtectedRoute } from "./ProtectedRoute";
import { BackgroundMusicPlayer } from "@/components/audio/BackgroundMusicPlayer";
import { CoinTopupWatcher } from "@/components/economy/CoinTopupWatcher";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      {/*
        Mobile keeps the single narrow column it always had, with BottomNav
        pinned to the bottom. At md+, SideNav takes over as a persistent
        left column listing every destination top-to-bottom (see
        constants/navigation.ts) - a wide screen has the room for it, and
        it beats digging through the mobile "More" sheet with a mouse.

        Pages opt into using the extra width themselves (see the responsive
        grids on Home, Shop, Collection, Inventory). Anything that doesn't
        simply stays centred and readable rather than stretching.
      */}
      <div className="md:flex min-h-screen bg-[rgb(var(--c1))]">
        <SideNav />
        <div className="flex-1 min-w-0">
          <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto relative pb-24 md:pb-10">
            <BackgroundMusicPlayer />
            <CoinTopupWatcher />
            {children}
            <BottomNav />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}