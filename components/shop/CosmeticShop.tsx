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
import { CategoryIcon, CoinIcon, Crown } from '../ui/icons';
import { CosmeticPreview } from '../ui/CosmeticPreview';
import { AlertTriangle, Search, Timer, Check, Sparkles, ShoppingBag, Coins, ShieldCheck } from 'lucide-react';

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
        cosmetic-shop-card relative rounded-lg overflow-hidden border transition-colors duration-200
        ${isFeatured ? 'border-[rgb(var(--gold)/40%)]' : 'border-[rgb(var(--c3)/30%)]'}
        ${isEquipped ? 'ring-2 ring-[rgb(var(--gold)/50%)]' : ''}
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
        <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-[rgb(var(--orchid))] to-[rgb(var(--orchid)/80%)] text-[rgb(var(--text-primary))] text-xs font-bold px-2 py-0.5 rounded-full">
          VIP
        </div>
      )}

      {isFeatured && (
        <div className="absolute top-2 right-2 z-10 bg-gradient-to-r from-[rgb(var(--gold))] to-[rgb(var(--gold-bright))] text-black text-xs font-bold px-2 py-0.5 rounded-full">
          FEATURED
        </div>
      )}

      <div className="cosmetic-display relative flex items-center justify-center overflow-hidden">
        <CosmeticPreview item={item} />
        
        <motion.div
          className="pointer-events-none absolute inset-0 bg-black/80 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
        >
          <p className="text-[rgb(var(--c5))] text-sm text-center px-4">{item.description}</p>
        </motion.div>
      </div>

      <div className="p-3 bg-[rgb(var(--c2)/80%)]">
        <div className="flex flex-col items-start gap-2 mb-3">
          <h3 className="text-sm font-bold text-[rgb(var(--text-primary))] min-h-10">{item.name}</h3>
          <RarityBadge rarity={item.rarity} />
        </div>

        <div className="flex items-center justify-between">
          {isOwned ? (
            <motion.button
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                isEquipped
                  ? 'bg-[rgb(var(--gold)/25%)] text-[rgb(var(--gold-ink))] border border-[rgb(var(--gold)/30%)]'
                  : 'bg-[rgb(var(--c3))] text-[rgb(var(--c5))] hover:bg-[rgb(var(--c4))]'
              }`}
              onClick={onEquip}
              disabled={isEquipped || item.category === 'emote' || item.category === 'sticker'}
              whileTap={{ scale: 0.95 }}
            >
              {isEquipped ? t('shop_equipped') : item.category === 'emote' || item.category === 'sticker' ? t('inventory_owned') : t('shop_equip')}
            </motion.button>
          ) : (
            <motion.button
              className="flex-1 py-2 rounded-lg bg-[rgb(var(--gold))] text-[#14180e] font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
              onClick={onPurchase}
              whileTap={{ scale: 0.95 }}
            >
              <CoinIcon size={15} />
              <span>{(price ?? item.price).toLocaleString()}</span>
            </motion.button>
          )}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-[rgb(var(--c4))] line-clamp-2 min-h-8">{item.description}</p>
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
        ${pack.isBestValue ? 'border-[rgb(var(--gold)/50%)] bg-gradient-to-b from-[rgb(var(--gold)/10%)] to-[rgb(var(--c1))]' : 'border-[rgb(var(--c3)/30%)] bg-[rgb(var(--c2)/60%)]'}
      `}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {pack.isPopular && (
        <div className="absolute top-0 right-0 bg-[rgb(var(--deep))] text-[rgb(var(--text-primary))] text-xs font-bold px-3 py-1 rounded-bl-xl">
          POPULAR
        </div>
      )}
      {pack.isBestValue && (
        <div className="absolute top-0 right-0 bg-[rgb(var(--gold))] text-black text-xs font-bold px-3 py-1 rounded-bl-xl">
          BEST VALUE
        </div>
      )}

      <div className="text-center mb-4">
        <CoinIcon size={40} className="mx-auto mb-2" />
        <h3 className="text-lg font-bold text-[rgb(var(--gold-ink))]">{pack.name}</h3>
        <p className="text-3xl font-bold text-[rgb(var(--gold-ink))] mt-1">{pack.coins.toLocaleString()}</p>
        <p className="text-[rgb(var(--c4))] text-sm">Coins</p>
      </div>

      <div className="flex items-center justify-center gap-1 mb-4">
        <span className="text-[rgb(var(--c5))] text-sm">MVR</span>
        <span className="text-xl font-bold text-[rgb(var(--text-primary))]">{pack.priceMVR}</span>
      </div>

      <motion.button
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[rgb(var(--text-primary))] font-bold hover:from-[rgb(var(--gold))] hover:to-[rgb(var(--gold-bright))] transition-all border border-[rgb(var(--gold)/20%)]"
        onClick={onPurchase}
        whileTap={{ scale: 0.95 }}
      >
        {t('shop_purchase')}
      </motion.button>

      <p className="text-center text-[rgb(var(--c3))] text-xs mt-2">Requires admin approval before coins are credited</p>
    </motion.div>
  );
}

/** Shown instead of letting a purchase silently fail when the player can't
 *  afford an item - tells them exactly how many more coins they need and
 *  offers the two real ways to get there: buy a coin pack, or keep playing
 *  to earn the rest (matches/missions/rank rewards already grant coins). */
function InsufficientBalanceModal({
  item,
  price,
  balance,
  onTopUp,
  onClose,
}: {
  item: CosmeticItem;
  price: number;
  balance: number;
  onTopUp: () => void;
  onClose: () => void;
}) {
  const t = useTranslation();
  const shortfall = price - balance;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="glass-card rounded-2xl p-6 w-full max-w-sm text-center"
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[rgb(var(--coral)/15%)] border border-[rgb(var(--coral)/35%)]">
          <AlertTriangle size={26} className="text-[rgb(var(--coral-ink))]" aria-hidden="true" />
        </div>

        <h3 className="text-lg font-bold text-[rgb(var(--text-primary))] mb-1">{t('shop_insufficientTitle')}</h3>
        <p className="text-[rgb(var(--c4))] text-sm mb-4">
          {t('shop_insufficientBody').replace('{item}', item.name)}
        </p>

        <div className="rounded-xl bg-[rgb(var(--c2)/70%)] border border-[rgb(var(--c3))] p-3 mb-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[rgb(var(--c4))]">
            <span>{t('shop_yourBalance')}</span>
            <span className="flex items-center gap-1 font-semibold text-[rgb(var(--text-primary))]"><CoinIcon size={12} />{balance.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[rgb(var(--c4))]">
            <span>{t('shop_itemPrice')}</span>
            <span className="flex items-center gap-1 font-semibold text-[rgb(var(--text-primary))]"><CoinIcon size={12} />{price.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[rgb(var(--c3))]">
            <span className="text-[rgb(var(--coral-ink))] font-semibold">{t('shop_youNeed')}</span>
            <span className="flex items-center gap-1 font-bold text-[rgb(var(--coral-ink))]"><CoinIcon size={12} />{shortfall.toLocaleString()} {t('shop_more')}</span>
          </div>
        </div>

        <p className="text-[rgb(var(--c4))] text-xs mb-5">{t('shop_insufficientAdvice')}</p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))] text-sm font-medium"
          >
            {t('shop_keepPlaying')}
          </button>
          <button
            onClick={onTopUp}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] text-sm font-bold"
          >
            {t('shop_topUpNow')}
          </button>
        </div>
      </motion.div>
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
  const [queryText, setQueryText] = useState('');
  const [sort, setSort] = useState('default');
  const [timeLeft, setTimeLeft] = useState('');
  const [selectedVipPlan, setSelectedVipPlan] = useState<'weekly' | 'monthly'>('weekly');
  const [myTopups, setMyTopups] = useState<CoinTopupRequest[]>([]);
  const [insufficientItem, setInsufficientItem] = useState<CosmeticItem | null>(null);
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

  // Shared by both the Featured and Permanent grids: check the balance
  // BEFORE calling purchaseCosmetic, so a failed purchase (insufficient
  // coins) surfaces as an explicit warning instead of the button silently
  // doing nothing (purchaseCosmetic itself just returns false in that case).
  function handlePurchase(item: CosmeticItem) {
    const price = priceFor(item);
    if (state.economy.coins < price) {
      setInsufficientItem(item);
      return;
    }
    if (purchaseCosmetic(item.id)) showToast(`${item.name} - ${t('inventory_owned')}`, 'success');
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
    { id: 'all', label: t('shop_catAll') },
    { id: 'cardBack', label: t('shop_catCardBacks') },
    { id: 'tableTheme', label: t('shop_catTables') },
    { id: 'profileFrame', label: t('shop_catFrames') },
    { id: 'emote', label: t('shop_catEmotes') },
    { id: 'victoryAnimation', label: t('shop_catVictory') },
    { id: 'sticker', label: t('shop_catStickers') },
    { id: 'banner', label: t('shop_catBanners') },
  ];

  // Deterministic rotation: same featured set for everyone during a given
  // calendar week, automatically swapping out the following week. VIP
  // members get one extra featured slot, matching the perk called out
  // in the banner below.
  const featuredItems = getWeeklyFeaturedRotation(state.profile.vip.active ? 7 : 6).filter((c) => !isHidden(c));
  const permanentItems = (selectedCategory === 'all'
    ? ALL_COSMETICS.filter(c => !c.isVipExclusive)
    : ALL_COSMETICS.filter(c => c.category === selectedCategory && !c.isVipExclusive)
  ).filter((c) => !isHidden(c) && c.name.toLowerCase().includes(queryText.trim().toLowerCase()))
    .sort((a, b) => sort === 'price' ? priceFor(a) - priceFor(b) : sort === 'name' ? a.name.localeCompare(b.name) : 0);

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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-bold text-[rgb(var(--text-primary))]">{t('shop_headerTitle')}</h2>
          <p className="text-[rgb(var(--c4))] text-sm">{t('shop_headerSubtitle')}</p>
        </div>
        <CoinBalance size="lg" />
      </div>

      <div className="hub-tabs" aria-label={t('page_shop')}>
        {[
          { id: 'featured', label: t('shop_tabFeatured') },
          { id: 'permanent', label: t('shop_tabPermanent') },
          { id: 'coins', label: t('shop_tabCoins') },
          { id: 'vip', label: t('shop_tabVip') },
        ].map((tab) => (
          <motion.button
            key={tab.id}
            aria-pressed={activeTab === tab.id}
            className={`
              px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all
              ${activeTab === tab.id
                ? 'bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[rgb(var(--text-primary))] shadow-lg shadow-[rgb(var(--gold)/20%)]'
                : 'bg-[rgb(var(--c2)/60%)] text-[rgb(var(--c5))] border border-[rgb(var(--c3)/30%)] hover:border-[rgb(var(--gold)/20%)]'
              }
            `}
            onClick={() => setActiveTab(tab.id as any)}
            whileTap={{ scale: 0.95 }}
          >
            {tab.id === 'featured' ? <Sparkles size={16} /> : tab.id === 'permanent' ? <ShoppingBag size={16} /> : tab.id === 'coins' ? <Coins size={16} /> : <ShieldCheck size={16} />}{tab.label}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'featured' && (
          <motion.div
            key="featured"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold text-[rgb(var(--gold-ink))]">{t('shop_weeklyFeatured')}</h2>
              <div className="flex items-center gap-2 bg-[rgb(var(--c2)/60%)] rounded-full px-4 py-1.5 border border-[rgb(var(--gold)/20%)]">
                <Timer size={16} className="text-[rgb(var(--gold))]" />
                <span className="text-[rgb(var(--gold-ink))] text-sm font-mono">{timeLeft}</span>
              </div>
            </div>

            {state.profile.vip.active && (
              <div className="mb-4 p-3 bg-gradient-to-r from-[rgb(var(--orchid)/15%)] to-[rgb(var(--orchid)/15%)] rounded-xl border border-[rgb(var(--orchid)/20%)]">
                <p className="text-[rgb(var(--orchid-ink))] text-sm font-medium flex items-center gap-1.5">
                  <Crown size={14} aria-hidden="true" /> VIP Exclusive: +1 Featured cosmetic available
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredItems.map((item) => (
                <CosmeticCard
                  key={item.id}
                  item={item}
                  isOwned={isItemOwned(item.id)}
                  isFeatured
                  onPurchase={() => handlePurchase(item)}
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="catalog-toolbar"><label className="hub-search"><Search size={16} /><input aria-label="Search cosmetics" placeholder="Search cosmetics" value={queryText} onChange={event => setQueryText(event.target.value)} /></label><select aria-label="Sort cosmetics" value={sort} onChange={event=>setSort(event.target.value)}><option value="default">Collection order</option><option value="price">Price: low to high</option><option value="name">Name: A to Z</option></select></div>
            <div className="hub-tabs hub-category-tabs">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  aria-pressed={selectedCategory === cat.id}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                    ${selectedCategory === cat.id
                      ? 'bg-[rgb(var(--gold)/25%)] text-[rgb(var(--gold-ink))] border border-[rgb(var(--gold)/30%)]'
                      : 'bg-[rgb(var(--c3))] text-[rgb(var(--c4))] border border-[rgb(var(--c3)/30%)] hover:text-[rgb(var(--c5))]'
                    }
                  `}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <CategoryIcon category={cat.id} size={14} />
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {permanentItems.length === 0 && <p className="col-span-full py-12 text-center text-sm text-[rgb(var(--c4))]">{t('inventory_nothingHere')}</p>}
              {permanentItems.map((item) => (
                <CosmeticCard
                  key={item.id}
                  item={item}
                  isOwned={isItemOwned(item.id)}
                  onPurchase={() => handlePurchase(item)}
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {pendingTopup && (
              <div className="mb-4 p-3 bg-[rgb(var(--gold)/10%)] rounded-xl border border-[rgb(var(--gold)/20%)]">
                <p className="text-[rgb(var(--gold-ink))] text-sm">
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="max-w-lg mx-auto">
              <motion.div
                className="bg-gradient-to-b from-[rgb(var(--orchid)/15%)] to-[rgb(var(--c1))] border border-[rgb(var(--orchid)/30%)] rounded-2xl p-8 text-center relative overflow-hidden"
                whileHover={{ scale: 1.01 }}
              >
                <div className="absolute inset-0 opacity-10">
                  <motion.div
                    className="absolute w-64 h-64 rounded-full bg-[rgb(var(--orchid))] blur-3xl"
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
                    <Crown size={56} className="mx-auto text-[rgb(var(--orchid-ink))]" />
                  </motion.div>
                  <h2 className="text-3xl font-bold text-[rgb(var(--orchid-ink))] mb-2">{t('vip_pass')}</h2>
                  <p className="text-[rgb(var(--orchid-ink)/70%)] mb-6">{VIP_PLANS.find(p => p.id === selectedVipPlan)?.sub}</p>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {VIP_PLANS.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedVipPlan(plan.id)}
                        className={`relative rounded-xl border p-4 text-left transition-all ${
                          selectedVipPlan === plan.id
                            ? 'border-[rgb(var(--orchid))] bg-[rgb(var(--orchid)/15%)]'
                            : 'border-[rgb(var(--c3)/40%)] bg-[rgb(var(--c2)/40%)]'
                        }`}
                      >
                        {plan.savingsNote && (
                          <span className="absolute -top-2 right-2 bg-[rgb(var(--gold))] text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                            SAVE
                          </span>
                        )}
                        <p className="text-[rgb(var(--orchid-ink))] text-sm font-bold">{plan.id === 'weekly' ? t('vip_weeklyLabel') : t('vip_monthlyLabel')}</p>
                        <p className="text-2xl font-bold text-[rgb(var(--text-primary))] mt-1">
                          MVR <span className="text-[rgb(var(--orchid-ink))]">{plan.priceMVR}</span>
                        </p>
                        {plan.savingsNote && <p className="text-[rgb(var(--gold-ink))] text-[11px] mt-1">{plan.savingsNote}</p>}
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
                        <span className="text-[rgb(var(--orchid-ink))]">✓</span>
                        {benefit}
                      </motion.li>
                    ))}
                  </ul>

                  <motion.button
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[rgb(var(--orchid))] to-[rgb(var(--orchid)/80%)] text-[rgb(var(--text-primary))] font-bold text-lg hover:from-[rgb(var(--orchid))] hover:to-[rgb(var(--orchid)/80%)] transition-all border border-[rgb(var(--orchid)/30%)]"
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
                      className="mt-4 p-3 bg-[rgb(var(--lagoon)/15%)] rounded-xl border border-[rgb(var(--lagoon)/20%)]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <p className="text-[rgb(var(--lagoon-ink))] text-sm">
                        {t('vip_activeStatus').replace('{n}', String(state.profile.vip.remainingDays))}
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {insufficientItem && (
          <InsufficientBalanceModal
            item={insufficientItem}
            price={priceFor(insufficientItem)}
            balance={state.economy.coins}
            onClose={() => setInsufficientItem(null)}
            onTopUp={() => {
              setInsufficientItem(null);
              setActiveTab('coins');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
