import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

// Route metadata lives in a layout rather than the page because the page
// itself is a client component ("use client"), and Next only reads a
// metadata export from server components. The layout renders nothing of
// its own - it exists purely to give this route a real title, description
// and social preview instead of inheriting the generic site-wide one.
export const metadata: Metadata = {
  title: "Daily Rewards",
  description: "Claim your daily login reward and keep your streak alive.",
  // Signed-in-only surface - nothing here is useful in search results,
  // and per-player pages would dilute the pages that are.
  robots: { index: false, follow: true },
  openGraph: {
    title: "Daily Rewards — Thaasbai",
    description: "Claim your daily login reward and keep your streak alive.",
  },
};

export default function RewardsLayout({ children }: { children: React.ReactNode }) {
  return <PageShell>{children}</PageShell>;
}
