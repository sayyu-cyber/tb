import type { Metadata } from "next";

// Route metadata lives in a layout rather than the page because the page
// itself is a client component ("use client"), and Next only reads a
// metadata export from server components. The layout renders nothing of
// its own - it exists purely to give this route a real title, description
// and social preview instead of inheriting the generic site-wide one.
export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in or create a Thaasbai account to play ranked Mindi and Gin Rummy online.",
  openGraph: {
    title: "Sign In — Thaasbai",
    description: "Sign in or create a Thaasbai account to play ranked Mindi and Gin Rummy online.",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
