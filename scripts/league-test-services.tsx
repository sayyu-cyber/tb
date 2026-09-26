// Isolated component-test services. Never imported by application code.
import React from 'react';

/**
 * Stand-ins for what the Weekend League reads.
 *
 * The standings are the League board's own
 * (design/arena/boards/League.dc.html): Nashid 64 down to Aminath 24, with
 * Sayyu tenth on 33.
 *
 * Query flags: ?closed (outside the window - the state code issue 9 is
 * about), ?bronze (not qualified), ?empty, ?failure.
 */
const flag = (name: string) => new URLSearchParams(location.search).has(name);
const ME = 'test-self';

const STANDINGS = [
  ['nashid', 'Nashid', 'Platinum', 64], ['rasheed', 'Rasheed', 'Gold', 57],
  ['aishath', 'Aishath', 'Gold', 49], ['moosa', 'Moosa', 'Gold', 44],
  ['hawwa', 'Hawwa', 'Silver', 41], ['ali', 'Ali', 'Gold', 38],
  ['mariyam', 'Mariyam', 'Gold', 38], ['yoosuf', 'Yoosuf', 'Silver', 37],
  ['ibrahim', 'Ibrahim', 'Silver', 35], [ME, 'Sayyu', 'Gold', 33],
  ['hussain', 'Hussain', 'Silver', 30], ['ismail', 'Ismail', 'Silver', 27],
  ['aminath', 'Aminath', 'Silver', 24],
].map(([uid, displayName, currentRank, weeklyTrophies]) => ({ uid, displayName, currentRank, weeklyTrophies }));

export const useAuth = () => ({
  user: { uid: ME, displayName: 'Sayyu' },
  playerStats: { trophies: flag('bronze') ? 12 : 58 },
});
export const useRouter = () => ({ push: (url: string) => { document.body.dataset.destination = url; } });
export const useTranslation = () => (key: string) => ({
  page_weekendLeague: 'Weekend League',
  tournament_noQualified: 'No qualified players yet this week.',
  tournament_notQualified: 'Reach Silver to qualify · {rank} · {trophies}',
  error_tryAgain: 'Try again',
}[key] || key);

export const QUALIFYING_RANKS = ['Silver', 'Gold', 'Platinum'];
export const isQualified = (rank: string) => QUALIFYING_RANKS.includes(rank);
export const getWeeklyStandings = async () => {
  if (flag('failure')) throw new Error('offline');
  return flag('empty') ? [] : STANDINGS;
};

/** ?closed puts the window in the future; otherwise it is running. */
export const getLeagueWindow = () => flag('closed')
  ? { live: false, boundary: new Date(Date.now() + 3 * 86_400_000 + 2 * 3_600_000), msRemaining: 3 * 86_400_000 + 2 * 3_600_000 }
  : { live: true, boundary: new Date(Date.now() + 8 * 3_600_000 + 42 * 60_000), msRemaining: 8 * 3_600_000 + 42 * 60_000 };
export const formatLeagueBoundary = (date: Date) =>
  date.toLocaleString('en-GB', { weekday: 'long', hour: '2-digit', minute: '2-digit' });

export const getRankFromTrophies = (trophies: number) =>
  trophies >= 75 ? 'Platinum' : trophies >= 50 ? 'Gold' : trophies >= 25 ? 'Silver' : 'Bronze';
export const RANKS = {
  BRONZE: { name: 'Bronze', min: 0 }, SILVER: { name: 'Silver', min: 25 },
  GOLD: { name: 'Gold', min: 50 }, PLATINUM: { name: 'Platinum', min: 75 },
};
export const TROPHY_WIN = 5;
export const TROPHY_LOSS = -2;
export default function Link({ href, children, ...props }: any) { return <a href={href} {...props}>{children}</a>; }
