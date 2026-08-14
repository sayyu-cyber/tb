"use client";

import { BottomNav } from "./BottomNav";
import { ProtectedRoute } from "./ProtectedRoute";
import { BackgroundMusicPlayer } from "@/components/audio/BackgroundMusicPlayer";
import { CoinTopupWatcher } from "@/components/economy/CoinTopupWatcher";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      {/*
        The shell used to be pinned at max-w-md at every breakpoint, so the
        entire app rendered as one narrow phone-width column on a desktop
        monitor with empty space either side. It now steps up at md/lg
        while staying byte-identical below md, so the mobile design - which
        is the primary target - is untouched.

        Pages opt into using the extra width themselves (see the responsive
        grids on Home, Shop, Collection, Inventory). Anything that doesn't
        simply stays centred and readable rather than stretching.
      */}
      <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto min-h-screen bg-[rgb(var(--c1))] relative pb-24">
        <BackgroundMusicPlayer />
        <CoinTopupWatcher />
        {children}
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}