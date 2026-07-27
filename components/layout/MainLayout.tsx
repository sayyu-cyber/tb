"use client";

import { BottomNav } from "./BottomNav";
import { ProtectedRoute } from "./ProtectedRoute";
import { BackgroundMusicPlayer } from "@/components/audio/BackgroundMusicPlayer";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="max-w-md mx-auto min-h-screen bg-[#0F0F0F] relative pb-24">
        <BackgroundMusicPlayer />
        {children}
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}