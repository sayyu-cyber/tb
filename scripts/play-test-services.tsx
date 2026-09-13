import React from "react";
export function useAuth() { return { isGuest: location.search.includes("guest") }; }
export function useEconomy() { return { state: { profile: { equipped: { cardBack: "cb_neon" } } } }; }
export function useSettings() { return { settings: { language: "en" } }; }
export function useRankLock() { return { isWeekendLeague: location.search.includes("live") }; }
export default function Link({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={href} {...props}>{children}</a>;
}
