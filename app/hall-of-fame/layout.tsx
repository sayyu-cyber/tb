import type { Metadata } from "next";

// Route metadata lives in a layout rather than the page because the page
// itself is a client component ("use client"), and Next only reads a
// metadata export from server components. The layout renders nothing of
// its own - it exists purely to give this route a real title, description
// and social preview instead of inheriting the generic site-wide one.
export const metadata: Metadata = {
  title: "Hall of Fame",
  description: "The all-time greatest Thaasbai players, ranked by peak trophies.",
  openGraph: {
    title: "Hall of Fame — Thaasbai",
    description: "The all-time greatest Thaasbai players, ranked by peak trophies.",
  },
};

export default function HallOfFameLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
