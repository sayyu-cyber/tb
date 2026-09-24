"use client";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./sidebar/AppSidebar";
import { TopBar } from "./TopBar";
import { ProtectedRoute } from "./ProtectedRoute";
import { BackgroundMusicPlayer } from "@/components/audio/BackgroundMusicPlayer";
import { CoinTopupWatcher } from "@/components/economy/CoinTopupWatcher";
import { PresenceHeartbeat } from "@/components/system/PresenceHeartbeat";
import { HomeSocialProvider } from "@/contexts/HomeSocialContext";
import { ConnectionNotice } from "@/components/system/ConnectionNotice";

/**
 * Routes that render with no app chrome and, crucially, OUTSIDE
 * ProtectedRoute. The legal pages are here because Google Play and the App
 * Store both require a privacy policy a reviewer can open at a plain URL
 * while signed out - behind a login wall it fails review.
 */
const PUBLIC_PATHS = new Set(["/", "/login", "/privacy", "/terms"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const path = pathname.replace(/\/$/, "") || "/";
  if (PUBLIC_PATHS.has(path)) return <>{children}</>;
  return <AppFrame>{children}</AppFrame>;
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const path = pathname.replace(/\/$/, "");
  const inMatch = /\/play\/[^/]+\/(casual\/(ai|passplay|online\/live)|ranked\/live)$/.test(path) || path === '/spectate';
  const roomShell = /^\/play\/[^/]+\/room$/.test(path);
  const premiumShell = path === "/home" || path === "/shop" || path === "/clubs" || path === "/settings" || roomShell;
  return (
    <ProtectedRoute>
      {/* The sidebar's Online Players / Active Chats widgets live on every
          shell page now, not just the premium ones, so the social
          subscriptions follow them. In-match screens have no sidebar and
          stay unsubscribed. */}
      <HomeSocialProvider enabled={!inMatch}>
      <div className={`app-shell ${inMatch ? "app-shell-match" : ""} ${premiumShell ? "app-shell-home" : ""}`}>
        <a className="app-skip-link" href="#app-content">Skip to content</a>
        <ConnectionNotice />
        <BackgroundMusicPlayer />
        <CoinTopupWatcher />
        <PresenceHeartbeat />
        {/* No bottom bar at any breakpoint - the sidebar rail is present on
            every screen size, so a second navigation surface would just be
            a duplicate eating vertical space on phones. */}
        {!inMatch && <AppSidebar />}
        <main className="app-shell-main" id="app-content" tabIndex={-1}>
          {!inMatch && <div className="app-shell-toolbar"><TopBar /></div>}
          {children}
        </main>
      </div>
      </HomeSocialProvider>
    </ProtectedRoute>
  );
}
