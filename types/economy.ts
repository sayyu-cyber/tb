// src/types/economy.ts

export interface CoinTransaction {
  id: string;
  amount: number;
  type: 'earn' | 'spend';
  source: CoinSource;
  description: string;
  timestamp: number;
}

export type CoinSource =
  | 'match_victory'
  | 'match_defeat'
  | 'daily_login'
  | 'weekly_rank'
  | 'daily_mission'
  | 'weekly_mission'
  | 'achievement'
  | 'purchase'
  | 'bonus';

export interface PlayerEconomy {
  coins: number;
  transactions: CoinTransaction[];
  totalEarned: number;
  totalSpent: number;
}

// ─── COSMETICS ───────────────────────────────────────

export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export type CosmeticCategory = 
  | 'cardBack' 
  | 'tableTheme' 
  | 'profileFrame' 
  | 'emote' 
  | 'victoryAnimation';

export interface CosmeticItem {
  id: string;
  name: string;
  category: CosmeticCategory;
  rarity: Rarity;
  price: number;
  previewImage: string;
  description: string;
  isVipExclusive?: boolean;
  isFeatured?: boolean;
}

export interface OwnedCosmetic extends CosmeticItem {
  acquiredAt: number;
}

export interface CollectionProgress {
  category: CosmeticCategory;
  owned: number;
  total: number;
  percentage: number;
}

// ─── MISSIONS ────────────────────────────────────────

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  reward: number;
  type: 'play_match' | 'win_match' | 'play_game' | 'win_matches' | 'play_matches' | 'invite_friend' | 'use_emote';
  gameType?: 'mindi' | 'gin_rummy';
}

export interface WeeklyMission {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  reward: number;
}

export interface MissionState {
  daily: DailyMission[];
  weekly: WeeklyMission[];
  dailyCompletedAll: boolean;
  dailyAllBonus: number;
  lastDailyReset: number;
  lastWeeklyReset: number;
}

// ─── ACHIEVEMENTS ────────────────────────────────────

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  reward: number;
  unlocked: boolean;
  unlockedAt?: number;
  progress: number;
  target: number;
  category: 'wins' | 'rank' | 'collection' | 'special';
}

// ─── VIP ─────────────────────────────────────────────

export interface VipPass {
  active: boolean;
  activatedAt: number;
  expiresAt: number;
  remainingDays: number;
}

export interface VipBenefits {
  rankedMatchesPerDay: number;
  vipBadge: boolean;
  exclusiveFrame: boolean;
  vipShopSection: boolean;
  roomCard24h: boolean;
  exclusiveCosmetics: boolean;
}

// ─── ROOM CARDS ──────────────────────────────────────

export interface RoomCard {
  id: string;
  type: '1h' | '24h';
  duration: number;
  activated: boolean;
  activatedAt?: number;
  expiresAt?: number;
  remainingTime?: number;
}

// ─── SHOP ────────────────────────────────────────────

export interface ShopItem extends CosmeticItem {
  isPermanent: boolean;
  isFeatured: boolean;
  featuredUntil?: number;
}

export interface CoinPack {
  id: string;
  name: string;
  coins: number;
  priceMVR: number;
  isPopular?: boolean;
  isBestValue?: boolean;
}

export interface WeeklyShopRotation {
  featuredItems: ShopItem[];
  refreshTime: number;
  nextRefresh: number;
}

// ─── REWARDS ─────────────────────────────────────────

export interface MatchReward {
  coins: number;
  trophyChange: number;
  isVictory: boolean;
}

export interface RankReward {
  rank: string;
  coins: number;
  rankColor: string;
}

export interface DailyLoginReward {
  day: number;
  coins: number;
  bonusItem?: string;
  claimed: boolean;
}

export interface RewardPopup {
  id: string;
  type: 'match' | 'rank' | 'daily_login' | 'mission' | 'achievement' | 'vip' | 'purchase' | 'collection';
  title: string;
  items: RewardItem[];
  timestamp: number;
}

export interface RewardItem {
  type: 'coins' | 'cosmetic' | 'roomCard' | 'title' | 'badge';
  name: string;
  amount?: number;
  itemId?: string;
  rarity?: Rarity;
}

// ─── PLAYER ──────────────────────────────────────────

export interface PlayerProfile {
  uid: string;
  displayName: string;
  avatar: string;
  title: string;
  coins: number;
  trophies: number;
  rank: string;
  rankColor: string;
  vip: VipPass;
  equipped: {
    cardBack: string;
    tableTheme: string;
    profileFrame: string;
    title: string;
    victoryAnimation: string;
  };
  stats: {
    matchesPlayed: number;
    matchesWon: number;
    winRate: number;
    highestRank: string;
    weekendChampion: boolean;
  };
  collection: {
    cardBacks: string[];
    tableThemes: string[];
    profileFrames: string[];
    emotes: string[];
    victoryAnimations: string[];
  };
  achievements: string[];
  roomCards: RoomCard[];
  loginStreak: number;
  lastLoginDate: string;
}

// ─── RANK ────────────────────────────────────────────

export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface RankConfig {
  tier: RankTier;
  minTrophies: number;
  color: string;
  weeklyReward: number;
  icon: string;
}
