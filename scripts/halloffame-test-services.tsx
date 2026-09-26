// Isolated component-test services. Never imported by application code.
import React from 'react';

/**
 * Stand-ins for what the Hall of Fame reads.
 *
 * The hall is the HallOfFame board's own
 * (design/arena/boards/HallOfFame.dc.html): Nashid 91, Rasheed 78, Aishath
 * 70 on the podium, then Ali down to Hawwa, with Sayyu fifth on 62.
 *
 * Query flags: ?empty, ?failure, ?two (only two legends - the case the
 * board cannot draw).
 */
const flag = (name: string) => new URLSearchParams(location.search).has(name);
const ME = 'test-self';

const ALL = [
  ['nashid', 'Nashid', 'Platinum', 91, 131, 193],
  ['rasheed', 'Rasheed', 'Platinum', 78, 118, 184],
  ['aishath', 'Aishath', 'Gold', 70, 102, 167],
  ['ali', 'Ali', 'Gold', 66, 97, 164],
  [ME, 'Sayyu', 'Gold', 62, 54, 96],
  ['mariyam', 'Mariyam', 'Gold', 60, 71, 122],
  ['moosa', 'Moosa', 'Gold', 57, 66, 120],
  ['ibrahim', 'Ibrahim', 'Gold', 53, 59, 104],
  ['hawwa', 'Hawwa', 'Gold', 51, 48, 89],
].map(([uid, displayName, highestRank, peakTrophies, wins, totalMatches]) =>
  ({ uid, displayName, highestRank, peakTrophies, wins, totalMatches, favoriteGame: null }));

export const useAuth = () => ({ user: { uid: ME, displayName: 'Sayyu' } });
export const useHallOfFame = () => ({
  entries: flag('empty') || flag('failure') ? [] : flag('two') ? ALL.slice(0, 2) : ALL,
  loading: false,
  error: flag('failure') ? 'The hall could not be loaded.' : null,
  refresh: () => { document.body.dataset.refreshed = 'yes'; },
});
export const useTranslation = () => (key: string) => ({
  page_hallOfFame: 'Hall of Fame',
  hof_allTimeGreats: 'All-Time Greats',
  hof_rankedByPeak: 'Ranked by peak trophies',
  hof_noLegendsYet: 'No legends yet. Be the first.',
  error_tryAgain: 'Try again',
}[key] || key);
export default function Link({ href, children, ...props }: any) { return <a href={href} {...props}>{children}</a>; }
