"use client";

import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import { ProtectedRoute } from "./ProtectedRoute";
import { FriendsRail } from "@/components/home/FriendsRail";
import { TopBar } from "./TopBar";
import { BackgroundMusicPlayer } from "@/components/audio/BackgroundMusicPlayer";
import { CoinTopupWatcher } from "@/components/economy/CoinTopupWatcher";
import { PresenceHeartbeat } from "@/components/system/PresenceHeartbeat";

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

        FriendsRail is the third column - a slim rail of friends and recent
        chats, styled and sized to match SideNav's collapsed rail. It
        self-gates by pathname the same way SideNav does (see the
        component), rendering null everywhere except Home/Play. Weekend
        League and Quick Play used to live in a fourth "RightRail" column;
        they're back in each page's own content grid now (see Home/Play),
        so the right side of the app carries only Friends/Chats.

        TopBar is a slim header (notification bell + profile menu) that also
        self-gates to Home/Play - it sits above {"{children}"} rather than
        being part of it, so no individual page needs to render its own copy.

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
            <PresenceHeartbeat />
            <div className="px-4">
              <TopBar />
            </div>
            {children}
            <BottomNav />
          </div>
        </div>
        <FriendsRail />
      </div>
    </ProtectedRoute>
  );
}
