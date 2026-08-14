import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { EconomyProvider } from "@/contexts/EconomyContext";
import { ToastProvider } from "@/contexts/ToastContext";

const inter = Inter({ subsets: ["latin"], display: "swap" });

/**
 * Canonical origin. Used by metadataBase so the relative OG/Twitter image
 * paths below resolve to absolute URLs - social crawlers reject relative
 * ones. Override via NEXT_PUBLIC_SITE_URL when deploying to a custom
 * domain so previews don't keep pointing at the Netlify subdomain.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://thasbai.netlify.app";

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
    <html lang="en" className="dark">
      <head>
        {/* Applies the saved theme before first paint, so a returning
            light-theme user doesn't see a flash of dark theme while
            SettingsContext hydrates. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try {
              var s = JSON.parse(localStorage.getItem("thaasbai_settings") || "{}");
              if (s.darkTheme === false) document.documentElement.classList.add("light");
            } catch (e) {}`,
          }}
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <SettingsProvider>
            <EconomyProvider>
              {/* Innermost so any screen can raise a toast, and so the
                  toast stack renders above the app's own fixed chrome. */}
              <ToastProvider>{children}</ToastProvider>
            </EconomyProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}