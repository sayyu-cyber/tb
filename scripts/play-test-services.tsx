import React from "react";

/**
 * Stand-ins for what the Play lobby reads.
 *
 * The player is the Lobby board's own (design/arena/boards/Lobby.dc.html):
 * Sayyu, Gold, 58 trophies - which is what makes the rank bar land on the
 * board's 32% with "17 to Platinum" beside it, so the screenshot and
 * screens/lobby-01-mindi.jpg can be compared directly.
 *
 * Query flags: ?guest (signed out), ?off (the league is not running),
 * ?found (a table formed while looking).
 */

const flag = (name: string) => typeof location !== "undefined" && location.search.includes(name);

export function useAuth() {
  return {
    user: { uid: "lobby-test", displayName: "Sayyu" },
    isGuest: flag("guest"),
    playerStats: { trophies: 58, currentRank: "Gold" },
  };
}

export function useTranslation() {
  const strings: Record<string, string> = {
    page_weekendLeague: "Weekend League",
    gamesel_signInCasualOnline: "Sign in for Casual Online matches",
    gamesel_signInRanked: "Please sign in to access Ranked Mode",
    gamesel_signInPrivateRooms: "Please sign in to use Private Rooms",
    rankedq_matchFound: "Match Found!",
    rankedq_starting: "Starting {label}…",
  };
  return (key: string) => strings[key] ?? key;
}

/**
 * The real queue talks to Firestore, so the fixture records whether the
 * lobby asked for it instead. `data-queue` is the game being looked for,
 * or "off" - which is how the check proves that "Tap again to stop
 * looking" really does leave the queue.
 */
export function useCasualQueue(gameId: string, active: boolean) {
  if (typeof document !== "undefined") document.body.dataset.queue = active ? gameId : "off";
  return {
    matchFound: active && flag("found"),
    error: null as string | null,
    label: gameId === "mindi" ? "Mindi" : "Gin Rummy",
    neededPlayers: gameId === "mindi" ? 4 : 2,
  };
}

/** A fixed window, so the copy under the league panel never drifts. */
export function getLeagueWindow() {
  const live = !flag("off");
  return {
    live,
    boundary: new Date(live ? "2026-09-27T00:05:00" : "2026-10-01T23:59:00"),
    msRemaining: 3_600_000,
  };
}

export function formatLeagueBoundary(date: Date): string {
  return date.toLocaleString("en-US", { weekday: "long", hour: "2-digit", minute: "2-digit" });
}

export default function Link({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={href} {...props}>{children}</a>;
}
