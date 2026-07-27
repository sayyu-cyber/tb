// contexts/EconomyContext.tsx
'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import {
  PlayerEconomy, CoinTransaction, CoinSource, PlayerProfile,
  RoomCard, RoomCardType, ROOM_CARD_DURATION_HOURS, DailyMission, WeeklyMission, Achievement,
  DailyLoginReward, RewardPopup, RewardItem
} from '../types/economy';
import { 
  DAILY_LOGIN_REWARDS, DAILY_MISSION_TEMPLATES, WEEKLY_MISSION_TEMPLATES,
  ACHIEVEMENTS, COIN_PACKS, ALL_COSMETICS, ROOM_CARD_PRICES, RANK_CONFIGS
} from '../data/cosmetics';
import {
  MissionRewardOverrides,
  RankRewardOverrides,
  ShopOverrides,
  watchMissionRewardOverrides,
  watchRankRewardOverrides,
  watchShopOverrides,
} from '../lib/admin';

// ─── ACTIONS ─────────────────────────────────────────
type EconomyAction =
  | { type: 'ADD_COINS'; payload: { amount: number; source: CoinSource; description: string } }
  | { type: 'SPEND_COINS'; payload: { amount: number; description: string } }
  | { type: 'COMPLETE_MISSION'; payload: { missionId: string; isWeekly: boolean } }
  | { type: 'CLAIM_DAILY_REWARD'; payload: { day: number } }
  | { type: 'ACTIVATE_VIP'; payload: { days: number } }
  | { type: 'ACTIVATE_ROOM_CARD'; payload: { cardId: string } }
  | { type: 'PURCHASE_COSMETIC'; payload: { itemId: string } }
  | { type: 'EQUIP_COSMETIC'; payload: { category: string; itemId: string } }
  | { type: 'UNLOCK_ACHIEVEMENT'; payload: { achievementId: string } }
  | { type: 'UPDATE_PROGRESS'; payload: { key: string; value: number } }
  | { type: 'ADD_ROOM_CARD'; payload: { type: RoomCardType } }
  | { type: 'PURCHASE_ROOM_CARD'; payload: { type: RoomCardType; price: number } }
  | { type: 'GRANT_COSMETIC'; payload: { itemId: string } }
  | { type: 'SET_MISSION_REWARD_OVERRIDES'; payload: MissionRewardOverrides | null }
  | { type: 'SET_RANK_REWARD_OVERRIDES'; payload: RankRewardOverrides | null }
  | { type: 'SET_SHOP_OVERRIDES'; payload: ShopOverrides | null }
  | { type: 'SHOW_REWARD'; payload: RewardPopup }
  | { type: 'CLEAR_REWARD'; payload: string }
  | { type: 'RESET_DAILY_MISSIONS' }
  | { type: 'RESET_WEEKLY_MISSIONS' }
  | { type: 'CHECK_VIP_EXPIRY' }
  | { type: 'CHECK_ROOM_CARDS' }
  | { type: 'SET_STATE'; payload: EconomyState };

// ─── STATE ───────────────────────────────────────────
interface EconomyState {
  profile: PlayerProfile;
  economy: PlayerEconomy;
  missions: {
    daily: DailyMission[];
    weekly: WeeklyMission[];
    dailyAllBonus: number;
    lastDailyReset: number;
    lastWeeklyReset: number;
  };
  achievements: Achievement[];
  dailyLogin: {
    streak: number;
    lastClaimed: number;
    rewards: DailyLoginReward[];
  };
  rewardPopups: RewardPopup[];
  weeklyRankReward: {
    lastRank: string;
    lastClaimed: number;
    pending: boolean;
  };
  /** Admin panel overrides (lib/admin.ts) - null until the first load
   *  completes; reducer cases that pay out missions/ranked rewards read
   *  from here so admin edits apply retroactively to already-generated
   *  missions (matched by templateId), not just newly-generated ones. */
  missionRewardOverrides: MissionRewardOverrides | null;
  rankRewardOverrides: RankRewardOverrides | null;
  shopOverrides: ShopOverrides | null;
}

const generateDailyMissions = (): DailyMission[] => {
  const shuffled = [...DAILY_MISSION_TEMPLATES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map((template, index) => ({
    ...template,
    progress: 0,
    completed: false,
    id: `${template.id}_${Date.now()}_${index}`,
    templateId: template.id,
  }));
};

const generateWeeklyMissions = (): WeeklyMission[] => {
  const shuffled = [...WEEKLY_MISSION_TEMPLATES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map((template, index) => ({
    ...template,
    progress: 0,
    completed: false,
    id: `${template.id}_${Date.now()}_${index}`,
    templateId: template.id,
  }));
};

const initialDailyLoginRewards = DAILY_LOGIN_REWARDS.map(r => ({ ...r, claimed: false }));

const initialState: EconomyState = {
  profile: {
    uid: '',
    displayName: 'Player',
    avatar: '/avatars/default.png',
    title: 'Novice',
    coins: 100,
    trophies: 0,
    rank: 'Bronze',
    rankColor: '#CD7F32',
    vip: { active: false, activatedAt: 0, expiresAt: 0, remainingDays: 0 },
    equipped: {
      cardBack: 'cb_default',
      tableTheme: 'tt_default',
      profileFrame: 'pf_default',
      title: 'Novice',
      victoryAnimation: 'va_default',
      banner: 'bn_default',
    },
    stats: { matchesPlayed: 0, matchesWon: 0, winRate: 0, highestRank: 'Bronze', weekendChampion: false },
    collection: {
      cardBacks: ['cb_default'],
      tableThemes: ['tt_default'],
      profileFrames: ['pf_default'],
      emotes: [],
      victoryAnimations: ['va_default'],
      stickers: [],
      banners: ['bn_default'],
    },
    achievements: [],
    roomCards: [],
    loginStreak: 0,
    lastLoginDate: '',
  },
  economy: {
    coins: 100,
    transactions: [],
    totalEarned: 100,
    totalSpent: 0,
  },
  missions: {
    daily: generateDailyMissions(),
    weekly: generateWeeklyMissions(),
    dailyAllBonus: 50,
    lastDailyReset: Date.now(),
    lastWeeklyReset: Date.now(),
  },
  achievements: [...ACHIEVEMENTS],
  dailyLogin: {
    streak: 0,
    lastClaimed: 0,
    rewards: initialDailyLoginRewards,
  },
  rewardPopups: [],
  weeklyRankReward: {
    lastRank: 'Bronze',
    lastClaimed: 0,
    pending: false,
  },
  missionRewardOverrides: null,
  rankRewardOverrides: null,
  shopOverrides: null,
};

const STORAGE_KEY = 'thaasbai-economy-state';

function isNewDay(lastTimestamp: number): boolean {
  const last = new Date(lastTimestamp);
  const now = new Date();
  return last.getDate() !== now.getDate() || 
         last.getMonth() !== now.getMonth() || 
         last.getFullYear() !== now.getFullYear();
}

function isNewWeek(lastTimestamp: number): boolean {
  const last = new Date(lastTimestamp);
  const now = new Date();
  const daysSinceLast = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceLast >= 7 || (now.getDay() === 0 && last.getDay() !== 0);
}

// Maps a cosmetic's category to its collection array key - shared by every
// place that grants or reads owned cosmetics (purchase, equip, and now the
// various earn sources below).
const CATEGORY_TO_COLLECTION_KEY: Record<string, keyof PlayerProfile['collection']> = {
  cardBack: 'cardBacks',
  tableTheme: 'tableThemes',
  profileFrame: 'profileFrames',
  emote: 'emotes',
  victoryAnimation: 'victoryAnimations',
  sticker: 'stickers',
  banner: 'banners',
};

/**
 * Grants a cosmetic item directly (no coin cost) - the shared path for every
 * "earn source" you asked for: daily login bonus items, weekly mission
 * rewards, and ranked/Weekend League weekly rewards. Returns the same
 * collection object unchanged if the id isn't a real cosmetic (e.g. it's the
 * special "room_card_1h" token, handled separately) or is already owned.
 */
function grantCosmeticToCollection(
  collection: PlayerProfile['collection'],
  itemId: string | undefined
): PlayerProfile['collection'] {
  if (!itemId) return collection;
  const item = ALL_COSMETICS.find(c => c.id === itemId);
  if (!item) return collection;
  const key = CATEGORY_TO_COLLECTION_KEY[item.category];
  if (!key || collection[key].includes(itemId)) return collection;
  return { ...collection, [key]: [...collection[key], itemId] };
}

// ─── REDUCER ─────────────────────────────────────────
function economyReducer(state: EconomyState, action: EconomyAction): EconomyState {
  switch (action.type) {
    case 'ADD_COINS': {
      const { amount, source, description } = action.payload;
      const transaction: CoinTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount,
        type: 'earn',
        source,
        description,
        timestamp: Date.now(),
      };
      return {
        ...state,
        profile: { ...state.profile, coins: state.profile.coins + amount },
        economy: {
          ...state.economy,
          coins: state.economy.coins + amount,
          transactions: [transaction, ...state.economy.transactions].slice(0, 100),
          totalEarned: state.economy.totalEarned + amount,
        },
      };
    }

    case 'SPEND_COINS': {
      const { amount, description } = action.payload;
      if (state.economy.coins < amount) return state;
      const transaction: CoinTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount,
        type: 'spend',
        source: 'purchase',
        description,
        timestamp: Date.now(),
      };
      return {
        ...state,
        profile: { ...state.profile, coins: state.profile.coins - amount },
        economy: {
          ...state.economy,
          coins: state.economy.coins - amount,
          transactions: [transaction, ...state.economy.transactions].slice(0, 100),
          totalSpent: state.economy.totalSpent + amount,
        },
      };
    }

    case 'COMPLETE_MISSION': {
      const { missionId, isWeekly } = action.payload;
      if (isWeekly) {
        const weekly = state.missions.weekly.map(m =>
          m.id === missionId ? { ...m, completed: true } : m
        );
        const completedMission = weekly.find(m => m.id === missionId);
        if (!completedMission) return state;
        // Admin panel's per-mission reward override (lib/admin.ts), keyed
        // by the stable templateId rather than the per-instance id, so an
        // edit applies even to a mission that was already generated.
        const reward = state.missionRewardOverrides?.weeklyRewards[completedMission.templateId] ?? completedMission.reward;
        return {
          ...state,
          missions: { ...state.missions, weekly },
          profile: {
            ...state.profile,
            coins: state.profile.coins + reward,
            collection: grantCosmeticToCollection(state.profile.collection, completedMission.rewardCosmeticId),
          },
          economy: {
            ...state.economy,
            coins: state.economy.coins + reward,
            totalEarned: state.economy.totalEarned + reward,
          },
        };
      } else {
        const daily = state.missions.daily.map(m =>
          m.id === missionId ? { ...m, completed: true } : m
        );
        const completedMission = daily.find(m => m.id === missionId);
        if (!completedMission) return state;
        const reward = state.missionRewardOverrides?.dailyRewards[completedMission.templateId] ?? completedMission.reward;
        const allDailyComplete = daily.every(m => m.completed);
        const bonus = allDailyComplete && !state.missions.daily.every(m => m.completed) ? state.missions.dailyAllBonus : 0;
        return {
          ...state,
          missions: { ...state.missions, daily },
          profile: { ...state.profile, coins: state.profile.coins + reward + bonus },
          economy: {
            ...state.economy,
            coins: state.economy.coins + reward + bonus,
            totalEarned: state.economy.totalEarned + reward + bonus,
          },
        };
      }
    }

    case 'CLAIM_DAILY_REWARD': {
      const { day } = action.payload;
      const reward = state.dailyLogin.rewards[day - 1];
      if (!reward || reward.claimed) return state;
      const newRewards = state.dailyLogin.rewards.map((r, i) =>
        i === day - 1 ? { ...r, claimed: true } : r
      );
      const newStreak = day === 7 ? 0 : state.dailyLogin.streak + 1;
      const allClaimed = newRewards.every(r => r.claimed);
      const finalRewards = allClaimed ? initialDailyLoginRewards.map(r => ({ ...r, claimed: false })) : newRewards;
      const finalStreak = allClaimed ? 0 : newStreak;

      if (reward.bonusItem === 'room_card_1h') {
        const newCard: RoomCard = {
          id: `rc_${Date.now()}`,
          type: '1h',
          duration: ROOM_CARD_DURATION_HOURS['1h'],
          activated: false,
        };
        return {
          ...state,
          profile: {
            ...state.profile,
            coins: state.profile.coins + reward.coins,
            roomCards: [...state.profile.roomCards, newCard],
          },
          economy: {
            ...state.economy,
            coins: state.economy.coins + reward.coins,
            totalEarned: state.economy.totalEarned + reward.coins,
          },
          dailyLogin: {
            streak: finalStreak,
            lastClaimed: Date.now(),
            rewards: finalRewards,
          },
        };
      }

      return {
        ...state,
        profile: {
          ...state.profile,
          coins: state.profile.coins + reward.coins,
          collection: grantCosmeticToCollection(state.profile.collection, reward.bonusItem),
        },
        economy: {
          ...state.economy,
          coins: state.economy.coins + reward.coins,
          totalEarned: state.economy.totalEarned + reward.coins,
        },
        dailyLogin: {
          streak: finalStreak,
          lastClaimed: Date.now(),
          rewards: finalRewards,
        },
      };
    }

    case 'ACTIVATE_VIP': {
      const { days } = action.payload;
      const now = Date.now();
      const expiresAt = now + days * 24 * 60 * 60 * 1000;
      const newCard: RoomCard = {
        id: `rc_vip_${Date.now()}`,
        type: '24h',
        duration: ROOM_CARD_DURATION_HOURS['24h'],
        activated: false,
      };
      return {
        ...state,
        profile: {
          ...state.profile,
          vip: { active: true, activatedAt: now, expiresAt, remainingDays: days },
          roomCards: [...state.profile.roomCards, newCard],
        },
      };
    }

    case 'ACTIVATE_ROOM_CARD': {
      const { cardId } = action.payload;
      const now = Date.now();
      const card = state.profile.roomCards.find(c => c.id === cardId && !c.activated);
      if (!card) return state;
      const updatedCards = state.profile.roomCards.map(c =>
        c.id === cardId ? { ...c, activated: true, activatedAt: now, expiresAt: now + c.duration * 60 * 60 * 1000 } : c
      );
      return {
        ...state,
        profile: { ...state.profile, roomCards: updatedCards },
      };
    }

    case 'PURCHASE_COSMETIC': {
      const { itemId } = action.payload;
      const item = ALL_COSMETICS.find(c => c.id === itemId);
      if (!item) return state;
      if (state.shopOverrides?.hiddenItemIds.includes(itemId)) return state; // admin-hidden - not purchasable
      const price = state.shopOverrides?.priceOverrides[itemId] ?? item.price;
      if (state.economy.coins < price) return state;
      const collectionKey = CATEGORY_TO_COLLECTION_KEY[item.category];
      if (!collectionKey || state.profile.collection[collectionKey].includes(itemId)) return state;
      return {
        ...state,
        profile: {
          ...state.profile,
          coins: state.profile.coins - price,
          collection: grantCosmeticToCollection(state.profile.collection, itemId),
        },
        economy: {
          ...state.economy,
          coins: state.economy.coins - price,
          totalSpent: state.economy.totalSpent + price,
        },
      };
    }

    case 'EQUIP_COSMETIC': {
      const { category, itemId } = action.payload;
      const equipMap: Record<string, string> = {
        cardBack: 'cardBack',
        tableTheme: 'tableTheme',
        profileFrame: 'profileFrame',
        victoryAnimation: 'victoryAnimation',
        banner: 'banner',
      };
      const key = equipMap[category];
      if (!key) return state;
      return {
        ...state,
        profile: {
          ...state.profile,
          equipped: { ...state.profile.equipped, [key]: itemId },
        },
      };
    }

    case 'UNLOCK_ACHIEVEMENT': {
      const { achievementId } = action.payload;
      const achievement = state.achievements.find(a => a.id === achievementId);
      if (!achievement || achievement.unlocked) return state;
      const updatedAchievements = state.achievements.map(a =>
        a.id === achievementId ? { ...a, unlocked: true, unlockedAt: Date.now() } : a
      );
      return {
        ...state,
        achievements: updatedAchievements,
        profile: {
          ...state.profile,
          coins: state.profile.coins + achievement.reward,
          achievements: [...state.profile.achievements, achievementId],
        },
        economy: {
          ...state.economy,
          coins: state.economy.coins + achievement.reward,
          totalEarned: state.economy.totalEarned + achievement.reward,
        },
      };
    }

    case 'UPDATE_PROGRESS': {
      const { key, value } = action.payload;
      return {
        ...state,
        profile: {
          ...state.profile,
          stats: { ...state.profile.stats, [key]: value },
        },
      };
    }

    case 'ADD_ROOM_CARD': {
      const { type } = action.payload;
      const newCard: RoomCard = {
        id: `rc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type,
        duration: ROOM_CARD_DURATION_HOURS[type],
        activated: false,
      };
      return {
        ...state,
        profile: { ...state.profile, roomCards: [...state.profile.roomCards, newCard] },
      };
    }

    case 'PURCHASE_ROOM_CARD': {
      const { type, price } = action.payload;
      if (state.economy.coins < price) return state;
      const newCard: RoomCard = {
        id: `rc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type,
        duration: ROOM_CARD_DURATION_HOURS[type],
        activated: false,
      };
      return {
        ...state,
        profile: {
          ...state.profile,
          coins: state.profile.coins - price,
          roomCards: [...state.profile.roomCards, newCard],
        },
        economy: {
          ...state.economy,
          coins: state.economy.coins - price,
          totalSpent: state.economy.totalSpent + price,
        },
      };
    }

    case 'SET_MISSION_REWARD_OVERRIDES':
      return { ...state, missionRewardOverrides: action.payload };

    case 'SET_RANK_REWARD_OVERRIDES':
      return { ...state, rankRewardOverrides: action.payload };

    case 'SET_SHOP_OVERRIDES':
      return { ...state, shopOverrides: action.payload };

    case 'GRANT_COSMETIC': {
      const { itemId } = action.payload;
      const collection = grantCosmeticToCollection(state.profile.collection, itemId);
      if (collection === state.profile.collection) return state;
      return { ...state, profile: { ...state.profile, collection } };
    }

    case 'SHOW_REWARD': {
      return {
        ...state,
        rewardPopups: [...state.rewardPopups, action.payload],
      };
    }

    case 'CLEAR_REWARD': {
      return {
        ...state,
        rewardPopups: state.rewardPopups.filter(r => r.id !== action.payload),
      };
    }

    case 'RESET_DAILY_MISSIONS': {
      return {
        ...state,
        missions: {
          ...state.missions,
          daily: generateDailyMissions(),
          lastDailyReset: Date.now(),
        },
      };
    }

    case 'RESET_WEEKLY_MISSIONS': {
      return {
        ...state,
        missions: {
          ...state.missions,
          weekly: generateWeeklyMissions(),
          lastWeeklyReset: Date.now(),
        },
      };
    }

    case 'CHECK_VIP_EXPIRY': {
      const now = Date.now();
      if (state.profile.vip.active && state.profile.vip.expiresAt <= now) {
        return {
          ...state,
          profile: {
            ...state.profile,
            vip: { active: false, activatedAt: 0, expiresAt: 0, remainingDays: 0 },
          },
        };
      }
      if (state.profile.vip.active) {
        const remainingDays = Math.ceil((state.profile.vip.expiresAt - now) / (24 * 60 * 60 * 1000));
        return {
          ...state,
          profile: {
            ...state.profile,
            vip: { ...state.profile.vip, remainingDays },
          },
        };
      }
      return state;
    }

    case 'CHECK_ROOM_CARDS': {
      const now = Date.now();
      const updatedCards = state.profile.roomCards.map(card => {
        if (card.activated && card.expiresAt && card.expiresAt <= now) {
          return { ...card, activated: false, remainingTime: 0 };
        }
        if (card.activated && card.expiresAt) {
          return { ...card, remainingTime: Math.max(0, card.expiresAt - now) };
        }
        return card;
      });
      return {
        ...state,
        profile: { ...state.profile, roomCards: updatedCards },
      };
    }

    case 'SET_STATE': {
      return action.payload;
    }

    default:
      return state;
  }
}

// ─── CONTEXT ─────────────────────────────────────────
interface EconomyContextType {
  state: EconomyState;
  dispatch: React.Dispatch<EconomyAction>;
  addCoins: (amount: number, source: CoinSource, description: string) => void;
  spendCoins: (amount: number, description: string) => boolean;
  completeMission: (missionId: string, isWeekly: boolean) => void;
  claimDailyReward: (day: number) => void;
  activateVip: (days: number) => void;
  activateRoomCard: (cardId: string) => void;
  purchaseCosmetic: (itemId: string) => boolean;
  equipCosmetic: (category: string, itemId: string) => void;
  unlockAchievement: (achievementId: string) => void;
  updateProgress: (key: string, value: number) => void;
  addRoomCard: (type: RoomCardType) => void;
  purchaseRoomCard: (type: RoomCardType) => boolean;
  showReward: (popup: RewardPopup) => void;
  clearReward: (id: string) => void;
  resetDailyMissions: () => void;
  resetWeeklyMissions: () => void;
  processMatchEnd: (isVictory: boolean, gameType: string) => void;
  checkAndClaimWeeklyRank: (currentRank: string) => void;
  getOwnedCosmetics: (category: string) => string[];
  isCosmeticOwned: (itemId: string) => boolean;
  getCollectionProgress: () => { total: number; owned: number; percentage: number };
  getActiveRoomCards: () => RoomCard[];
  getAvailableRoomCards: () => RoomCard[];
}

const EconomyContext = createContext<EconomyContextType | null>(null);

export function EconomyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(economyReducer, initialState);
  const [isLoading, setIsLoading] = useState(true);

  // Load from Firebase on auth change
  useEffect(() => {
    if (!user) {
      // Load from localStorage for guests
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          dispatch({ type: 'SET_STATE', payload: parsed });
        } catch {
          console.error('Failed to parse localStorage');
        }
      }
      setIsLoading(false);
      return;
    }

    // Load from Firebase
    const loadFromFirebase = async () => {
      try {
        const ref = doc(db, 'playerEconomy', user.uid);
        const snap = await getDoc(ref);
        
        if (snap.exists()) {
          const data = snap.data() as EconomyState;
          
          // Check for daily/weekly resets
          const now = Date.now();
          const needsDailyReset = isNewDay(data.missions.lastDailyReset);
          const needsWeeklyReset = isNewWeek(data.missions.lastWeeklyReset);
          
          let updatedState = { ...data };
          
          if (needsDailyReset) {
            updatedState.missions.daily = generateDailyMissions();
            updatedState.missions.lastDailyReset = now;
          }
          
          if (needsWeeklyReset) {
            updatedState.missions.weekly = generateWeeklyMissions();
            updatedState.missions.lastWeeklyReset = now;
          }
          
          dispatch({ type: 'SET_STATE', payload: updatedState });
        } else {
          // New user — save initial state with their UID
          const newState = {
            ...initialState,
            profile: { ...initialState.profile, uid: user.uid, displayName: user.displayName || 'Player' }
          };
          await setDoc(ref, newState);
          dispatch({ type: 'SET_STATE', payload: newState });
        }
      } catch (error) {
        console.error('Failed to load from Firebase:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFromFirebase();

    // Real-time sync from other devices
    const unsub = onSnapshot(doc(db, 'playerEconomy', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as EconomyState;
        // Only update if the data is newer than our current state
        // This prevents loops while still allowing multi-device sync
        const lastTx = data.economy?.transactions?.[0]?.timestamp || 0;
        const ourLastTx = state.economy?.transactions?.[0]?.timestamp || 0;
        if (lastTx > ourLastTx) {
          dispatch({ type: 'SET_STATE', payload: data });
        }
      }
    });

    return () => unsub();
  }, [user]);

  // Save to Firebase on state change
  useEffect(() => {
    if (!user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return;
    }

    const saveToFirebase = async () => {
      try {
        await setDoc(doc(db, 'playerEconomy', user.uid), state, { merge: true });
      } catch (error) {
        console.error('Failed to save to Firebase:', error);
      }
    };

    // Debounce save to prevent excessive writes
    const timer = setTimeout(saveToFirebase, 1000);
    return () => clearTimeout(timer);
  }, [state, user]);

  // VIP and room card expiry check
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'CHECK_VIP_EXPIRY' });
      dispatch({ type: 'CHECK_ROOM_CARDS' });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Admin panel overrides (lib/admin.ts). Guests never actually sign into
  // Firebase (see signInAsGuest), so `appConfig` reads would be denied for
  // them - only subscribe when there's a real signed-in user.
  useEffect(() => {
    if (!user) return;
    const unsubMissions = watchMissionRewardOverrides((data) =>
      dispatch({ type: 'SET_MISSION_REWARD_OVERRIDES', payload: data })
    );
    const unsubRanks = watchRankRewardOverrides((data) => dispatch({ type: 'SET_RANK_REWARD_OVERRIDES', payload: data }));
    const unsubShop = watchShopOverrides((data) => dispatch({ type: 'SET_SHOP_OVERRIDES', payload: data }));
    return () => {
      unsubMissions();
      unsubRanks();
      unsubShop();
    };
  }, [user]);

  const addCoins = useCallback((amount: number, source: CoinSource, description: string) => {
    dispatch({ type: 'ADD_COINS', payload: { amount, source, description } });
  }, [dispatch]);

  const spendCoins = useCallback((amount: number, description: string): boolean => {
    if (state.economy.coins < amount) return false;
    dispatch({ type: 'SPEND_COINS', payload: { amount, description } });
    return true;
  }, [dispatch, state.economy.coins]);

  const completeMission = useCallback((missionId: string, isWeekly: boolean) => {
    dispatch({ type: 'COMPLETE_MISSION', payload: { missionId, isWeekly } });
  }, [dispatch]);

  const claimDailyReward = useCallback((day: number) => {
    dispatch({ type: 'CLAIM_DAILY_REWARD', payload: { day } });
  }, [dispatch]);

  const activateVip = useCallback((days: number) => {
    dispatch({ type: 'ACTIVATE_VIP', payload: { days } });
  }, [dispatch]);

  const activateRoomCard = useCallback((cardId: string) => {
    dispatch({ type: 'ACTIVATE_ROOM_CARD', payload: { cardId } });
  }, [dispatch]);

  const purchaseCosmetic = useCallback((itemId: string): boolean => {
    const item = ALL_COSMETICS.find(c => c.id === itemId);
    if (!item) return false;
    if (state.shopOverrides?.hiddenItemIds.includes(itemId)) return false;
    const price = state.shopOverrides?.priceOverrides[itemId] ?? item.price;
    if (state.economy.coins < price) return false;
    dispatch({ type: 'PURCHASE_COSMETIC', payload: { itemId } });
    return true;
  }, [dispatch, state.economy.coins, state.shopOverrides]);

  const equipCosmetic = useCallback((category: string, itemId: string) => {
    dispatch({ type: 'EQUIP_COSMETIC', payload: { category, itemId } });
  }, [dispatch]);

  const unlockAchievement = useCallback((achievementId: string) => {
    dispatch({ type: 'UNLOCK_ACHIEVEMENT', payload: { achievementId } });
  }, [dispatch]);

  const updateProgress = useCallback((key: string, value: number) => {
    dispatch({ type: 'UPDATE_PROGRESS', payload: { key, value } });
  }, [dispatch]);

  const addRoomCard = useCallback((type: RoomCardType) => {
    dispatch({ type: 'ADD_ROOM_CARD', payload: { type } });
  }, [dispatch]);

  const purchaseRoomCard = useCallback((type: RoomCardType): boolean => {
    const price = ROOM_CARD_PRICES[type];
    if (state.economy.coins < price) return false;
    dispatch({ type: 'PURCHASE_ROOM_CARD', payload: { type, price } });
    return true;
  }, [dispatch, state.economy.coins]);

  const showReward = useCallback((popup: RewardPopup) => {
    dispatch({ type: 'SHOW_REWARD', payload: popup });
  }, [dispatch]);

  const clearReward = useCallback((id: string) => {
    dispatch({ type: 'CLEAR_REWARD', payload: id });
  }, [dispatch]);

  const resetDailyMissions = useCallback(() => {
    dispatch({ type: 'RESET_DAILY_MISSIONS' });
  }, [dispatch]);

  const resetWeeklyMissions = useCallback(() => {
    dispatch({ type: 'RESET_WEEKLY_MISSIONS' });
  }, [dispatch]);

  const processMatchEnd = useCallback((isVictory: boolean, gameType: string) => {
    const coinReward = isVictory ? 10 : 2;
    const source: CoinSource = isVictory ? 'match_victory' : 'match_defeat';
    const description = isVictory ? 'Victory Bonus' : 'Participation Reward';

    dispatch({ type: 'ADD_COINS', payload: { amount: coinReward, source, description } });

    const newMatchesPlayed = state.profile.stats.matchesPlayed + 1;
    const newMatchesWon = isVictory ? state.profile.stats.matchesWon + 1 : state.profile.stats.matchesWon;
    const newWinRate = newMatchesPlayed > 0 ? Math.round((newMatchesWon / newMatchesPlayed) * 100) : 0;

    dispatch({ type: 'UPDATE_PROGRESS', payload: { key: 'matchesPlayed', value: newMatchesPlayed } });
    dispatch({ type: 'UPDATE_PROGRESS', payload: { key: 'matchesWon', value: newMatchesWon } });
    dispatch({ type: 'UPDATE_PROGRESS', payload: { key: 'winRate', value: newWinRate } });

    state.missions.daily.forEach(mission => {
      if (mission.completed) return;
      let shouldComplete = false;
      let newProgress = mission.progress;

      if (mission.type === 'play_match') {
        newProgress = mission.progress + 1;
        shouldComplete = newProgress >= mission.target;
      } else if (mission.type === 'win_match' && isVictory) {
        newProgress = mission.progress + 1;
        shouldComplete = newProgress >= mission.target;
      } else if (mission.type === 'play_game' && mission.gameType === gameType) {
        newProgress = mission.progress + 1;
        shouldComplete = newProgress >= mission.target;
      } else if (mission.type === 'win_matches' && isVictory) {
        newProgress = mission.progress + 1;
        shouldComplete = newProgress >= mission.target;
      } else if (mission.type === 'play_matches') {
        newProgress = mission.progress + 1;
        shouldComplete = newProgress >= mission.target;
      }

      if (shouldComplete) {
        dispatch({ type: 'COMPLETE_MISSION', payload: { missionId: mission.id, isWeekly: false } });
      }
    });

    state.missions.weekly.forEach(mission => {
      if (mission.completed) return;
      let shouldComplete = false;
      let newProgress = mission.progress;

      if (mission.id.startsWith('wm_win_') && isVictory) {
        newProgress = mission.progress + 1;
        shouldComplete = newProgress >= mission.target;
      } else if (mission.id.startsWith('wm_play_')) {
        newProgress = mission.progress + 1;
        shouldComplete = newProgress >= mission.target;
      }

      if (shouldComplete) {
        dispatch({ type: 'COMPLETE_MISSION', payload: { missionId: mission.id, isWeekly: true } });
      }
    });

    const achievementsToCheck = [
      { id: 'ach_first_win', condition: isVictory && state.profile.stats.matchesWon === 0 },
      { id: 'ach_10_wins', condition: newMatchesWon >= 10 },
      { id: 'ach_50_wins', condition: newMatchesWon >= 50 },
      { id: 'ach_100_wins', condition: newMatchesWon >= 100 },
    ];

    achievementsToCheck.forEach(({ id, condition }) => {
      const ach = state.achievements.find(a => a.id === id);
      if (ach && !ach.unlocked && condition) {
        dispatch({ type: 'UNLOCK_ACHIEVEMENT', payload: { achievementId: id } });
      }
    });
  }, [dispatch, state]);

  const checkAndClaimWeeklyRank = useCallback((currentRank: string) => {
    const lastThursday = getLastThursday();

    if (state.weeklyRankReward.lastClaimed < lastThursday) {
      const rankConfig = RANK_CONFIGS.find(r => r.tier === currentRank);
      const reward = state.rankRewardOverrides?.weeklyRewards[currentRank] ?? rankConfig?.weeklyReward ?? 50;
      const cosmeticId = rankConfig?.weeklyRewardCosmeticId;
      const cosmetic = cosmeticId ? ALL_COSMETICS.find(c => c.id === cosmeticId) : undefined;

      dispatch({ type: 'ADD_COINS', payload: { amount: reward, source: 'weekly_rank', description: `${currentRank} Weekly Rank Reward` } });
      if (cosmeticId) dispatch({ type: 'GRANT_COSMETIC', payload: { itemId: cosmeticId } });
      dispatch({
        type: 'SHOW_REWARD',
        payload: {
          id: `rank_reward_${Date.now()}`,
          type: 'rank',
          title: 'Weekly Rank Reward',
          items: [
            { type: 'coins', name: 'Coins', amount: reward },
            { type: 'badge', name: `${currentRank} Rank` },
            ...(cosmetic ? [{ type: 'cosmetic' as const, name: cosmetic.name }] : []),
          ],
          timestamp: Date.now(),
        },
      });
    }
  }, [dispatch, state]);

  const getOwnedCosmetics = useCallback((category: string) => {
    const map: Record<string, string[]> = {
      cardBack: state.profile.collection.cardBacks,
      tableTheme: state.profile.collection.tableThemes,
      profileFrame: state.profile.collection.profileFrames,
      emote: state.profile.collection.emotes,
      victoryAnimation: state.profile.collection.victoryAnimations,
      sticker: state.profile.collection.stickers,
      banner: state.profile.collection.banners,
    };
    return map[category] || [];
  }, [state.profile.collection]);

  const isCosmeticOwned = useCallback((itemId: string) => {
    return Object.values(state.profile.collection).flat().includes(itemId);
  }, [state.profile.collection]);

  const getCollectionProgress = useCallback(() => {
    const all = ALL_COSMETICS;
    const owned = Object.values(state.profile.collection).flat().length;
    return {
      total: all.length,
      owned,
      percentage: Math.round((owned / all.length) * 100),
    };
  }, [state.profile.collection]);

  const getActiveRoomCards = useCallback(() => {
    return state.profile.roomCards.filter(c => c.activated && c.remainingTime && c.remainingTime > 0);
  }, [state.profile.roomCards]);

  const getAvailableRoomCards = useCallback(() => {
    return state.profile.roomCards.filter(c => !c.activated);
  }, [state.profile.roomCards]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="text-[#D4AF37] animate-pulse">Loading economy...</div>
      </div>
    );
  }

  return (
    <EconomyContext.Provider
      value={{
        state,
        dispatch,
        addCoins,
        spendCoins,
        completeMission,
        claimDailyReward,
        activateVip,
        activateRoomCard,
        purchaseCosmetic,
        equipCosmetic,
        unlockAchievement,
        updateProgress,
        addRoomCard,
        purchaseRoomCard,
        showReward,
        clearReward,
        resetDailyMissions,
        resetWeeklyMissions,
        processMatchEnd,
        checkAndClaimWeeklyRank,
        getOwnedCosmetics,
        isCosmeticOwned,
        getCollectionProgress,
        getActiveRoomCards,
        getAvailableRoomCards,
      }}
    >
      {children}
    </EconomyContext.Provider>
  );
}

export function useEconomy() {
  const context = useContext(EconomyContext);
  if (!context) {
    throw new Error('useEconomy must be used within an EconomyProvider');
  }
  return context;
}

function getLastThursday(): number {
  const now = new Date();
  const day = now.getDay();
  const diff = (day + 3) % 7;
  const lastThursday = new Date(now);
  lastThursday.setDate(now.getDate() - diff);
  lastThursday.setHours(23, 59, 0, 0);
  return lastThursday.getTime();
}