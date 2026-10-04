"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./sidebar/AppSidebar";
import { TopBar } from "./TopBar";
import { ProtectedRoute } from "./ProtectedRoute";
import { BackgroundMusicPlayer } from "@/components/audio/BackgroundMusicPlayer";
import { CoinTopupWatcher } from "@/components/economy/CoinTopupWatcher";
import { PresenceHeartbeat } from "@/components/system/PresenceHeartbeat";
import { HomeSocialProvider } from "@/contexts/HomeSocialContext";
import { ConnectionNotice } from "@/components/system/ConnectionNotice";
import { RotateGate } from "./RotateGate";
import { PhoneChrome } from "./phone/PhoneChrome";
import { MatchGateProvider } from "@/contexts/MatchGateContext";
import { releaseLandscape } from "@/lib/orientationLock";

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
  /* Only the screens INSIDE a match need landscape: the two card tables in
     every mode, spectating, and the hand result. They are a fixed picture of
     a wide table, and on a portrait phone that scales to about a quarter
     size and stops being playable.
     The Play lobby used to be here too. It is not any more - MPlay is its
     portrait composition (design/arena/MOBILE.md "Turning the phone"), so
     the turn is asked for at the Play button instead, when it starts to
     matter, and browsing works either way up. */
  const needsLandscape = inMatch;
  /* Give the orientation and fullscreen back the moment the player is out of
     a match - MOBILE.md: "When the player leaves the match, call
     screen.orientation.unlock(), and document.exitFullscreen() if the app
     entered fullscreen." Keyed on leaving rather than on a particular exit,
     so every way out of a table is covered: the gate's Leave table, the
     table's own back button, the hand result, and the browser's Back.
     Harmless when nothing was locked; both calls are no-ops then. */
  useEffect(() => { if (!inMatch) void releaseLandscape(); }, [inMatch]);

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
      {/* `arena-phone` is the namespace the phone boards were ported
          under, alongside `arena-app` for the desktop ones. Both sheets are
          on the shell and the media queries in arena-phone-shell.css decide
          which chrome is visible, so nothing here branches on width. */}
      {/* The rotate gate covers a LIVE table, so it has to say what is
          happening behind it. The table publishes the turn into this
          provider and the gate reads it; see contexts/MatchGateContext. It
          wraps both so the two are in the same tree. */}
      <MatchGateProvider>
      <div className={`arena-app arena-phone app-shell ${inMatch ? "app-shell-match" : "ar-stage"} ${premiumShell ? "app-shell-home" : ""}`}>
        <a className="app-skip-link" href="#app-content">Skip to content</a>
        {needsLandscape && <RotateGate />}
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
        {/* `arena-land land` is the landscape layer's root (styles/arena-land.css):
            the phone chrome and the phone screens carry it, never the shell,
            so its phone-sized buttons and tabs cannot reach the desktop. */}
        {!inMatch && <div className="phone-chrome arena-land land"><PhoneChrome /></div>}
      </div>
      </MatchGateProvider>
      </HomeSocialProvider>
    </ProtectedRoute>
  );
}
