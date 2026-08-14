// src/components/shop/CosmeticShop.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEconomy } from '../../contexts/EconomyContext';
import { CosmeticItem, Rarity } from '../../types/economy';
import { ALL_COSMETICS, RARITY_COLORS, RARITY_GLOW, COIN_PACKS } from '../../data/cosmetics';
import { getWeeklyFeaturedRotation } from '../../lib/cosmeticRotation';
import { requestCoinTopup, watchMyTopups, CoinTopupRequest } from '../../lib/coinTopups';
import { useAuth } from '../../contexts/AuthContext';
import CoinBalance from '../economy/CoinBalance';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';

function RarityBadge({ rarity }: { rarity: Rarity }) {
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full border"
      style={{
        color: RARITY_COLORS[rarity],
        borderColor: `${RARITY_COLORS[rarity]}40`,
        backgroundColor: `${RARITY_COLORS[rarity]}15`,
      }}
    >
      {rarity}
    </span>
  );
}

function CosmeticCard({ item, isOwned, isFeatured = false, onPurchase, onEquip, isEquipped = false, price }: {
  item: CosmeticItem;
  isOwned: boolean;
  isFeatured?: boolean;
  onPurchase: () => void;
  onEquip: () => void;
  isEquipped?: boolean;
  price?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const t = useTranslation();

  return (
    <motion.div
      className={`
        relative rounded-xl overflow-hidden border transition-all duration-300
        ${isFeatured ? 'border-amber-500/40' : 'border-[rgb(var(--c3)/30%)]'}
        ${isEquipped ? 'ring-2 ring-amber-500/50' : ''}
      `}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      layout
    >
      {(isFeatured || item.rarity === 'Legendary') && (
        <motion.div
          className="absolute inset-0 opacity-0 pointer-events-none"
          style={{ boxShadow: RARITY_GLOW[item.rarity] }}
          animate={{ opacity: isHovered ? 0.6 : 0 }}
        />
      )}

      {item.isVipExclusive && (
        <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-purple-600 to-violet-600 text-[rgb(var(--text-primary))] text-xs font-bold px-2 py-0.5 rounded-full">
          VIP
        </div>
      )}

      {isFeatured && (
        <div className="absolute top-2 right-2 z-10 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
          FEATURED
        </div>
      )}

      <div className="relative aspect-square bg-gradient-to-b from-neutral-800 to-neutral-900 flex items-center justify-center overflow-hidden">
        <div className="text-4xl opacity-30">
          {item.category === 'cardBack' ? '🃏' : item.category === 'tableTheme' ? '🎰' : item.category === 'profileFrame' ? '🖼️' : item.category === 'emote' ? '😊' : '✨'}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        <motion.div
          className="absolute inset-0 bg-black/40 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
        >
          <p className="text-[rgb(var(--c5))] text-sm text-center px-4">{item.description}</p>
        </motion.div>
      </div>

      <div className="p-3 bg-[rgb(var(--c2)/80%)]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-[rgb(var(--text-primary))] truncate">{item.name}</h3>
          <RarityBadge rarity={item.rarity} />
        </div>

        <div className="flex items-center justify-between">
          {isOwned ? (
            <motion.button
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                isEquipped
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/30'
                  : 'bg-[rgb(var(--c3))] text-[rgb(var(--c5))] hover:bg-[rgb(var(--c4))]'
              }`}
              onClick={onEquip}
              whileTap={{ scale: 0.95 }}
            >
              {isEquipped ? t('shop_equipped') : t('shop_equip')}
            </motion.button>
          ) : (
            <motion.button
              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 text-[rgb(var(--text-primary))] font-bold text-sm hover:from-amber-500 hover:to-yellow-500 transition-all flex items-center justify-center gap-1.5"
              onClick={onPurchase}
              whileTap={{ scale: 0.95 }}
            >
              <span>🪙</span>
              <span>{(price ?? item.price).toLocaleString()}</span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CoinPackCard({ pack, onPurchase }: { pack: typeof COIN_PACKS[0]; onPurchase: () => void }) {
  const t = useTranslation();
  return (
    <motion.div
      className={`
        relative rounded-xl overflow-hidden border p-4
        ${pack.isBestValue ? 'border-amber-500/50 bg-gradient-to-b from-amber-900/20 to-black' : 'border-[rgb(var(--c3)/30%)] bg-[rgb(var(--c2)/60%)]'}
      `}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {pack.isPopular && (
        <div className="absolute top-0 right-0 bg-blue-500 text-[rgb(var(--text-primary))] text-xs font-bold px-3 py-1 rounded-bl-xl">
          POPULAR
        </div>
      )}
      {pack.isBestValue && (
        <div className="absolute top-0 right-0 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-bl-xl">
          BEST VALUE
        </div>
      )}

      <div className="text-center mb-4">
        <div className="text-4xl mb-2">🪙</div>
        <h3 className="text-lg font-bold text-amber-200">{pack.name}</h3>
        <p className="text-3xl font-bold text-amber-400 mt-1">{pack.coins.toLocaleString()}</p>
        <p className="text-[rgb(var(--c4))] text-sm">Coins</p>
      </div>

      <div className="flex items-center justify-center gap-1 mb-4">
        <span className="text-[rgb(var(--c5))] text-sm">MVR</span>
        <span className="text-xl font-bold text-[rgb(var(--text-primary))]">{pack.priceMVR}</span>
      </div>

      <motion.button
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 text-[rgb(var(--text-primary))] font-bold hover:from-amber-500 hover:to-yellow-500 transition-all border border-amber-400/20"
        onClick={onPurchase}
        whileTap={{ scale: 0.95 }}
      >
        {t('shop_purchase')}
      </motion.button>

      <p className="text-center text-[rgb(var(--c3))] text-xs mt-2">Requires admin approval before coins are credited</p>
    </motion.div>
  );
}

const VIP_PLANS = [
  { id: 'weekly' as const, days: 7, priceMVR: 100, label: 'Weekly', sub: '7 Days of Premium Benefits' },
  // 4 weekly passes back-to-back would be MVR 400 (4 x 100) - the monthly
  // plan is priced a little below that as the "slight discount" you asked for.
  { id: 'monthly' as const, days: 30, priceMVR: 350, label: 'Monthly', sub: '30 Days of Premium Benefits', savingsNote: 'Save MVR 50 vs. 4 weekly passes' },
];

export default function CosmeticShop() {
  const { state, purchaseCosmetic, equipCosmetic, activateVip } = useEconomy();
  const { user, isGuest } = useAuth();
  const [activeTab, setActiveTab] = useState<'featured' | 'permanent' | 'coins' | 'vip'>('featured');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeLeft, setTimeLeft] = useState('');
  const [selectedVipPlan, setSelectedVipPlan] = useState<'weekly' | 'monthly'>('weekly');
  const [myTopups, setMyTopups] = useState<CoinTopupRequest[]>([]);
  const shopOverrides = state.shopOverrides;
  const t = useTranslation();
  const { showToast } = useToast();

  useEffect(() => {
    if (!user?.uid || isGuest) return;
    return watchMyTopups(user.uid, setMyTopups);
  }, [user?.uid, isGuest]);

  function priceFor(item: CosmeticItem): number {
    return shopOverrides?.priceOverrides[item.id] ?? item.price;
  }
  function isHidden(item: CosmeticItem): boolean {
    return shopOverrides?.hiddenItemIds.includes(item.id) ?? false;
  }

  const pendingTopup = myTopups.find((topup) => topup.status === 'pending');

  async function handlePurchaseCoinPack(pack: typeof COIN_PACKS[0]) {
    if (!user?.uid || isGuest) {
      showToast(t('toast_signInToTopUp'), 'info');
      return;
    }
    // This used to fire-and-forget: a rejected write (offline, rules
    // change) still showed the "pending approval" alert, so the player
    // believed a request existed that never did.
    try {
      await requestCoinTopup(user.uid, user.displayName ?? 'Player', pack.coins, pack.priceMVR, pack.name);
      showToast(t('toast_topupPending').replace('{pack}', pack.name), 'success');
    } catch {
      showToast(t('toast_topupFailed'), 'error');
    }
  }

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const nextSunday = new Date();
      nextSunday.setDate(now.getDate() + (7 - now.getDay()));
      nextSunday.setHours(0, 0, 0, 0);
      const diff = nextSunday.getTime() - now.getTime();
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeLeft(`${days}d ${hours}h ${minutes}m`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, []);

  const categories = [
    { id: 'all', label: t('shop_catAll'), icon: '🛍️' },
    { id: 'cardBack', label: t('shop_catCardBacks'), icon: '🃏' },
    { id: 'tableTheme', label: t('shop_catTables'), icon: '🎰' },
    { id: 'profileFrame', label: t('shop_catFrames'), icon: '🖼️' },
    { id: 'emote', label: t('shop_catEmotes'), icon: '😊' },
    { id: 'victoryAnimation', label: t('shop_catVictory'), icon: '✨' },
    { id: 'sticker', label: t('shop_catStickers'), icon: '🏷️' },
    { id: 'banner', label: t('shop_catBanners'), icon: '🚩' },
  ];

  // Deterministic rotation: same featured set for everyone during a given
  // calendar week, automatically swapping out the following week. VIP
  // members get one extra featured slot, matching the perk called out
  // in the banner below.
  const featuredItems = getWeeklyFeaturedRotation(state.profile.vip.active ? 7 : 6).filter((c) => !isHidden(c));
  const permanentItems = (selectedCategory === 'all'
    ? ALL_COSMETICS.filter(c => !c.isVipExclusive)
    : ALL_COSMETICS.filter(c => c.category === selectedCategory && !c.isVipExclusive)
  ).filter((c) => !isHidden(c));

  const isItemEquipped = (item: CosmeticItem) => {
    const map: Record<string, string> = {
      cardBack: state.profile.equipped.cardBack,
      tableTheme: state.profile.equipped.tableTheme,
      profileFrame: state.profile.equipped.profileFrame,
      victoryAnimation: state.profile.equipped.victoryAnimation,
      banner: state.profile.equipped.banner,
    };
    return map[item.category] === item.id;
  };

  const isItemOwned = (itemId: string) => {
    return Object.values(state.profile.collection).flat().includes(itemId);
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-amber-300">{t('shop_headerTitle')}</h1>
          <p className="text-[rgb(var(--c4))] text-sm">{t('shop_headerSubtitle')}</p>
        </div>
        <CoinBalance size="lg" />
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'featured', label: t('shop_tabFeatured'), icon: '⭐' },
          { id: 'permanent', label: t('shop_tabPermanent'), icon: '🛒' },
          { id: 'coins', label: t('shop_tabCoins'), icon: '🪙' },
          { id: 'vip', label: t('shop_tabVip'), icon: '👑' },
        ].map((tab) => (
          <motion.button
            key={tab.id}
            className={`
              px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all
              ${activeTab === tab.id
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-[rgb(var(--text-primary))] shadow-lg shadow-amber-500/20'
                : 'bg-[rgb(var(--c2)/60%)] text-[rgb(var(--c5))] border border-[rgb(var(--c3)/30%)] hover:border-amber-500/20'
              }
            `}
            onClick={() => setActiveTab(tab.id as any)}
            whileTap={{ scale: 0.95 }}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'featured' && (
          <motion.div
            key="featured"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-amber-200">{t('shop_weeklyFeatured')}</h2>
              <div className="flex items-center gap-2 bg-[rgb(var(--c2)/60%)] rounded-full px-4 py-1.5 border border-amber-500/20">
                <span className="text-amber-400 text-sm">⏰</span>
                <span className="text-amber-200 text-sm font-mono">{timeLeft}</span>
              </div>
            </div>

            {state.profile.vip.active && (
              <div className="mb-4 p-3 bg-gradient-to-r from-purple-900/30 to-violet-900/30 rounded-xl border border-purple-500/20">
                <p className="text-purple-300 text-sm font-medium">👑 VIP Exclusive: +1 Featured cosmetic available</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredItems.map((item) => (
                <CosmeticCard
                  key={item.id}
                  item={item}
                  isOwned={isItemOwned(item.id)}
                  isFeatured
                  onPurchase={() => purchaseCosmetic(item.id)}
                  onEquip={() => equipCosmetic(item.category, item.id)}
                  isEquipped={isItemEquipped(item)}
                  price={priceFor(item)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'permanent' && (
          <motion.div
            key="permanent"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                    ${selectedCategory === cat.id
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500/30'
                      : 'bg-[rgb(var(--c3))] text-[rgb(var(--c4))] border border-[rgb(var(--c3)/30%)] hover:text-[rgb(var(--c5))]'
                    }
                  `}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span className="mr-1">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {permanentItems.map((item) => (
                <CosmeticCard
                  key={item.id}
                  item={item}
                  isOwned={isItemOwned(item.id)}
                  onPurchase={() => purchaseCosmetic(item.id)}
                  onEquip={() => equipCosmetic(item.category, item.id)}
                  isEquipped={isItemEquipped(item)}
                  price={priceFor(item)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'coins' && (
          <motion.div
            key="coins"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {pendingTopup && (
              <div className="mb-4 p-3 bg-amber-900/20 rounded-xl border border-amber-500/20">
                <p className="text-amber-300 text-sm">
                  ⏳ Your {pendingTopup.packName} top-up ({pendingTopup.coins.toLocaleString()} coins) is pending admin approval.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {COIN_PACKS.map((pack) => (
                <CoinPackCard key={pack.id} pack={pack} onPurchase={() => handlePurchaseCoinPack(pack)} />
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'vip' && (
          <motion.div
            key="vip"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="max-w-lg mx-auto">
              <motion.div
                className="bg-gradient-to-b from-purple-900/30 to-black border border-purple-500/30 rounded-2xl p-8 text-center relative overflow-hidden"
                whileHover={{ scale: 1.01 }}
              >
                <div className="absolute inset-0 opacity-10">
                  <motion.div
                    className="absolute w-64 h-64 rounded-full bg-purple-500 blur-3xl"
                    animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
                    transition={{ repeat: Infinity, duration: 8 }}
                  />
                </div>

                <div className="relative z-10">
                  <motion.div
                    className="text-6xl mb-4"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                  >
                    👑
                  </motion.div>
                  <h2 className="text-3xl font-bold text-purple-300 mb-2">{t('vip_pass')}</h2>
                  <p className="text-purple-200/60 mb-6">{VIP_PLANS.find(p => p.id === selectedVipPlan)?.sub}</p>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {VIP_PLANS.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedVipPlan(plan.id)}
                        className={`relative rounded-xl border p-4 text-left transition-all ${
                          selectedVipPlan === plan.id
                            ? 'border-purple-400 bg-purple-900/30'
                            : 'border-[rgb(var(--c3)/40%)] bg-[rgb(var(--c2)/40%)]'
                        }`}
                      >
                        {plan.savingsNote && (
                          <span className="absolute -top-2 right-2 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                            SAVE
                          </span>
                        )}
                        <p className="text-purple-200 text-sm font-bold">{plan.id === 'weekly' ? t('vip_weeklyLabel') : t('vip_monthlyLabel')}</p>
                        <p className="text-2xl font-bold text-[rgb(var(--text-primary))] mt-1">
                          MVR <span className="text-purple-400">{plan.priceMVR}</span>
                        </p>
                        {plan.savingsNote && <p className="text-amber-400 text-[11px] mt-1">{plan.savingsNote}</p>}
                      </button>
                    ))}
                  </div>

                  <ul className="text-left space-y-3 mb-8">
                    {[
                      t('vip_benefit1'),
                      t('vip_benefit2'),
                      t('vip_benefit3'),
                      t('vip_benefit4'),
                      t('vip_benefit5'),
                      t('vip_benefit6'),
                    ].map((benefit, i) => (
                      <motion.li
                        key={i}
                        className="flex items-center gap-3 text-[rgb(var(--c5))]"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <span className="text-purple-400">✓</span>
                        {benefit}
                      </motion.li>
                    ))}
                  </ul>

                  <motion.button
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-[rgb(var(--text-primary))] font-bold text-lg hover:from-purple-500 hover:to-violet-500 transition-all border border-purple-400/30"
                    onClick={() => {
                      const plan = VIP_PLANS.find(p => p.id === selectedVipPlan)!;
                      activateVip(plan.days);
                      showToast(
                        t('toast_vipActivated').replace(
                          '{plan}',
                          plan.id === 'weekly' ? t('vip_weeklyLabel') : t('vip_monthlyLabel')
                        ),
                        'success'
                      );
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {t('vip_activateBtn').replace('{plan}', selectedVipPlan === 'weekly' ? t('vip_weeklyLabel') : t('vip_monthlyLabel'))}
                  </motion.button>

                  {state.profile.vip.active && (
                    <motion.div
                      className="mt-4 p-3 bg-green-900/30 rounded-xl border border-green-500/20"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <p className="text-green-300 text-sm">
                        ✅ {t('vip_activeStatus').replace('{n}', String(state.profile.vip.remainingDays))}
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
