import React from "react";
const player = { uid: "test-home", displayName: "Sayyu" };
export function useAuth() { return { user: player, isGuest: location.search.includes("guest"), playerStats: { trophies:0, totalMatches:8, wins:0, currentRank:"Bronze" } }; }
export function useEconomy() { return { state: { profile: { vip: { active:false }, equipped: { cardBack:"cb_neon", tableTheme:"tt_default" } } } }; }
export function useSettings() { return { settings: { language:"en" } }; }
export function useRankLock() { return { isLocked:false, isWeekendLeague:location.search.includes("live"), nextUnlockTime:"Sunday" }; }
const endDate = new Date(2026, 8, 30);
export function useSeasonInfo() { return { name:"Season 9", endDate }; }
export function useHomeSocial() {
  return { friends:[], profiles:{}, chats:[], online:[], loading:location.search.includes("loading"), error:location.search.includes("error"), retry:() => { location.search = ""; } };
}
export default function Link({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) { return <a href={href} {...props}>{children}</a>; }
