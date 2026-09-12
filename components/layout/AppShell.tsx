"use client";
import { usePathname } from "next/navigation";
import { SideNav } from "./SideNav";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { ProtectedRoute } from "./ProtectedRoute";
import { BackgroundMusicPlayer } from "@/components/audio/BackgroundMusicPlayer";
import { CoinTopupWatcher } from "@/components/economy/CoinTopupWatcher";
import { PresenceHeartbeat } from "@/components/system/PresenceHeartbeat";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/" || path === "/login") return <>{children}</>;
  return <AppFrame>{children}</AppFrame>;
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const path = pathname.replace(/\/$/, "");
  const inMatch = /\/play\/[^/]+\/(casual\/(ai|passplay|online\/live)|ranked\/live)$/.test(path);
  return (
    <ProtectedRoute>
      <div className={`app-shell ${inMatch ? "app-shell-match" : ""}`}>
        <BackgroundMusicPlayer />
        <CoinTopupWatcher />
        <PresenceHeartbeat />
        {!inMatch && <SideNav />}
        <main className="app-shell-main">
          {!inMatch && <div className="app-shell-toolbar"><TopBar /></div>}
          {children}
        </main>
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
