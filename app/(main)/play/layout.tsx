import type { Metadata } from "next";

// Route metadata lives in a layout rather than the page because the page
// itself is a client component ("use client"), and Next only reads a
// metadata export from server components. The layout renders nothing of
// its own - it exists purely to give this route a real title, description
// and social preview instead of inheriting the generic site-wide one.
export const metadata: Metadata = {
  title: "Play",
  description: "Choose Mindi or Gin Rummy — play casually against AI, online, or ranked with friends.",
  openGraph: {
    title: "Play — Thaasbai",
    description: "Choose Mindi or Gin Rummy — play casually against AI, online, or ranked with friends.",
  },
};

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
