// Isolated component-test services. Never imported by application code.
import React from 'react';
import { ACHIEVEMENTS } from '@/data/cosmetics';

/**
 * Stand-ins for what Achievements reads.
 *
 * The state is the Achievements board's own
 * (design/arena/boards/Achievements.dc.html): 4 of 10 complete, with 54
 * wins, Gold reached, no Weekend Champion, and 15 of 56 cosmetics - which
 * resolves to First Win, 10 Wins, 50 Wins and First Gold Rank unlocked and
 * the rest locked, exactly as the board draws them.
 *
 * Query flags: ?none (nothing earned), ?all (everything earned).
 */
const flag = (name: string) => new URLSearchParams(location.search).has(name);

const owned = Array.from({ length: 15 }, (_, i) => 'x' + i);

export const useEconomy = () => ({
  state: {
    achievements: ACHIEVEMENTS,
    profile: {
      stats: {
        matchesWon: flag('none') ? 0 : flag('all') ? 500 : 54,
        highestRank: flag('none') ? 'Bronze' : flag('all') ? 'Platinum' : 'Gold',
        weekendChampion: flag('all'),
      },
      collection: flag('none')
        ? { cardBacks: [], tableThemes: [], profileFrames: [], emotes: [], victoryAnimations: [], stickers: [], banners: [] }
        : flag('all')
          ? { cardBacks: owned, tableThemes: owned, profileFrames: owned, emotes: owned, victoryAnimations: owned, stickers: owned, banners: owned }
          : { cardBacks: owned.slice(0, 4), tableThemes: owned.slice(0, 2), profileFrames: owned.slice(0, 2), emotes: owned.slice(0, 2), victoryAnimations: owned.slice(0, 1), stickers: owned.slice(0, 2), banners: owned.slice(0, 2) },
    },
  },
});

export const useTranslation = () => (key: string) => ({
  page_achievements: 'Achievements',
  ach_catAll: 'All',
  ach_catGameplay: 'Gameplay',
  ach_catRanks: 'Ranks',
  ach_catCollections: 'Collections',
  ach_catSpecial: 'Special',
}[key] || key);

export default function Link({ href, children, ...props }: any) { return <a href={href} {...props}>{children}</a>; }
