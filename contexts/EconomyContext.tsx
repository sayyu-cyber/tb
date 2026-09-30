// contexts/EconomyContext.tsx
'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { GameLoading } from '@/components/system/GameLoading';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';
import { useToast } from './ToastContext';
import { loadWallet, mutateWallet, type WalletSnapshot } from '@/lib/wallet';
import { realtimeChannelName } from '@/lib/supabase/data';
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
  | { type: 'SERVER_RESULT'; payload: { snapshot: WalletSnapshot; action?: EconomyAction } }
  | { type: 'HYDRATE_STATE'; payload: EconomyState }
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
    server?: WalletSnapshot['daily'];
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

/**
 * Stored-shape version for `playerEconomy` documents.
 *
 * 2 — single canonical balance. Before this, `profile.coins` and
 *     `economy.coins` were maintained in parallel and drifted (the weekly
 *     rank-reward function incremented only `profile.coins`, CoinBalance
 *     displayed only `profile.coins`, and every affordability check read
 *     `economy.coins`). `economy.coins` won because it is what all the
 *     spend guards already used and it sits with the rest of the ledger.
 */
const ECONOMY_SCHEMA_VERSION = 2;

/**
 * One-time reconciliation for documents written before v2.
 *
 * Takes the HIGHER of the two old balances, deliberately. Players who were
 * paid a weekly rank reward have a `profile.coins` above their
 * `economy.coins`, and picking the canonical field blindly would silently
 * confiscate coins they were genuinely awarded. Over-crediting is not a
 * risk in the other direction: every reducer path updated both fields, so
 * only the function-written one could ever run ahead.
 *
 * This must run EXACTLY ONCE per document, which is what the version field
 * is for. Running it on every load would be a spend-infinitely bug: after a
 * purchase drops `economy.coins` below the stale `profile.coins`, the next
 * reload would restore the higher figure.
 */
function reconcileCoins(data: Partial<EconomyState>, fallback: number): number {
  const stored = data.economy?.coins;
  if ((data.economy?.schemaVersion ?? 0) >= ECONOMY_SCHEMA_VERSION) {
    return stored ?? fallback;
  }
  const legacy = data.profile?.coins;
  if (stored === undefined && legacy === undefined) return fallback;
  return Math.max(stored ?? 0, legacy ?? 0);
}

const initialState: EconomyState = {
  profile: {
    uid: '',
    displayName: 'Player',
    avatar: '/avatars/default.png',
    title: 'Novice',
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
    schemaVersion: ECONOMY_SCHEMA_VERSION,
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
const ECONOMY_LOAD_TIMEOUT_MS = 4000;

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

function stateForUser(user: NonNullable<ReturnType<typeof useAuth>['user']>): EconomyState {
  return {
    ...initialState,
    profile: {
      ...initialState.profile,
      uid: user.uid,
      displayName: user.displayName || 'Player',
    },
  };
}

function mergeEconomyState(data: Partial<EconomyState>, user: NonNullable<ReturnType<typeof useAuth>['user']>): EconomyState {
  const base = stateForUser(user);
  // Strip the legacy balance by omitting the key, never by setting it to
  // undefined. The old profile balance has already been folded into the
  // canonical economy balance.
  const legacyProfile = { ...(data.profile ?? {}) };
  delete legacyProfile.coins;
  return {
    ...base,
    ...data,
    profile: {
      ...base.profile,
      // legacyProfile, not data.profile - see the destructure above. The
      // old balance has already been folded into economy.coins by
      // reconcileCoins, so carrying it further would only invite a stale
      // read. The legacy field is inert from here on.
      ...legacyProfile,
      uid: user.uid,
      displayName: data.profile?.displayName || user.displayName || base.profile.displayName,
      equipped: { ...base.profile.equipped, ...(data.profile?.equipped ?? {}) },
      stats: { ...base.profile.stats, ...(data.profile?.stats ?? {}) },
      collection: { ...base.profile.collection, ...(data.profile?.collection ?? {}) },
      vip: { ...base.profile.vip, ...(data.profile?.vip ?? {}) },
      roomCards: data.profile?.roomCards ?? base.profile.roomCards,
      achievements: data.profile?.achievements ?? base.profile.achievements,
    },
    // Coins are resolved through reconcileCoins rather than a plain spread,
    // so a pre-v2 document is migrated once and then left alone. Stamping
    // the version here is what makes it once-only - the next save writes it
    // back, and subsequent loads take the canonical field verbatim.
    economy: {
      ...base.economy,
      ...(data.economy ?? {}),
      coins: reconcileCoins(data, base.economy.coins),
      schemaVersion: ECONOMY_SCHEMA_VERSION,
    },
    missions: {
      ...base.missions,
      ...(data.missions ?? {}),
      daily: data.missions?.daily ?? base.missions.daily,
      weekly: data.missions?.weekly ?? base.missions.weekly,
    },
    achievements: data.achievements ?? base.achievements,
    dailyLogin: {
      ...base.dailyLogin,
      ...(data.dailyLogin ?? {}),
      rewards: data.dailyLogin?.rewards ?? base.dailyLogin.rewards,
    },
    rewardPopups: data.rewardPopups ?? base.rewardPopups,
    weeklyRankReward: { ...base.weeklyRankReward, ...(data.weeklyRankReward ?? {}) },
    missionRewardOverrides: data.missionRewardOverrides ?? base.missionRewardOverrides,
    rankRewardOverrides: data.rankRewardOverrides ?? base.rankRewardOverrides,
    shopOverrides: data.shopOverrides ?? base.shopOverrides,
  };
}

async function hydrateSupabaseEconomy(base: EconomyState, uid: string): Promise<EconomyState> {
  const supabase = getSupabaseBrowserClient();
  const [{ data: wallet, error: walletError }, { data: equipped, error: equippedError }, { data: inventory, error: inventoryError }] = await Promise.all([
    supabase.from('wallets').select('coins,total_earned,total_spent').eq('user_id', uid).maybeSingle(),
    supabase.from('equipped_cosmetics').select('card_back,table_theme,profile_frame,title,victory_animation,banner').eq('user_id', uid).maybeSingle(),
    supabase.from('inventory_items').select('item_id,category').eq('user_id', uid),
  ]);
  if (walletError) throw walletError;
  if (equippedError) throw equippedError;
  if (inventoryError) throw inventoryError;

  const collection = { ...base.profile.collection };
  for (const item of inventory ?? []) {
    const key = CATEGORY_TO_COLLECTION_KEY[item.category];
    if (key && !collection[key].includes(item.item_id)) collection[key] = [...collection[key], item.item_id] as any;
  }

  return {
    ...base,
    profile: {
      ...base.profile,
      equipped: {
        ...base.profile.equipped,
        cardBack: equipped?.card_back ?? base.profile.equipped.cardBack,
        tableTheme: equipped?.table_theme ?? base.profile.equipped.tableTheme,
        profileFrame: equipped?.profile_frame ?? base.profile.equipped.profileFrame,
        title: equipped?.title ?? base.profile.equipped.title,
        victoryAnimation: equipped?.victory_animation ?? base.profile.equipped.victoryAnimation,
        banner: equipped?.banner ?? base.profile.equipped.banner,
      },
      collection,
    },
    economy: {
      ...base.economy,
      coins: wallet?.coins ?? base.economy.coins,
      totalEarned: wallet?.total_earned ?? base.economy.totalEarned,
      totalSpent: wallet?.total_spent ?? base.economy.totalSpent,
    },
  };
}

async function saveSupabaseEconomy(uid: string, state: EconomyState): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  // handle_new_user creates this row. Upsert requires an INSERT policy,
  // while the owner is intentionally permitted to SELECT/UPDATE only.
  const { error: equippedError } = await supabase.from('equipped_cosmetics').update({
      card_back: state.profile.equipped.cardBack || 'cb_default',
      table_theme: state.profile.equipped.tableTheme || 'tt_default',
      profile_frame: state.profile.equipped.profileFrame || 'pf_default',
      title: state.profile.equipped.title || '',
      victory_animation: state.profile.equipped.victoryAnimation || 'va_default',
      banner: state.profile.equipped.banner || 'bn_default',
      updated_at: new Date().toISOString(),
    }).eq('user_id', uid);
  if (equippedError) throw equippedError;
}

// ─── REDUCER ─────────────────────────────────────────
function economyReducer(state: EconomyState, action: EconomyAction, wallet?: WalletSnapshot['wallet']): EconomyState {
  if (action.type === 'HYDRATE_STATE') return { ...action.payload, economy: state.economy, dailyLogin: state.dailyLogin };
  if (action.type === 'SERVER_RESULT') {
    const { snapshot, action: applied } = action.payload;
    const next = applied ? economyReducer(state, applied, snapshot.wallet) : state;
    return { ...next,
      economy: { ...next.economy, coins: snapshot.wallet.coins, totalEarned: snapshot.wallet.total_earned, totalSpent: snapshot.wallet.total_spent },
      dailyLogin: { ...next.dailyLogin, server: snapshot.daily, streak: snapshot.daily.claimedThrough,
        lastClaimed: snapshot.daily.lastClaimed ? new Date(snapshot.daily.lastClaimed).getTime() : 0,
        rewards: DAILY_LOGIN_REWARDS.map(reward => ({ ...reward, claimed: reward.day <= snapshot.daily.claimedThrough })) },
      profile: snapshot.roomCardId ? { ...next.profile, roomCards: next.profile.roomCards.map((card, index, all) => index === all.length - 1 ? { ...card, id: snapshot.roomCardId! } : card) } : next.profile,
    };
  }
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
        economy: {
          ...state.economy,
          coins: wallet?.coins ?? state.economy.coins + amount,
          transactions: [transaction, ...state.economy.transactions].slice(0, 100),
          totalEarned: wallet?.total_earned ?? state.economy.totalEarned + amount,
        },
      };
    }

    case 'SPEND_COINS': {
      const { amount, description } = action.payload;
      if (!wallet && state.economy.coins < amount) return state;
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
        economy: {
          ...state.economy,
          coins: wallet?.coins ?? state.economy.coins - amount,
          transactions: [transaction, ...state.economy.transactions].slice(0, 100),
          totalSpent: wallet?.total_spent ?? state.economy.totalSpent + amount,
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
            collection: grantCosmeticToCollection(state.profile.collection, completedMission.rewardCosmeticId),
          },
          economy: {
            ...state.economy,
            coins: wallet?.coins ?? state.economy.coins + reward,
            totalEarned: wallet?.total_earned ?? state.economy.totalEarned + reward,
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
          economy: {
            ...state.economy,
            coins: wallet?.coins ?? state.economy.coins + reward + bonus,
            totalEarned: wallet?.total_earned ?? state.economy.totalEarned + reward + bonus,
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
            roomCards: [...state.profile.roomCards, newCard],
          },
          economy: {
            ...state.economy,
            coins: wallet?.coins ?? state.economy.coins + reward.coins,
            totalEarned: wallet?.total_earned ?? state.economy.totalEarned + reward.coins,
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
          collection: grantCosmeticToCollection(state.profile.collection, reward.bonusItem),
        },
        economy: {
          ...state.economy,
          coins: wallet?.coins ?? state.economy.coins + reward.coins,
          totalEarned: wallet?.total_earned ?? state.economy.totalEarned + reward.coins,
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
      if (!wallet && state.economy.coins < price) return state;
      const collectionKey = CATEGORY_TO_COLLECTION_KEY[item.category];
      if (!collectionKey || state.profile.collection[collectionKey].includes(itemId)) return state;
      return {
        ...state,
        profile: {
          ...state.profile,
          collection: grantCosmeticToCollection(state.profile.collection, itemId),
        },
        economy: {
          ...state.economy,
          coins: wallet?.coins ?? state.economy.coins - price,
          totalSpent: wallet?.total_spent ?? state.economy.totalSpent + price,
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
          achievements: [...state.profile.achievements, achievementId],
        },
        economy: {
          ...state.economy,
          coins: wallet?.coins ?? state.economy.coins + achievement.reward,
          totalEarned: wallet?.total_earned ?? state.economy.totalEarned + achievement.reward,
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
      if (!wallet && state.economy.coins < price) return state;
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
          roomCards: [...state.profile.roomCards, newCard],
        },
        economy: {
          ...state.economy,
          coins: wallet?.coins ?? state.economy.coins - price,
          totalSpent: wallet?.total_spent ?? state.economy.totalSpent + price,
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
  spendCoins: (amount: number, description: string) => Promise<boolean>;
  completeMission: (missionId: string, isWeekly: boolean) => void;
  claimDailyReward: (day: number) => Promise<boolean>;
  activateVip: (days: number) => void;
  activateRoomCard: (cardId: string) => void;
  purchaseCosmetic: (itemId: string) => Promise<boolean>;
  equipCosmetic: (category: string, itemId: string) => void;
  unlockAchievement: (achievementId: string) => void;
  updateProgress: (key: string, value: number) => void;
  addRoomCard: (type: RoomCardType) => void;
  purchaseRoomCard: (type: RoomCardType) => Promise<boolean>;
  balanceReady: boolean;
  refreshBalance: () => Promise<void>;
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
  const [state, rawDispatch] = useReducer(economyReducer, initialState);
  const pathname = usePathname();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [remoteReadyUid, setRemoteReadyUid] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const activeUid = useRef(user?.uid);
  activeUid.current = user?.uid;
  const walletVersion = useRef(-1);
  const mutations = useRef<Promise<unknown>>(Promise.resolve());
  const applySnapshot = useCallback((snapshot: WalletSnapshot, action?: EconomyAction) => {
    if (snapshot.wallet.version < walletVersion.current) {
      if (!action) return;
      const current = stateRef.current;
      snapshot = { ...snapshot, wallet: { coins: current.economy.coins, total_earned: current.economy.totalEarned, total_spent: current.economy.totalSpent, version: walletVersion.current }, daily: current.dailyLogin.server || snapshot.daily };
    }
    walletVersion.current = snapshot.wallet.version;
    const result: EconomyAction = { type: 'SERVER_RESULT', payload: { snapshot, action } };
    stateRef.current = economyReducer(stateRef.current, result);
    rawDispatch(result);
  }, []);
  const refreshBalance = useCallback(async () => {
    if (!user?.uid) return;
    const uid = user.uid;
    const snapshot = await loadWallet();
    if (activeUid.current !== uid) return;
    applySnapshot(snapshot);
    setRemoteReadyUid(uid);
  }, [user?.uid, applySnapshot]);
  const dispatch = useCallback((action: EconomyAction): Promise<boolean> => {
    const monetary = ['ADD_COINS', 'SPEND_COINS', 'COMPLETE_MISSION', 'CLAIM_DAILY_REWARD', 'PURCHASE_COSMETIC', 'PURCHASE_ROOM_CARD', 'UNLOCK_ACHIEVEMENT'].includes(action.type);
    if (!user?.uid || !monetary) { rawDispatch(action); return Promise.resolve(true); }
    const uid = user.uid;
    const work = mutations.current.then(async () => {
      if (activeUid.current !== uid) return false;
      try {
        const snapshot = await mutateWallet(action.type, 'payload' in action ? action.payload : {});
        if (activeUid.current === uid) { applySnapshot(snapshot, action); setRemoteReadyUid(uid); }
        return true;
      } catch (error) {
        if (activeUid.current === uid) showToast(error instanceof Error ? error.message : 'Your balance could not be updated. Please try again.', 'error');
        return false;
      }
    });
    mutations.current = work;
    return work;
  }, [user?.uid, applySnapshot, showToast]);

  // Load/navigation/reconnect always read the server. Missed WebSocket events
  // also recover on focus, online and a bounded refresh interval.
  useEffect(() => {
    if (!user?.uid) return;
    const supabase = getSupabaseBrowserClient();
    const refresh = () => { void refreshBalance().catch(console.error); };
    refresh();
    const channel = supabase.channel(realtimeChannelName(`wallet:${user.uid}`))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.uid}` }, refresh)
      .subscribe(status => { if (status === 'SUBSCRIBED') refresh(); });
    window.addEventListener('focus', refresh); window.addEventListener('online', refresh);
    const updated = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail.uid === user.uid) {
        const daily = stateRef.current.dailyLogin.server;
        if (daily) applySnapshot({ wallet: detail.wallet, daily });
        refresh();
      }
    };
    window.addEventListener('thaasbai-wallet', updated);
    const interval = setInterval(refresh, 30000);
    return () => { void supabase.removeChannel(channel); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); window.removeEventListener('thaasbai-wallet', updated); clearInterval(interval); };
  }, [user?.uid, pathname, refreshBalance, applySnapshot]);

  // Load from Supabase on auth change.
  useEffect(() => {
    setIsLoading(true);
    setRemoteReadyUid(null);
    walletVersion.current = -1;
    if (user) rawDispatch({ type: 'SET_STATE', payload: { ...stateForUser(user), economy: { ...initialState.economy, coins: 0 } } });

    if (!user) {
      // Load from localStorage for guests
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          // This path deliberately trusts the stored blob (it does not go
          // through mergeEconomyState, which needs a signed-in user), but the
          // coin field still has to be normalised or a guest holding a pre-v2
          // blob would keep a second, unread balance forever. Guests cannot
          // have drifted - only the scheduled function wrote profile.coins,
          // and guests have no server document - so this is purely shape.
          const parsed = JSON.parse(saved) as Partial<EconomyState>;
          const profile = { ...(parsed.profile ?? {}) };
          delete profile.coins;
          dispatch({
            type: 'SET_STATE',
            payload: {
              ...parsed,
              profile,
              economy: {
                ...parsed.economy,
                coins: reconcileCoins(parsed, initialState.economy.coins),
                schemaVersion: ECONOMY_SCHEMA_VERSION,
              },
            } as EconomyState,
          });
        } catch {
          console.error('Failed to parse localStorage');
        }
      }
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let settled = false;
    const finishLoading = () => {
      settled = true;
      if (!cancelled) setIsLoading(false);
    };

    const fallbackTimer = window.setTimeout(() => {
      if (settled || cancelled) return;
      const saved = localStorage.getItem(`${STORAGE_KEY}:${user.uid}`);
      if (saved) {
        try {
          const cached = mergeEconomyState(JSON.parse(saved), user);
          dispatch({ type: 'HYDRATE_STATE', payload: cached });
        } catch {
          dispatch({ type: 'HYDRATE_STATE', payload: stateForUser(user) });
        }
      } else {
        dispatch({ type: 'HYDRATE_STATE', payload: stateForUser(user) });
      }
      finishLoading();
    }, ECONOMY_LOAD_TIMEOUT_MS);

    const loadFromSupabase = async () => {
      try {
        const saved = localStorage.getItem(`${STORAGE_KEY}:${user.uid}`);
        const localState = saved ? mergeEconomyState(JSON.parse(saved), user) : stateForUser(user);
        const data = await hydrateSupabaseEconomy(localState, user.uid);
        const snapshot = await loadWallet();
        if (cancelled) return;

        const now = Date.now();
        const needsDailyReset = isNewDay(data.missions.lastDailyReset);
        const needsWeeklyReset = isNewWeek(data.missions.lastWeeklyReset);
        const updatedState = {
          ...data,
          missions: {
            ...data.missions,
            daily: needsDailyReset ? generateDailyMissions() : data.missions.daily,
            weekly: needsWeeklyReset ? generateWeeklyMissions() : data.missions.weekly,
            lastDailyReset: needsDailyReset ? now : data.missions.lastDailyReset,
            lastWeeklyReset: needsWeeklyReset ? now : data.missions.lastWeeklyReset,
          },
        };

        dispatch({ type: 'HYDRATE_STATE', payload: updatedState });
        applySnapshot(snapshot);
        if (!cancelled) setRemoteReadyUid(user.uid);
      } catch (error) {
        console.error('Failed to load from Supabase:', error);
        if (!cancelled) {
          const saved = localStorage.getItem(`${STORAGE_KEY}:${user.uid}`);
          if (saved) {
            try {
              const cached = mergeEconomyState(JSON.parse(saved), user);
              dispatch({ type: 'HYDRATE_STATE', payload: cached });
            } catch {
              dispatch({ type: 'HYDRATE_STATE', payload: stateForUser(user) });
            }
          } else {
            dispatch({ type: 'HYDRATE_STATE', payload: stateForUser(user) });
          }
        }
      } finally {
        finishLoading();
      }
    };

    loadFromSupabase();

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
    };
  }, [user?.uid, applySnapshot]);

  // Save to Supabase on state change.
  useEffect(() => {
    if (!user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return;
    }

    if (isLoading || state.profile.uid !== user.uid) return;

    localStorage.setItem(`${STORAGE_KEY}:${user.uid}`, JSON.stringify(state));
    // A timed-out read must never upload fallback balances over remote data.
    if (remoteReadyUid !== user.uid) return;

    const saveToSupabase = async () => {
      try {
        await saveSupabaseEconomy(user.uid, state);
      } catch (error) {
        console.error('Failed to save to Supabase:', error);
      }
    };

    // Debounce save to prevent excessive writes
    const timer = setTimeout(saveToSupabase, 1000);
    return () => clearTimeout(timer);
  }, [state, user?.uid, isLoading, remoteReadyUid]);

  // VIP and room card expiry check
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'CHECK_VIP_EXPIRY' });
      dispatch({ type: 'CHECK_ROOM_CARDS' });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Admin panel overrides (lib/admin.ts). Only subscribe when there's a real
  // signed-in user so Supabase RLS can authorize the read.
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

  const spendCoins = useCallback((amount: number, description: string) => dispatch({ type: 'SPEND_COINS', payload: { amount, description } }), [dispatch]);

  const completeMission = useCallback((missionId: string, isWeekly: boolean) => {
    dispatch({ type: 'COMPLETE_MISSION', payload: { missionId, isWeekly } });
  }, [dispatch]);

  const claimDailyReward = useCallback((day: number) => {
    return dispatch({ type: 'CLAIM_DAILY_REWARD', payload: { day } });
  }, [dispatch]);

  const activateVip = useCallback((days: number) => {
    dispatch({ type: 'ACTIVATE_VIP', payload: { days } });
  }, [dispatch]);

  const activateRoomCard = useCallback((cardId: string) => {
    dispatch({ type: 'ACTIVATE_ROOM_CARD', payload: { cardId } });
  }, [dispatch]);

  const purchaseCosmetic = useCallback(async (itemId: string): Promise<boolean> => {
    const item = ALL_COSMETICS.find(c => c.id === itemId);
    if (!item) return false;
    if (state.shopOverrides?.hiddenItemIds.includes(itemId)) return false;
    const price = state.shopOverrides?.priceOverrides[itemId] ?? item.price;
    if (state.economy.coins < price) return false;
    return dispatch({ type: 'PURCHASE_COSMETIC', payload: { itemId } });
  }, [dispatch, state.economy.coins, state.shopOverrides]);

  const equipCosmetic = useCallback((category: string, itemId: string) => {
    const collectionKey = CATEGORY_TO_COLLECTION_KEY[category];
    if (!collectionKey || !state.profile.collection[collectionKey].includes(itemId)) return;
    dispatch({ type: 'EQUIP_COSMETIC', payload: { category, itemId } });
  }, [dispatch, state.profile.collection]);

  const unlockAchievement = useCallback((achievementId: string) => {
    dispatch({ type: 'UNLOCK_ACHIEVEMENT', payload: { achievementId } });
  }, [dispatch]);

  const updateProgress = useCallback((key: string, value: number) => {
    dispatch({ type: 'UPDATE_PROGRESS', payload: { key, value } });
  }, [dispatch]);

  const addRoomCard = useCallback((type: RoomCardType) => {
    dispatch({ type: 'ADD_ROOM_CARD', payload: { type } });
  }, [dispatch]);

  const purchaseRoomCard = useCallback(async (type: RoomCardType): Promise<boolean> => {
    const price = ROOM_CARD_PRICES[type];
    if (state.economy.coins < price) return false;
    return dispatch({ type: 'PURCHASE_ROOM_CARD', payload: { type, price } });
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
    return <GameLoading />;
  }

  return (
    <EconomyContext.Provider
      value={{
        state,
        balanceReady: !user || remoteReadyUid === user.uid,
        refreshBalance,
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
