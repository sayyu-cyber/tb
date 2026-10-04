import React from "react";

/**
 * Stand-ins for the contexts and hooks Home reads, so the screen can be
 * rendered without live backend services.
 *
 * The figures are the Home board's own sample data
 * (design/arena/boards/Home.dc.html): Sayyu, Gold, 58 trophies, 96 matches,
 * 54 wins, 12 friends, Season 9 with 4 days left, 1,240 coins, the Arena
 * back on the Neon Arena table. Feeding the board's numbers in is what
 * makes a screenshot comparable with the reference - with the app's own
 * zeroes the two would differ everywhere and the comparison would prove
 * nothing.
 *
 * Query flags pick a state: ?guest, ?live (mid-league), ?locked (ranks
 * locked), ?loading, ?error.
 */

const player = { uid: "test-home", displayName: "Sayyu", photoURL: null };
const flag = (name: string) => typeof location !== "undefined" && location.search.includes(name);

export function useAuth() {
  return {
    user: player,
    isGuest: flag("guest"),
    playerStats: { trophies: 58, totalMatches: 96, wins: 54, losses: 42, currentRank: "Gold" },
  };
}

export function useEconomy() {
  return {
    state: {
      economy: { coins: 1240 },
      profile: {
        vip: { active: false },
        equipped: { cardBack: "cb_arena", tableTheme: "tt_default" },
      },
    },
  };
}

export function useSettings() { return { settings: { language: "en" } }; }

export function useRankLock() {
  const live = flag("live") || flag("locked");
  return { isLocked: live, isWeekendLeague: live, isQualification: !live, nextUnlockTime: "Sun 00:05", currentDay: "Saturday" };
}

const endDate = new Date(Date.now() + 4 * 86_400_000);
export function useSeasonInfo() { return { seasonNumber: 9, name: "Season 9", endDate }; }

/** Twelve friends, so the Friends tile reads 12 as it does on the board. */
const friends = Array.from({ length: 12 }, (_, index) => ({ uid: `friend-${index}`, since: 0 }));

export function useHomeSocial() {
  return {
    friends: flag("loading") || flag("error") ? [] : friends,
    profiles: {},
    chats: [],
    online: [],
    loading: flag("loading"),
    error: flag("error"),
    retry: () => { location.search = ""; },
  };
}

/** The board's three Latest Updates cards, with its dates and copy. */
export function useNews() {
  return {
    loading: flag("loading"),
    news: flag("loading") ? [] : [
      { id: "n1", type: "announcement", title: "Season 1 Ranked Launch", date: new Date(2026, 6, 20), content: "The first competitive season is now live! Climb the ranks and earn exclusive rewards." },
      { id: "n2", type: "event", title: "Weekend League Returns", date: new Date(2026, 6, 18), content: "Join the Weekend League this Friday for double trophy rewards!" },
      { id: "n3", type: "update", title: "New Card Designs", date: new Date(2026, 6, 15), content: "Check out the new premium card backs available in the store." },
    ],
  };
}

export default function Link({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={href} {...props}>{children}</a>;
}

/** The phone top bar and rail read the route: this is Home. */
export function usePathname() { return "/home"; }

/** next/navigation's useRouter, for the covers' click handlers. */
export function useRouter() {
  return {
    push: (href: string) => { document.body.setAttribute("data-destination", href); },
    replace: () => {},
    prefetch: () => {},
    back: () => {},
  };
}
