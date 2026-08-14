import type { Metadata } from "next";

// Route metadata lives in a layout rather than the page because the page
// itself is a client component ("use client"), and Next only reads a
// metadata export from server components. The layout renders nothing of
// its own - it exists purely to give this route a real title, description
// and social preview instead of inheriting the generic site-wide one.
export const metadata: Metadata = {
  title: "Settings",
  description: "Language, theme, sound and notification settings for Thaasbai.",
  // Signed-in-only surface - nothing here is useful in search results,
  // and per-player pages would dilute the pages that are.
  robots: { index: false, follow: true },
  openGraph: {
    title: "Settings — Thaasbai",
    description: "Language, theme, sound and notification settings for Thaasbai.",
  },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
