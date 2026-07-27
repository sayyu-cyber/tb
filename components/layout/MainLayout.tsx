"use client";

import { BottomNav } from "./BottomNav";
import { ProtectedRoute } from "./ProtectedRoute";
import { BackgroundMusicPlayer } from "@/components/audio/BackgroundMusicPlayer";
import { CoinTopupWatcher } from "@/components/economy/CoinTopupWatcher";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="max-w-md mx-auto min-h-screen bg-[rgb(var(--c1))] relative pb-24">
        <BackgroundMusicPlayer />
        <CoinTopupWatcher />
        {children}
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}