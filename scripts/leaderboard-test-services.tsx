// Isolated component-test services. Never imported by application code.
import React from 'react';

/**
 * Stand-ins for what the Leaderboard reads.
 *
 * The board is the Leaderboard board's own
 * (design/arena/boards/Leaderboard.dc.html): Nashid on 64, Rasheed 57,
 * Aishath 49, then the table down to Ismail on 27, with Sayyu tenth on 33.
 *
 * CODE ISSUE 8 lives here: `profile.rank` is deliberately left at Bronze,
 * as the app leaves it, while the player has 33 trophies - which is Silver.
 * The Weekly Rewards card must highlight Silver, not Bronze.
 *
 * Query flags: ?empty, ?failure, ?guest, ?nome (signed in but not on the
 * board yet), ?first (top of the board).
 */
const flag = (name: string) => new URLSearchParams(location.search).has(name);
const ME = 'test-self';

const ROWS = [
  { uid: 'nashid', username: 'Nashid', trophies: 64, currentRank: 'Platinum', totalMatches: 26, wins: 19, winPercentage: 73 },
  { uid: 'rasheed', username: 'Rasheed', trophies: 57, currentRank: 'Gold', totalMatches: 23, wins: 16, winPercentage: 70 },
  { uid: 'aishath', username: 'Aishath', trophies: 49, currentRank: 'Gold', totalMatches: 21, wins: 14, winPercentage: 67 },
  { uid: 'moosa', username: 'Moosa', trophies: 44, currentRank: 'Gold', totalMatches: 20, wins: 13, winPercentage: 65 },
  { uid: 'hawwa', username: 'Hawwa', trophies: 41, currentRank: 'Silver', totalMatches: 19, wins: 12, winPercentage: 63 },
  { uid: 'ali', username: 'Ali', trophies: 38, currentRank: 'Gold', totalMatches: 18, wins: 11, winPercentage: 61 },
  { uid: 'mariyam', username: 'Mariyam', trophies: 38, currentRank: 'Gold', totalMatches: 16, wins: 10, winPercentage: 63 },
  { uid: 'yoosuf', username: 'Yoosuf', trophies: 37, currentRank: 'Silver', totalMatches: 17, wins: 10, winPercentage: 59 },
  { uid: 'ibrahim', username: 'Ibrahim', trophies: 35, currentRank: 'Silver', totalMatches: 15, wins: 9, winPercentage: 60 },
  { uid: ME, username: 'Sayyu', trophies: 33, currentRank: 'Gold', totalMatches: 12, wins: 7, winPercentage: 58 },
  { uid: 'hussain', username: 'Hussain', trophies: 30, currentRank: 'Silver', totalMatches: 14, wins: 8, winPercentage: 57 },
  { uid: 'ismail', username: 'Ismail', trophies: 27, currentRank: 'Silver', totalMatches: 13, wins: 7, winPercentage: 54 },
].map((row, index) => ({ ...row, rank: index + 1 }));

export const useAuth = () => ({
  user: flag('guest') ? null : { uid: flag('nome') ? 'stranger' : flag('first') ? 'nashid' : ME, displayName: 'Sayyu' },
  isGuest: flag('guest'),
  // 33 trophies is Silver under constants/ranks.ts (0/25/50/75).
  playerStats: { trophies: 33 },
});

export const useEconomy = () => ({
  state: {
    // Deliberately stale, exactly as the app leaves it - code issue 2.
    profile: { rank: 'Bronze' },
    rankRewardOverrides: undefined,
  },
});

export const useHomeSocial = () => ({ friends: [], profiles: {}, chats: [], online: [], loading: false, error: false, retry: () => {} });
export const useTranslation = () => (key: string) => ({
  page_leaderboard: 'Leaderboard',
  leaderboard_yourRank: 'Your Rank',
  leaderboard_weeklyRewards: 'Weekly Rewards',
  leaderboard_rewardsByTier: 'Paid by rank tier, not placement.',
  leaderboard_searchLabel: 'Search players',
  leaderboard_searchPlaceholder: 'Search players…',
  leaderboard_you: 'You',
  leaderboard_noMatches: 'No players match your search.',
  leaderboard_emptyTitle: 'No one on the board yet',
  leaderboard_emptyBody: 'Play a ranked match to get things started.',
  leaderboard_emptyFriends: 'None of your friends are on the board yet',
  leaderboard_findFriends: 'Find friends',
  leaderboard_periodLabel: 'Leaderboard period',
  error_tryAgain: 'Try again',
}[key] || key);

export default function Link({ href, children, ...props }: any) { return <a href={href} {...props}>{children}</a>; }

export const useLeaderboard = () => ({
  entries: flag('empty') || flag('failure') ? [] : ROWS,
  loading: false,
  error: flag('failure') ? 'The leaderboard could not be loaded.' : null,
  refresh: () => { document.body.dataset.refreshed = 'yes'; },
  meta: { period: 'weekly', weekStartKey: '2026-09-21', nextResetAt: Date.now() + 38 * 3_600_000 },
});
export const getRankFromTrophies = (trophies: number) =>
  trophies >= 75 ? 'Platinum' : trophies >= 50 ? 'Gold' : trophies >= 25 ? 'Silver' : 'Bronze';
export const RANKS = {
  BRONZE: { name: 'Bronze', min: 0 }, SILVER: { name: 'Silver', min: 25 },
  GOLD: { name: 'Gold', min: 50 }, PLATINUM: { name: 'Platinum', min: 75 },
};
export const TROPHY_WIN = 5;
export const TROPHY_LOSS = -2;
