// Isolated component-test services. Never imported by application code.
import React from 'react';
import { ACHIEVEMENTS, ALL_COSMETICS } from '@/data/cosmetics';
import { translate } from '@/lib/i18n';

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


/** Every cosmetic there is, by category - a finished collection. */
const every = (category: string) => ALL_COSMETICS.filter(item => item.category === category).map(item => item.id);
const everything = {
  cardBacks: every('cardBack'), tableThemes: every('tableTheme'), profileFrames: every('profileFrame'), emotes: every('emote'),
  victoryAnimations: every('victoryAnimation'), stickers: every('sticker'), banners: every('banner'),
};

export const useEconomy = () => ({
  state: {
    achievements: ACHIEVEMENTS,
    economy: { coins: 1240 },
    profile: {
      stats: {
        matchesWon: flag('none') ? 0 : flag('all') ? 500 : 54,
        highestRank: flag('none') ? 'Bronze' : flag('all') ? 'Platinum' : 'Gold',
        weekendChampion: flag('all'),
      },
      vip: { active: false },
      collection: flag('none')
        ? { cardBacks: [], tableThemes: [], profileFrames: [], emotes: [], victoryAnimations: [], stickers: [], banners: [] }
        : flag('all')
          ? everything
          // The boards' fifteen of fifty-six, by their real ids, so Master
          // Collector counts them (it only counts cosmetics that exist).
          : { cardBacks: ['cb_arena', 'cb_default', 'cb_maldives', 'cb_ocean'], tableThemes: ['tt_default', 'tt_midnight'], profileFrames: ['pf_default', 'pf_gold'], emotes: ['em_thumbs', 'em_laugh'], victoryAnimations: ['va_default'], stickers: ['st_gg', 'st_nice'], banners: ['bn_default', 'bn_maldives_wave'] },
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
}[key] || translate(key, 'en'));

/** What the phone shell reads: the player, and the route. */
export const useAuth = () => ({ user: { uid: 'test-self', displayName: 'Sayyu' }, isGuest: false, playerStats: { currentRank: 'Gold', trophies: 58 } });
export const usePathname = () => '/achievements';
export const useRouter = () => ({ push: (url: string) => { document.body.dataset.destination = url; }, replace: () => {}, back: () => {}, prefetch: () => {} });

export default function Link({ href, children, ...props }: any) { return <a href={href} {...props}>{children}</a>; }
