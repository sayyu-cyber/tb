import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter_Tight, Noto_Sans_Thaana } from "next/font/google";
import "@/styles/globals.css";
// buttons.css carries the generic depth-only bevel for every plain <button>.
// It loads BEFORE the Arena sheets on purpose: its hover rule is
// `button:hover:not(:disabled)`, which outranks a single class, so anything
// that ties with it on specificity has to come later to win.
import "@/styles/buttons.css";
import "@/styles/arena.css";
// Generated from the design boards by scripts/port-board.mjs — the board's
// own CSS, namespaced and recoloured. Do not edit these by hand.
import "@/styles/arena-mindi.css";
import "@/styles/arena-gin-board.css";
import "@/styles/arena-lobby.css";
import "@/styles/arena-result.css";
import "@/styles/arena-phone.css";
// The shared app-screen layer: arena-app.css is generated from
// design/arena/app-reference.css, arena-shell.css is the hand-written half
// (fluid geometry the fixed artboards don't have to describe, and the
// existing shell retinted onto the board).
import "@/styles/arena-app.css";
import "@/styles/arena-shell.css";
// Per-board sheets for the app screens, generated the same way, plus the
// hand-written fluid half that the fixed artboards do not describe.
import "@/styles/arena-home.css";
import "@/styles/arena-screens.css";
// Owned by the second agent building the Friends/Clubs/Leaderboard/Settings
// screens (design/arena/WORKSPLIT.md). Imported here, empty, so that agent
// never has to edit this file and the two of us can't collide in it.
import "@/styles/arena-social.css";
import "@/styles/arena-compete.css";
import "@/styles/mindi.css";
import "@/styles/gin.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { EconomyProvider } from "@/contexts/EconomyContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { MotionProvider } from "@/components/system/MotionProvider";
import { AppShell } from "@/components/layout/AppShell";
import { RotateDeviceGate } from "@/components/layout/RotateDeviceGate";
import { DESKTOP_VIEWPORT_SCRIPT } from "@/lib/desktopViewport";
import { ViewportManager } from "@/components/system/ViewportManager";

/**
 * Arena typefaces (design/arena/README.md "Type").
 *
 * Exposed as CSS variables rather than class names because three families
 * have to coexist: --font-ui is the body default, --font-display drives the
 * tracked uppercase headlines and buttons, and --font-thaana carries Dhivehi
 * (މިންޑި, ޖިން ރަމީ) which the Latin faces cannot render at all.
 */
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
const ui = Inter_Tight({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-ui",
  display: "swap",
});
const thaana = Noto_Sans_Thaana({
  subsets: ["thaana"],
  weight: ["600", "700"],
  variable: "--font-thaana",
  display: "swap",
});

/**
 * Canonical origin. Used by metadataBase so the relative OG/Twitter image
 * paths below resolve to absolute URLs - social crawlers reject relative
 * ones. Override via NEXT_PUBLIC_SITE_URL when deploying to a custom
 * domain so previews don't keep pointing at the Netlify subdomain.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tsbai.netlify.app";

const DESCRIPTION =
  "Play Mindi and Gin Rummy online — ranked matches, private rooms with friends, clubs, and the Weekend League. The premium Maldivian card game experience.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // Child routes set only their own title; this appends the brand so
    // every tab and search result reads "<Page> — Thaasbai".
    default: "Thaasbai — The Home of Maldivian Card Games",
    template: "%s — Thaasbai",
  },
  description: DESCRIPTION,
  applicationName: "Thaasbai",
  keywords: ["Mindi", "Gin Rummy", "Maldivian card games", "Thaasbai", "online card game", "ranked card game"],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Thaasbai",
    title: "Thaasbai — The Home of Maldivian Card Games",
    description: DESCRIPTION,
    url: SITE_URL,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Thaasbai — The Home of Maldivian Card Games" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Thaasbai — The Home of Maldivian Card Games",
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // maximumScale/userScalable were previously pinned to block pinch-zoom
  // for an "app-like" feel. That's a WCAG 1.4.4 failure - it stops anyone
  // who needs to magnify text from doing so, and modern iOS ignores it on
  // form fields anyway. Zoom stays enabled; the layout is responsive
  // enough that it isn't needed for normal use.
  themeColor: "#0F0F0F",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head />
      {/* The three families ride as variables; the body font itself comes
          from Tailwind's `sans`, which now maps to var(--font-ui). */}
      <body className={`${display.variable} ${ui.variable} ${thaana.variable} font-sans`}>
        {/* First thing in <body>: the whole <head> (including Next's own
            viewport tag) is parsed by now, and nothing has painted yet, so
            a landscape phone gets the desktop layout on its very first
            frame instead of flashing the mobile one. */}
        <script dangerouslySetInnerHTML={{ __html: DESKTOP_VIEWPORT_SCRIPT }} />
        <MotionProvider><AuthProvider>
          <SettingsProvider>
            <EconomyProvider>
              {/* Innermost so any screen can raise a toast, and so the
                  toast stack renders above the app's own fixed chrome. */}
              <ToastProvider>
                {/* Re-asserts the desktop layout viewport after hydration
                    and after every navigation, both of which re-render the
                    head metadata and would otherwise reset it. */}
                <ViewportManager />
                {/* Outside AppShell so it also covers the landing and login
                    pages - portrait isn't a supported orientation anywhere,
                    not just once you're signed in. */}
                <RotateDeviceGate />
                <AppShell>{children}</AppShell>
              </ToastProvider>
            </EconomyProvider>
          </SettingsProvider>
        </AuthProvider></MotionProvider>
      </body>
    </html>
  );
}
