import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

// Route metadata lives in a layout rather than the page because the page
// itself is a client component ("use client"), and Next only reads a
// metadata export from server components. The layout renders nothing of
// its own - it exists purely to give this route a real title, description
// and social preview instead of inheriting the generic site-wide one.
export const metadata: Metadata = {
  title: "Weekend League",
  description: "Silver rank and up, double trophies every match. Runs every Friday to Saturday.",
  openGraph: {
    title: "Weekend League — Thaasbai",
    description: "Silver rank and up, double trophies every match. Runs every Friday to Saturday.",
  },
};

export default function TournamentLayout({ children }: { children: React.ReactNode }) {
  return <PageShell>{children}</PageShell>;
}
