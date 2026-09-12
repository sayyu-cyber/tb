import { Fragment } from "react";

// The root layout owns the persistent app shell across every route group.
export function MainLayout({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
