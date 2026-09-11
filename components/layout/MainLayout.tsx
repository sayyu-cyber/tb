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
        BottomNav (Home/Play/Leaderboard/Friends + More) stays pinned at
        every breakpoint, unchanged. SideNav adds a persistent left column
        at md+ alongside it, listing the grouped secondary destinations
        (see constants/navigation.ts) that would otherwise sit behind the
        mobile "More" sheet - it deliberately doesn't repeat the primary
        tabs, so nothing lives in two nav surfaces at once.

        Pages opt into using the extra width themselves (see the responsive
        grids on Home, Shop, Collection, Inventory). Anything that doesn't
        simply stays centred and readable rather than stretching.
      */}
      <div className="md:flex min-h-screen bg-[rgb(var(--c1))]">
        <SideNav />
        <div className="flex-1 min-w-0">
          <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto relative pb-24">
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