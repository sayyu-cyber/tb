import React from "react";

/**
 * Stand-ins for what the Mindi hand-over screen reads.
 *
 * Only two things reach outside the component: next/link and the
 * translation hook. Everything else the screen shows is passed in by its
 * caller, which is what makes it testable against the board.
 */

export function useTranslation() {
  return (key: string) => key;
}

export default function Link({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={href} {...props}>{children}</a>;
}
