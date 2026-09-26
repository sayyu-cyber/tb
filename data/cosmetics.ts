// src/data/cosmetics.ts

import { CosmeticItem, CoinPack, RankConfig, Achievement, Rarity, RoomCardType } from '../types/economy';
// The single source of truth for rank thresholds - the same table
// getRankFromTrophies scores against. See RANK_CONFIGS below.
import { RANKS } from '../constants/ranks';

/**
 * Arena rarity colours (design/arena/APP_SCREENS.md, "Palette").
 *
 * The old ramp went grey / blue / purple / amber. Purple is gone from the
 * design, and its blue had been reassigned, so Epic moved to lime and Rare
 * to the Arena blue. `.rar.common` / `.rare` / `.epic` / `.legendary` in
 * styles/arena-app.css carry the same four values for markup that uses the
 * board's classes instead of these constants.
 */
export const RARITY_COLORS: Record<Rarity, string> = {
  Common: '#BEBECA',
  Rare: '#00BCC8',
  Epic: '#C6FF33',
  Legendary: '#FFC940',
};

export const RARITY_GLOW: Record<Rarity, string> = {
  Common: '0 0 10px rgba(190, 190, 202, 0.3)',
  Rare: '0 0 15px rgba(0, 188, 200, 0.4)',
  Epic: '0 0 20px rgba(198, 255, 51, 0.5)',
  Legendary: '0 0 25px rgba(255, 201, 64, 0.6)',
};

export const CARD_BACKS: CosmeticItem[] = [
  // The Arena back (design/arena — a blue lattice with a lime crown in a
  // black diamond) is the default for anyone who has not equipped one.
  // Classic Gold and the rest stay as alternatives, and a player who owns
  // and equips one still gets it.
  { id: 'cb_arena', name: 'Arena', category: 'cardBack', rarity: 'Common', price: 0, previewImage: '/cosmetics/cardbacks/arena.png', description: 'The house deck: blue lattice, lime crown.' },
  { id: 'cb_default', name: 'Classic Gold', category: 'cardBack', rarity: 'Common', price: 0, previewImage: '/cosmetics/cardbacks/classic-gold.png', description: 'The timeless golden standard.' },
  { id: 'cb_maldives', name: 'Maldives Sunset', category: 'cardBack', rarity: 'Common', price: 200, previewImage: '/cosmetics/cardbacks/maldives.png', description: 'Tropical vibes for every hand.' },
  { id: 'cb_ocean', name: 'Deep Ocean', category: 'cardBack', rarity: 'Rare', price: 500, previewImage: '/cosmetics/cardbacks/ocean.png', description: 'Dive into the depths.' },
  { id: 'cb_fire', name: 'Inferno', category: 'cardBack', rarity: 'Rare', price: 500, previewImage: '/cosmetics/cardbacks/inferno.png', description: 'Burn through the competition.' },
  { id: 'cb_frost', name: 'Frostbite', category: 'cardBack', rarity: 'Epic', price: 1200, previewImage: '/cosmetics/cardbacks/frostbite.png', description: 'Ice cold precision.' },
  { id: 'cb_shadow', name: 'Shadow Veil', category: 'cardBack', rarity: 'Epic', price: 1200, previewImage: '/cosmetics/cardbacks/shadow.png', description: 'Strike from the darkness.' },
  { id: 'cb_dragon', name: 'Dragon Scale', category: 'cardBack', rarity: 'Legendary', price: 3000, previewImage: '/cosmetics/cardbacks/dragon.png', description: 'Ancient power in every card.' },
  { id: 'cb_phoenix', name: 'Phoenix Rebirth', category: 'cardBack', rarity: 'Legendary', price: 3500, previewImage: '/cosmetics/cardbacks/phoenix.png', description: 'Rise from the ashes.' },
  { id: 'cb_vip_gold', name: 'VIP Royal Gold', category: 'cardBack', rarity: 'Legendary', price: 0, previewImage: '/cosmetics/cardbacks/vip-gold.png', description: 'Exclusively for VIP members.', isVipExclusive: true },
  { id: 'cb_neon', name: 'Neon Cyber', category: 'cardBack', rarity: 'Epic', price: 1500, previewImage: '/cosmetics/cardbacks/neon.png', description: 'Future-forward design.' },
  { id: 'cb_wood', name: 'Mahogany', category: 'cardBack', rarity: 'Common', price: 150, previewImage: '/cosmetics/cardbacks/mahogany.png', description: 'Classic wood finish.' },
  { id: 'cb_marble', name: 'White Marble', category: 'cardBack', rarity: 'Rare', price: 600, previewImage: '/cosmetics/cardbacks/marble.png', description: 'Sculpted perfection.' },
];

export const TABLE_THEMES: CosmeticItem[] = [
  { id: 'tt_default', name: 'Neon Arena', category: 'tableTheme', rarity: 'Common', price: 0, previewImage: '/cosmetics/tables/neon-arena.png', description: 'A dark competitive table with cyan and violet rim light.' },
  { id: 'tt_midnight', name: 'Midnight Black', category: 'tableTheme', rarity: 'Common', price: 300, previewImage: '/cosmetics/tables/midnight.png', description: 'Play in the dark.' },
  { id: 'tt_red', name: 'Crimson Velvet', category: 'tableTheme', rarity: 'Rare', price: 800, previewImage: '/cosmetics/tables/crimson.png', description: 'Luxury red felt.' },
  { id: 'tt_blue', name: 'Sapphire Blue', category: 'tableTheme', rarity: 'Rare', price: 800, previewImage: '/cosmetics/tables/sapphire.png', description: 'Cool blue elegance.' },
  { id: 'tt_gold', name: 'Golden Palace', category: 'tableTheme', rarity: 'Epic', price: 2000, previewImage: '/cosmetics/tables/golden-palace.png', description: 'Play like royalty.' },
  { id: 'tt_space', name: 'Cosmic Void', category: 'tableTheme', rarity: 'Legendary', price: 4000, previewImage: '/cosmetics/tables/cosmic.png', description: 'Cards among the stars.' },
  { id: 'tt_vip', name: 'VIP Lounge', category: 'tableTheme', rarity: 'Legendary', price: 0, previewImage: '/cosmetics/tables/vip-lounge.png', description: 'Members only.', isVipExclusive: true },
  { id: 'tt_wooden', name: 'Oak Tavern', category: 'tableTheme', rarity: 'Common', price: 250, previewImage: '/cosmetics/tables/oak.png', description: 'Rustic charm.' },
  { id: 'tt_ice', name: 'Frozen Lake', category: 'tableTheme', rarity: 'Epic', price: 1800, previewImage: '/cosmetics/tables/frozen.png', description: 'Cool under pressure.' },
  { id: 'tt_lava', name: 'Magma Flow', category: 'tableTheme', rarity: 'Epic', price: 1800, previewImage: '/cosmetics/tables/magma.png', description: 'Hot streaks only.' },
];

export const PROFILE_FRAMES: CosmeticItem[] = [
  { id: 'pf_default', name: 'Simple Border', category: 'profileFrame', rarity: 'Common', price: 0, previewImage: '/cosmetics/frames/simple.png', description: 'Clean and minimal.' },
  { id: 'pf_gold', name: 'Gold Trim', category: 'profileFrame', rarity: 'Common', price: 400, previewImage: '/cosmetics/frames/gold-trim.png', description: 'A touch of class.' },
  { id: 'pf_silver', name: 'Silver Crest', category: 'profileFrame', rarity: 'Rare', price: 1000, previewImage: '/cosmetics/frames/silver-crest.png', description: 'Prestigious silver.' },
  { id: 'pf_crown', name: 'Crown Jewel', category: 'profileFrame', rarity: 'Epic', price: 2500, previewImage: '/cosmetics/frames/crown.png', description: 'Wear the crown.' },
  { id: 'pf_dragon', name: 'Dragon Frame', category: 'profileFrame', rarity: 'Legendary', price: 5000, previewImage: '/cosmetics/frames/dragon.png', description: 'Legendary presence.' },
  { id: 'pf_vip', name: 'VIP Elite', category: 'profileFrame', rarity: 'Legendary', price: 0, previewImage: '/cosmetics/frames/vip-elite.png', description: 'VIP exclusive frame.', isVipExclusive: true },
  { id: 'pf_platinum', name: 'Platinum Shield', category: 'profileFrame', rarity: 'Epic', price: 3000, previewImage: '/cosmetics/frames/platinum.png', description: 'Elite status.' },
  { id: 'pf_master', name: 'Master Collector', category: 'profileFrame', rarity: 'Legendary', price: 0, earnedOnly: true, earnedFrom: 'Master Collector achievement', previewImage: '/cosmetics/frames/master.png', description: '100% collection reward.' },
  { id: 'pf_animated_gold', name: 'Animated Gold', category: 'profileFrame', rarity: 'Legendary', price: 0, earnedOnly: true, earnedFrom: 'Reward - not yet granted by anything', previewImage: '/cosmetics/frames/animated-gold.png', description: 'Shimmering excellence.' },
];

export const EMOTES: CosmeticItem[] = [
  { id: 'em_thumbs', name: 'Thumbs Up', category: 'emote', rarity: 'Common', price: 300, previewImage: '/cosmetics/emotes/thumbs.png', description: 'Well played!' },
  { id: 'em_laugh', name: 'Laugh', category: 'emote', rarity: 'Common', price: 300, previewImage: '/cosmetics/emotes/laugh.png', description: 'Good game!' },
  { id: 'em_cry', name: 'Tears', category: 'emote', rarity: 'Common', price: 300, previewImage: '/cosmetics/emotes/cry.png', description: 'So close...' },
  { id: 'em_rage', name: 'Rage', category: 'emote', rarity: 'Rare', price: 800, previewImage: '/cosmetics/emotes/rage.png', description: 'Unbelievable!' },
  { id: 'em_cool', name: 'Sunglasses', category: 'emote', rarity: 'Rare', price: 800, previewImage: '/cosmetics/emotes/cool.png', description: 'Too easy.' },
  { id: 'em_celebrate', name: 'Celebrate', category: 'emote', rarity: 'Epic', price: 1500, previewImage: '/cosmetics/emotes/celebrate.png', description: 'Victory dance!' },
  { id: 'em_king', name: 'King Bow', category: 'emote', rarity: 'Legendary', price: 3000, previewImage: '/cosmetics/emotes/king.png', description: 'All hail!' },
  { id: 'em_vip_salute', name: 'VIP Salute', category: 'emote', rarity: 'Legendary', price: 0, previewImage: '/cosmetics/emotes/vip-salute.png', description: 'VIP exclusive.', isVipExclusive: true },
];

export const VICTORY_ANIMATIONS: CosmeticItem[] = [
  { id: 'va_default', name: 'Classic Clap', category: 'victoryAnimation', rarity: 'Common', price: 0, previewImage: '/cosmetics/victory/classic.png', description: 'Standard applause.' },
  { id: 'va_fireworks', name: 'Fireworks', category: 'victoryAnimation', rarity: 'Rare', price: 1000, previewImage: '/cosmetics/victory/fireworks.png', description: 'Light up the sky.' },
  { id: 'va_confetti', name: 'Golden Confetti', category: 'victoryAnimation', rarity: 'Epic', price: 2500, previewImage: '/cosmetics/victory/confetti.png', description: 'Shower of gold.' },
  { id: 'va_dragon', name: 'Dragon Roar', category: 'victoryAnimation', rarity: 'Legendary', price: 5000, previewImage: '/cosmetics/victory/dragon.png', description: 'Hear them roar.' },
  { id: 'va_vip_crown', name: 'VIP Crown', category: 'victoryAnimation', rarity: 'Legendary', price: 0, previewImage: '/cosmetics/victory/vip-crown.png', description: 'VIP exclusive.', isVipExclusive: true },
];

export const STICKERS: CosmeticItem[] = [
  { id: 'st_gg', name: 'GG Sticker', category: 'sticker', rarity: 'Common', price: 150, previewImage: '/cosmetics/stickers/gg.png', description: 'Good game, well played.' },
  { id: 'st_nice', name: 'Nice Move', category: 'sticker', rarity: 'Common', price: 150, previewImage: '/cosmetics/stickers/nice.png', description: 'Smooth play.' },
  { id: 'st_oops', name: 'Oops', category: 'sticker', rarity: 'Rare', price: 400, previewImage: '/cosmetics/stickers/oops.png', description: 'It happens to the best of us.' },
  { id: 'st_mindi_gold', name: 'Golden Mindi', category: 'sticker', rarity: 'Epic', price: 1000, previewImage: '/cosmetics/stickers/mindi-gold.png', description: 'Captured all four Tens? Flex it.' },
  { id: 'st_vip_wink', name: 'VIP Wink', category: 'sticker', rarity: 'Legendary', price: 0, previewImage: '/cosmetics/stickers/vip-wink.png', description: 'VIP exclusive.', isVipExclusive: true },
];

export const BANNERS: CosmeticItem[] = [
  { id: 'bn_default', name: 'Classic Navy', category: 'banner', rarity: 'Common', price: 0, previewImage: '/cosmetics/banners/navy.png', description: 'A clean starting banner.' },
  { id: 'bn_maldives_wave', name: 'Maldives Wave', category: 'banner', rarity: 'Common', price: 350, previewImage: '/cosmetics/banners/wave.png', description: 'Turquoise waters banner.' },
  { id: 'bn_sunset', name: 'Golden Sunset', category: 'banner', rarity: 'Rare', price: 900, previewImage: '/cosmetics/banners/sunset.png', description: 'Warm gradient skies.' },
  { id: 'bn_royal', name: 'Royal Purple', category: 'banner', rarity: 'Epic', price: 2000, previewImage: '/cosmetics/banners/royal.png', description: 'For the ambitious.' },
  { id: 'bn_champion', name: "Champion's Banner", category: 'banner', rarity: 'Legendary', price: 0, earnedOnly: true, earnedFrom: 'Weekend League Champion', previewImage: '/cosmetics/banners/champion.png', description: 'Weekend League Champion reward.' },
  { id: 'bn_vip_gold', name: 'VIP Gold Rays', category: 'banner', rarity: 'Legendary', price: 0, previewImage: '/cosmetics/banners/vip-gold.png', description: 'VIP exclusive.', isVipExclusive: true },
];

export const ALL_COSMETICS = [
  ...CARD_BACKS,
  ...TABLE_THEMES,
  ...PROFILE_FRAMES,
  ...EMOTES,
  ...VICTORY_ANIMATIONS,
  ...STICKERS,
  ...BANNERS,
];

export const COIN_PACKS: CoinPack[] = [
  { id: 'pack_starter', name: 'Starter Pack', coins: 100, priceMVR: 10 },
  { id: 'pack_small', name: 'Small Pack', coins: 500, priceMVR: 40 },
  { id: 'pack_standard', name: 'Standard Pack', coins: 1500, priceMVR: 100, isPopular: true },
  { id: 'pack_premium', name: 'Premium Pack', coins: 4000, priceMVR: 250, isBestValue: true },
  { id: 'pack_mega', name: 'Mega Pack', coins: 10000, priceMVR: 500 },
];

// Coin prices for buying a Room Card directly, without waiting on daily
// login/missions/VIP grants. Placeholder pricing - intended to be editable
// from the admin panel's shop management once that exists.
export const ROOM_CARD_PRICES: Record<RoomCardType, number> = {
  '1h': 50,
  '3h': 120,
  '6h': 200,
  '24h': 350,
  '1w': 1500,
  '1m': 5000,
};

/**
 * Rank tiers: thresholds, weekly payout and colour.
 *
 * The thresholds used to be 0/500/1200/2500 here while `constants/ranks.ts`
 * said 0/25/50/75, and `constants/ranks.ts` is what the game actually
 * scores against - `getRankFromTrophies` reads it, and a win is worth
 * `TROPHY_WIN` (5). A player on 58 trophies was therefore Gold everywhere
 * except here, where this table still called them Bronze and paid a Bronze
 * weekly reward. At 5 trophies a win, 2,500 was roughly five hundred wins,
 * so Platinum's payout was unreachable in practice.
 *
 * The thresholds now come from `constants/ranks.ts` so there is one answer
 * to "what rank am I", and the colours are the Arena rank ramp that
 * `.rank.*` / `.rk.*` draw (design/arena/app-reference.css), so a tier is
 * the same colour in a badge and in a chart.
 *
 * Only the thresholds and colours changed. The payouts (50/150/350/700) and
 * the cosmetic rewards are as they were.
 */
export const RANK_CONFIGS: RankConfig[] = [
  { tier: 'Bronze', minTrophies: RANKS.BRONZE.min, color: '#E09A62', weeklyReward: 50, icon: '/ranks/bronze.png' },
  { tier: 'Silver', minTrophies: RANKS.SILVER.min, color: '#D2D6DA', weeklyReward: 150, icon: '/ranks/silver.png' },
  { tier: 'Gold', minTrophies: RANKS.GOLD.min, color: '#E6C24A', weeklyReward: 350, icon: '/ranks/gold.png', weeklyRewardCosmeticId: 'st_mindi_gold' },
  { tier: 'Platinum', minTrophies: RANKS.PLATINUM.min, color: '#E9ECEF', weeklyReward: 700, icon: '/ranks/platinum.png', weeklyRewardCosmeticId: 'pf_dragon' },
];

/**
 * How many cosmetics exist, in one category or in all of them.
 *
 * Declared after ALL_COSMETICS and before ACHIEVEMENTS, so the collection
 * targets are counted rather than written down.
 */
function countCosmetics(category?: CosmeticItem['category']) {
  return category ? ALL_COSMETICS.filter(item => item.category === category).length : ALL_COSMETICS.length;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'ach_first_win', title: 'First Win', description: 'Win your first match', icon: '🏆', reward: 50, unlocked: false, progress: 0, target: 1, category: 'wins' },
  { id: 'ach_10_wins', title: '10 Wins', description: 'Win 10 matches', icon: '🥉', reward: 100, unlocked: false, progress: 0, target: 10, category: 'wins' },
  { id: 'ach_50_wins', title: '50 Wins', description: 'Win 50 matches', icon: '🥈', reward: 500, unlocked: false, progress: 0, target: 50, category: 'wins' },
  { id: 'ach_100_wins', title: '100 Wins', description: 'Win 100 matches', icon: '🥇', reward: 1000, unlocked: false, progress: 0, target: 100, category: 'wins' },
  { id: 'ach_first_gold', title: 'First Gold Rank', description: 'Reach Gold rank for the first time', icon: '🌟', reward: 1000, unlocked: false, progress: 0, target: 1, category: 'rank' },
  { id: 'ach_first_platinum', title: 'First Platinum Rank', description: 'Reach Platinum rank for the first time', icon: '💎', reward: 2000, unlocked: false, progress: 0, target: 1, category: 'rank' },
  { id: 'ach_weekend_champ', title: 'Weekend Champion', description: 'Become Weekend Champion', icon: '👑', reward: 3000, unlocked: false, progress: 0, target: 1, category: 'special' },
  { id: 'ach_10_cardbacks', title: 'Card Collector', description: 'Collect 10 Card Backs', icon: '🃏', reward: 100, unlocked: false, progress: 0, target: 10, category: 'collection' },
  // Counted from the catalogue rather than written down. Table Master's
  // target was 10 against 10 tables, which happened to be right; Master
  // Collector's was 85 against 56 items, so "collect 100%" could never be
  // reached however much you bought (code issue 4 in
  // design/arena/APP_SCREENS.md). Deriving both means neither can drift
  // again when a cosmetic is added.
  { id: 'ach_all_tables', title: 'Table Master', description: 'Collect every Table Theme', icon: '◇', reward: 0, unlocked: false, progress: 0, target: countCosmetics('tableTheme'), category: 'collection' },
  { id: 'ach_100_collection', title: 'Master Collector', description: 'Collect 100% of all cosmetics', icon: '💯', reward: 0, unlocked: false, progress: 0, target: countCosmetics(), category: 'collection' },
];

// bonusItem is either the special "room_card_1h" token (handled directly in
// CLAIM_DAILY_REWARD) or a real cosmetic id from ALL_COSMETICS (granted
// generically via grantCosmetic in EconomyContext.tsx) - one of the earn
// sources for stickers/banners/etc you asked for.
export const DAILY_LOGIN_REWARDS = [
  { day: 1, coins: 25, bonusItem: undefined },
  { day: 2, coins: 50, bonusItem: undefined },
  { day: 3, coins: 75, bonusItem: 'st_gg' },
  { day: 4, coins: 100, bonusItem: undefined },
  { day: 5, coins: 125, bonusItem: 'bn_maldives_wave' },
  { day: 6, coins: 150, bonusItem: undefined },
  { day: 7, coins: 250, bonusItem: 'room_card_1h' },
];

export const DAILY_MISSION_TEMPLATES = [
  { id: 'dm_play_1', title: 'Play 1 Match', description: 'Play any match', target: 1, reward: 15, type: 'play_match' as const },
  { id: 'dm_win_1', title: 'Win 1 Match', description: 'Win any match', target: 1, reward: 30, type: 'win_match' as const },
  { id: 'dm_play_mindi', title: 'Play Mindi', description: 'Play a Mindi match', target: 1, reward: 20, type: 'play_game' as const, gameType: 'mindi' as const },
  { id: 'dm_play_gin', title: 'Play Gin Rummy', description: 'Play a Gin Rummy match', target: 1, reward: 20, type: 'play_game' as const, gameType: 'gin_rummy' as const },
  { id: 'dm_win_2', title: 'Win 2 Matches', description: 'Win 2 matches today', target: 2, reward: 50, type: 'win_matches' as const },
  { id: 'dm_play_3', title: 'Play 3 Matches', description: 'Play 3 matches today', target: 3, reward: 40, type: 'play_matches' as const },
];

export const WEEKLY_MISSION_TEMPLATES = [
  { id: 'wm_win_10', title: 'Win 10 Matches', description: 'Win 10 matches this week', target: 10, reward: 200, rewardCosmeticId: 'st_nice' },
  { id: 'wm_play_20', title: 'Play 20 Matches', description: 'Play 20 matches this week', target: 20, reward: 150 },
  { id: 'wm_reach_silver', title: 'Reach Silver', description: 'Achieve Silver rank', target: 1, reward: 300 },
  { id: 'wm_reach_gold', title: 'Reach Gold', description: 'Achieve Gold rank', target: 1, reward: 500, rewardCosmeticId: 'bn_sunset' },
  { id: 'wm_reach_platinum', title: 'Reach Platinum', description: 'Achieve Platinum rank', target: 1, reward: 1000, rewardCosmeticId: 'pf_platinum' },
  { id: 'wm_weekend_champ', title: 'Weekend Champion', description: 'Become Weekend Champion', target: 1, reward: 2000, rewardCosmeticId: 'bn_champion' },
];

/**
 * Can this cosmetic be bought with coins?
 *
 * CODE ISSUE 5. The Shop listed everything it wasn't told to hide, so the
 * three reward items - Master Collector, Animated Gold and Champion's
 * Banner - appeared with a price of 0 and could be claimed by anyone for
 * nothing. The starter items (Arena, Classic Gold, Neon Arena, Simple
 * Border, Classic Clap, Classic Navy) have no price either, and every
 * account already owns them.
 *
 * One rule covers all three cases: an item is for sale only if it has a
 * price, isn't VIP-exclusive and isn't a reward. Anything at zero is
 * granted, never sold.
 */
export function isPurchasable(item: CosmeticItem): boolean {
  return item.price > 0 && !item.isVipExclusive && !item.earnedOnly;
}
