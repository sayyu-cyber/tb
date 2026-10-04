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
import { safeSetItem } from '@/lib/safeStorage';
import {
  PlayerEconomy, CoinSource, PlayerProfile,
  RoomCard, RoomCardType, ROOM_CARD_DURATION_HOURS, DailyMission, WeeklyMission, Achievement,
  DailyLoginReward, RewardPopup
} from '../types/economy';
import { 
  DAILY_LOGIN_REWARDS, DAILY_MISSION_TEMPLATES, WEEKLY_MISSION_TEMPLATES,
  ACHIEVEMENTS, ALL_COSMETICS, ROOM_CARD_PRICES
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
  | { type: 'PRACTICE_MATCH'; payload: { isVictory: boolean; gameType: string } }
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
  pendingClaims: { key: string; action: EconomyAction }[];
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

const initialDailyLoginRewards = DAILY_LOGIN_REWARDS.map(r => ({ ...r, claimed: false }));

const initialState: EconomyState = {
  pendingClaims: [],
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
    coins: 0,
    transactions: [],
    totalEarned: 0,
    totalSpent: 0,
    schemaVersion: 3,
  },
  missions: {
    daily: [],
    weekly: [],
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

// Account entitlements always come from a complete server snapshot, never the cache.
function applyEconomySnapshot(state: EconomyState, snapshot: WalletSnapshot): EconomyState {
  const now = Date.parse(snapshot.daily.serverNow);
  const collection = { ...initialState.profile.collection };
  for (const item of snapshot.inventory ?? []) {
    const key = CATEGORY_TO_COLLECTION_KEY[item.category];
    if (key && !collection[key].includes(item.item_id)) collection[key] = [...collection[key], item.item_id];
  }
  const equipped = snapshot.equipped;
  const vip = snapshot.vip;
  const expiresAt = vip?.expires_at ? Date.parse(vip.expires_at) : 0;
  const active = !!vip?.active && expiresAt > now;
  const missions = snapshot.missions ?? [];
  const daily = missions.filter(m => m.cadence === 'daily').flatMap(m => {
    const template = DAILY_MISSION_TEMPLATES.find(t => t.id === m.template_id);
    return template ? [{ ...template, id: m.id, templateId: m.template_id, title: m.title, description: m.description,
      target: m.target, progress: m.progress, completed: m.completed, reward: m.reward }] : [];
  });
  const weekly = missions.filter(m => m.cadence === 'weekly').flatMap(m => {
    const template = WEEKLY_MISSION_TEMPLATES.find(t => t.id === m.template_id);
    return template ? [{ ...template, id: m.id, templateId: m.template_id, title: m.title, description: m.description,
      target: m.target, progress: m.progress, completed: m.completed, reward: m.reward,
      rewardCosmeticId: m.reward_cosmetic_id ?? undefined }] : [];
  });
  const achievements = ACHIEVEMENTS.map(template => {
    const saved = snapshot.achievements?.find(a => a.achievement_id === template.id);
    return { ...template, progress: saved?.progress ?? 0, target: saved?.target ?? template.target,
      unlocked: !!saved?.unlocked_at, unlockedAt: saved?.unlocked_at ? Date.parse(saved.unlocked_at) : undefined };
  });
  return {
    ...state,
    pendingClaims: [
      ...missions.filter(m => m.verified_at && m.completed && m.progress >= m.target && !m.claimed_at).map(m => ({
        key: m.id, action: { type: 'COMPLETE_MISSION' as const, payload: { missionId: m.id, isWeekly: m.cadence === 'weekly' } },
      })),
      ...(snapshot.achievements ?? []).filter(a => a.verified_at && a.progress >= a.target && !a.unlocked_at).map(a => ({
        key: a.achievement_id, action: { type: 'UNLOCK_ACHIEVEMENT' as const, payload: { achievementId: a.achievement_id } },
      })),
    ],
    economy: { ...state.economy, coins: snapshot.wallet.coins, totalEarned: snapshot.wallet.total_earned, totalSpent: snapshot.wallet.total_spent },
    dailyLogin: { ...state.dailyLogin, server: snapshot.daily, streak: snapshot.daily.claimedThrough,
      lastClaimed: snapshot.daily.lastClaimed ? Date.parse(snapshot.daily.lastClaimed) : 0,
      rewards: DAILY_LOGIN_REWARDS.map(r => ({ ...r, claimed: r.day <= snapshot.daily.claimedThrough })) },
    missions: { ...state.missions, daily, weekly },
    achievements,
    profile: {
      ...state.profile, collection, achievements: achievements.filter(a => a.unlocked).map(a => a.id),
      equipped: equipped ? { cardBack: equipped.card_back, tableTheme: equipped.table_theme,
        profileFrame: equipped.profile_frame, title: equipped.title, victoryAnimation: equipped.victory_animation,
        banner: equipped.banner } : initialState.profile.equipped,
      vip: { active, activatedAt: vip?.activated_at ? Date.parse(vip.activated_at) : 0, expiresAt,
        remainingDays: active ? Math.ceil((expiresAt - now) / 86400000) : 0 },
      roomCards: (snapshot.roomCards ?? []).map(card => ({
        id: card.id, type: card.type, duration: ROOM_CARD_DURATION_HOURS[card.type],
        // Activated means consumed, including after expiry.
        activated: !!card.activated_at || !!card.expires_at,
        activatedAt: card.activated_at ? Date.parse(card.activated_at) : undefined,
        expiresAt: card.expires_at ? Date.parse(card.expires_at) : undefined,
        remainingTime: card.expires_at ? Math.max(0, Date.parse(card.expires_at) - now) : 0,
      })),
    },
  };
}

function economyReducer(state: EconomyState, action: EconomyAction): EconomyState {
  switch (action.type) {
    case 'SERVER_RESULT':
      return applyEconomySnapshot(state, action.payload.snapshot);
    case 'SET_STATE':
    case 'HYDRATE_STATE':
      return action.payload;
    case 'PRACTICE_MATCH': {
      const { isVictory, gameType } = action.payload;
      const matchesPlayed = state.profile.stats.matchesPlayed + 1;
      const matchesWon = state.profile.stats.matchesWon + Number(isVictory);
      return { ...state,
        profile: { ...state.profile, stats: { ...state.profile.stats, matchesPlayed, matchesWon,
          winRate: Math.round(matchesWon / matchesPlayed * 100) } },
        missions: { ...state.missions,
          daily: state.missions.daily.map(m => {
            const increment = ['play_match', 'play_matches'].includes(m.type)
              || (['win_match', 'win_matches'].includes(m.type) && isVictory)
              || (m.type === 'play_game' && m.gameType === gameType);
            return increment && !m.completed ? { ...m, progress: Math.min(m.target, m.progress + 1) } : m;
          }),
          weekly: state.missions.weekly.map(m => {
            const increment = m.templateId.startsWith('wm_play_') || (m.templateId.startsWith('wm_win_') && isVictory);
            return increment && !m.completed ? { ...m, progress: Math.min(m.target, m.progress + 1) } : m;
          }),
        },
      };
    }
    case 'UPDATE_PROGRESS':
      return Number.isFinite(action.payload.value) ? { ...state, profile: { ...state.profile,
        stats: { ...state.profile.stats, [action.payload.key]: action.payload.value } } } : state;
    case 'SET_MISSION_REWARD_OVERRIDES': return { ...state, missionRewardOverrides: action.payload };
    case 'SET_RANK_REWARD_OVERRIDES': return { ...state, rankRewardOverrides: action.payload };
    case 'SET_SHOP_OVERRIDES': return { ...state, shopOverrides: action.payload };
    case 'SHOW_REWARD': return { ...state, rewardPopups: [...state.rewardPopups, action.payload] };
    case 'CLEAR_REWARD': return { ...state, rewardPopups: state.rewardPopups.filter(r => r.id !== action.payload) };
    case 'RESET_DAILY_MISSIONS':
    case 'RESET_WEEKLY_MISSIONS':
      return state;
    case 'CHECK_ROOM_CARDS':
      return { ...state, profile: { ...state.profile, roomCards: state.profile.roomCards.map(card =>
        card.expiresAt ? { ...card, remainingTime: Math.max(0, card.expiresAt - Date.now()) } : card) } };
    case 'CHECK_VIP_EXPIRY':
      return state.profile.vip.expiresAt <= Date.now() ? { ...state, profile: { ...state.profile,
        vip: { ...state.profile.vip, active: false, remainingDays: 0 } } } : state;
    // All entitlement and coin changes require a SERVER_RESULT.
    default: return state;
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
  equipCosmetic: (category: string, itemId: string) => Promise<boolean>;
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
  const authUserRef = useRef(user);
  authUserRef.current = user;
  const [state, rawDispatch] = useReducer(economyReducer, initialState);
  const pathname = usePathname();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [remoteReadyEpoch, setRemoteReadyEpoch] = useState<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const activeUid = useRef(user?.uid);
  const authEpoch = useRef(0);
  if (activeUid.current !== user?.uid) {
    activeUid.current = user?.uid;
    authEpoch.current++;
  }
  const epoch = authEpoch.current;
  const walletVersion = useRef(-1);
  const mutations = useRef<Promise<unknown>>(Promise.resolve());
  const snapshotTime = useRef(0);
  const claiming = useRef(new Set<string>());
  const applySnapshot = useCallback((snapshot: WalletSnapshot, action?: EconomyAction) => {
    if (authEpoch.current !== epoch) return false;
    const time = Date.parse(snapshot.daily.serverNow);
    // loadWallet/mutateWallet validate compatibility before a snapshot reaches here.
    if (snapshot.wallet.version < walletVersion.current || time < snapshotTime.current) return false;
    walletVersion.current = snapshot.wallet.version;
    snapshotTime.current = time;
    const result: EconomyAction = { type: 'SERVER_RESULT', payload: { snapshot, action } };
    stateRef.current = economyReducer(stateRef.current, result);
    rawDispatch(result);
    setRemoteReadyEpoch(epoch);
    return true;
  }, [epoch]);
  const refreshBalance = useCallback(async () => {
    if (!user?.uid || authEpoch.current !== epoch) return;
    const snapshot = await loadWallet();
    applySnapshot(snapshot);
  }, [user?.uid, epoch, applySnapshot]);
  const dispatch = useCallback((action: EconomyAction): Promise<boolean> => {
    if (authEpoch.current !== epoch) return Promise.resolve(false);
    const monetary = ['ADD_COINS', 'SPEND_COINS', 'COMPLETE_MISSION', 'CLAIM_DAILY_REWARD', 'PURCHASE_COSMETIC', 'PURCHASE_ROOM_CARD', 'UNLOCK_ACHIEVEMENT', 'ACTIVATE_ROOM_CARD', 'EQUIP_COSMETIC', 'ACTIVATE_VIP', 'ADD_ROOM_CARD', 'GRANT_COSMETIC'].includes(action.type);
    if (!monetary) {
      stateRef.current = economyReducer(stateRef.current, action);
      rawDispatch(action);
      return Promise.resolve(true);
    }
    if (!user?.uid || remoteReadyEpoch !== epoch) return Promise.resolve(false);
    const work = mutations.current.then(async () => {
      if (authEpoch.current !== epoch) return false;
      try {
        const snapshot = await mutateWallet(action.type, 'payload' in action ? action.payload : {});
        if (authEpoch.current !== epoch) return false;
        applySnapshot(snapshot, action);
        return true;
      } catch (error) {
        if (authEpoch.current === epoch) showToast(error instanceof Error ? error.message : 'Your balance could not be updated. Please try again.', 'error');
        return false;
      }
    });
    mutations.current = work;
    return work;
  }, [user?.uid, epoch, remoteReadyEpoch, applySnapshot, showToast]);

  // Auth changes discard cached account data; malformed old caches cannot grant access.
  useEffect(() => {
    setRemoteReadyEpoch(null);
    walletVersion.current = -1;
    snapshotTime.current = 0;
    mutations.current = Promise.resolve();
    claiming.current = new Set();
    const next = authUserRef.current ? stateForUser(authUserRef.current) : initialState;
    stateRef.current = next;
    rawDispatch({ type: 'SET_STATE', payload: next });
    setIsLoading(false);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || remoteReadyEpoch !== epoch || state.profile.uid !== user.uid) return;
    const keys = new Set(state.pendingClaims.map(claim => `${claim.action.type}:${claim.key}`));
    for (const key of claiming.current) if (!keys.has(key)) claiming.current.delete(key);
    for (const claim of state.pendingClaims) {
      const key = `${claim.action.type}:${claim.key}`;
      if (claiming.current.has(key)) continue;
      // Attempt once while this record stays pending; explicit claims can still retry.
      claiming.current.add(key);
      void dispatch(claim.action);
    }
  }, [user?.uid, epoch, remoteReadyEpoch, state.profile.uid, state.pendingClaims, dispatch]);

  useEffect(() => {
    if (!user?.uid) return;
    const supabase = getSupabaseBrowserClient();
    const refresh = () => { void refreshBalance().catch(console.error); };
    let channel = supabase.channel(realtimeChannelName(`economy:${user.uid}`));
    for (const table of ['wallets', 'room_cards', 'vip_entitlements', 'user_missions', 'user_achievements', 'inventory_items', 'equipped_cosmetics']) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${user.uid}` }, refresh);
    }
    channel.subscribe(status => { if (status === 'SUBSCRIBED') refresh(); });
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('thaasbai-wallet', refresh);
    const interval = setInterval(refresh, 30000);
    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('thaasbai-wallet', refresh);
      clearInterval(interval);
    };
  }, [user?.uid, pathname, refreshBalance]);

  useEffect(() => {
    // Best-effort cache only. Entitlements and balances are never restored from it.
    safeSetItem(user?.uid ? `${STORAGE_KEY}:${user.uid}` : STORAGE_KEY, JSON.stringify(state));
  }, [state, user?.uid]);

  // VIP and room card expiry check
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'CHECK_VIP_EXPIRY' });
      dispatch({ type: 'CHECK_ROOM_CARDS' });
    }, 60000);
    return () => clearInterval(interval);
  }, [dispatch]);

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
  }, [user, dispatch]);

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
    if (!item || item.earnedOnly || (item.isVipExclusive && !state.profile.vip.active)) return false;
    if (state.shopOverrides?.hiddenItemIds.includes(itemId)) return false;
    const price = state.shopOverrides?.priceOverrides[itemId] ?? item.price;
    if (state.economy.coins < price) return false;
    return dispatch({ type: 'PURCHASE_COSMETIC', payload: { itemId } });
  }, [dispatch, state.economy.coins, state.shopOverrides, state.profile.vip.active]);

  const equipCosmetic = useCallback(async (category: string, itemId: string) => {
    const collectionKey = CATEGORY_TO_COLLECTION_KEY[category];
    if (!collectionKey || !state.profile.collection[collectionKey].includes(itemId)) return false;
    return dispatch({ type: 'EQUIP_COSMETIC', payload: { category, itemId } });
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
    // Practice progress is display-only. Online games refresh after server settlement.
    dispatch({ type: 'PRACTICE_MATCH', payload: { isVictory, gameType } });
  }, [dispatch]);

  const checkAndClaimWeeklyRank = useCallback((_currentRank: string) => {
    // Weekly rewards require a trusted period settlement.
    void refreshBalance().catch(console.error);
  }, [refreshBalance]);

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
    return state.profile.roomCards.filter(c => c.activated && c.expiresAt && c.expiresAt > Date.now());
  }, [state.profile.roomCards]);

  const getAvailableRoomCards = useCallback(() => {
    return state.profile.roomCards.filter(c => !c.activated && !c.activatedAt && !c.expiresAt);
  }, [state.profile.roomCards]);

  if (isLoading) {
    return <GameLoading />;
  }

  return (
    <EconomyContext.Provider
      value={{
        state,
        balanceReady: !!user && remoteReadyEpoch === epoch,
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
