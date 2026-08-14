import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";

// Route metadata lives in a layout rather than the page because the page
// itself is a client component ("use client"), and Next only reads a
// metadata export from server components. The layout renders nothing of
// its own - it exists purely to give this route a real title, description
// and social preview instead of inheriting the generic site-wide one.
export const metadata: Metadata = {
  title: "Shop",
  description: "Cosmetics, coin packs and the VIP Pass.",
  openGraph: {
    title: "Shop — Thaasbai",
    description: "Cosmetics, coin packs and the VIP Pass.",
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <PageShell>{children}</PageShell>;
}
