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
      {/* ar-stage paints the arena behind everything: black, a receding
          violet-blue floor grid and two spotlight beams. It is drawn by
          pseudo-elements on a fixed layer, so it costs no DOM and cannot
          shift any page's layout. In-match screens draw their own table and
          opt out. */}
      {/* `arena-app` is the namespace the ported board CSS lives under
          (styles/arena-app.css). Putting it on the shell makes the board's
          own classes - .panel, .tabs, .pill, .ava, .cb, .tt - available to
          every screen inside it, which is what components/arena/* render.
          In-match screens keep it too: the table boards have their own
          namespaces, and the two don't overlap. */}
      <div className={`arena-app app-shell ${inMatch ? "app-shell-match" : "ar-stage"} ${premiumShell ? "app-shell-home" : ""}`}>
        <a className="app-skip-link" href="#app-content">Skip to content</a>
        <ConnectionNotice />
        <BackgroundMusicPlayer />
        <CoinTopupWatcher />
        <PresenceHeartbeat />
        {/* The nav comes AFTER the content in the DOM because it sits on the
            right of the screen, and reading order should follow the eye
            rather than be reversed by CSS. The skip link above still lands
            on the content first, and the rail is one Tab away after it.
            No bottom bar at any breakpoint - the rail is present at every
            screen size, so a second navigation surface would just be a
            duplicate eating vertical space on phones. */}
        <main className="app-shell-main" id="app-content" tabIndex={-1}>
          {!inMatch && <div className="app-shell-toolbar"><TopBar /></div>}
          {children}
        </main>
        {!inMatch && <AppSidebar />}
      </div>
      </HomeSocialProvider>
    </ProtectedRoute>
  );
}
