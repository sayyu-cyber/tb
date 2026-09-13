// src/components/shop/CosmeticShop.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEconomy } from '../../contexts/EconomyContext';
import { CosmeticItem } from '../../types/economy';
import { ALL_COSMETICS, COIN_PACKS } from '../../data/cosmetics';
import { getWeeklyFeaturedRotation, getRotationWeekNumber } from '../../lib/cosmeticRotation';
import { requestCoinTopup, watchMyTopups, CoinTopupRequest } from '../../lib/coinTopups';
import { useAuth } from '../../contexts/AuthContext';
import CoinBalance from '../economy/CoinBalance';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { CategoryIcon, Crown } from '../ui/icons';
import { ShopItemCard as CosmeticCard } from './ShopItemCard';
import { ShopItemDialog } from './ShopItemDialog';
import { CoinPackCard } from './StoreCoinPacks';
import { Plus, ArrowRight, Search, Timer, Sparkles, ShoppingBag, Coins, ShieldCheck } from 'lucide-react';

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
  const [selectedItem, setSelectedItem] = useState<CosmeticItem | null>(null);
  const [intent, setIntent] = useState<'preview' | 'buy'>('preview');
  const [topupBusy, setTopupBusy] = useState(false);
  const topupPending = useRef(false);
  const purchasePending = useRef(false);
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

  function handlePurchase(item: CosmeticItem) {
    setIntent('buy'); setSelectedItem(item);
  }
  function confirmPurchase(item: CosmeticItem) {
    if (purchasePending.current) return;
    if (isItemOwned(item.id)) { showToast("You already own this item.", "info"); return; }
    if (isHidden(item)) { showToast("This item is no longer available.", "error"); return; }
    purchasePending.current = true;
    try {
      if (purchaseCosmetic(item.id)) { showToast(item.name + " added to your inventory.", "success"); setSelectedItem(null); }
      else showToast("Purchase could not be completed. Check your balance.", "error");
    } finally { window.setTimeout(() => { purchasePending.current = false; }, 250); }
  }
  function handleEquip(item: CosmeticItem) {
    equipCosmetic(item.category, item.id);
    showToast(item.name + " equipped.", "success");
  }

  const pendingTopup = myTopups.find((topup) => topup.status === 'pending');

  async function handlePurchaseCoinPack(pack: typeof COIN_PACKS[0]) {
    if (!user?.uid || isGuest) {
      showToast(t('toast_signInToTopUp'), 'info');
      return;
    }
    if (topupPending.current || pendingTopup) return;
    topupPending.current = true; setTopupBusy(true);
    // This used to fire-and-forget: a rejected write (offline, rules
    // change) still showed the "pending approval" alert, so the player
    // believed a request existed that never did.
    try {
      await requestCoinTopup(user.uid, user.displayName ?? 'Player', pack.coins, pack.priceMVR, pack.name);
      showToast(t('toast_topupPending').replace('{pack}', pack.name), 'success');
    } catch {
      showToast(t('toast_topupFailed'), 'error');
    } finally { topupPending.current = false; setTopupBusy(false); }
  }

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const nextRotation = Date.UTC(2024, 0, 1) + (getRotationWeekNumber(now) + 1) * 7 * 86400000;
      const diff = nextRotation - now.getTime();
      
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
  ).filter((c) => !isHidden(c) && [c.name, c.rarity, c.category].join(' ').toLowerCase().includes(queryText.trim().toLowerCase()))
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
    <div className="storefront">
      <header className="store-hero">
        <div><p className="store-eyebrow">THAASBAI</p><h1><ShoppingBag size={34} />Shop</h1><h2>Premium cosmetics and coin packs</h2><p>Customize your table, cards, and experience. Stand out in every game.</p></div>
        <div className="store-balance"><span>Your Balance</span><div><CoinBalance size="lg" /><button aria-label="Get coins" title="Get coins" onClick={() => setActiveTab('coins')}><Plus size={20} /></button></div></div>
      </header>
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

      <section className="store-vip-strip"><Crown size={32} /><div><strong>{state.profile.vip.active ? "VIP Active" : "VIP Exclusive: +1 Featured cosmetic available"}</strong><p>{state.profile.vip.active ? "Your extra weekly cosmetic slot is unlocked." : "Upgrade to VIP Pass to unlock an extra featured item every week."}</p></div>{!state.profile.vip.active && <button onClick={() => setActiveTab('vip')}>View VIP Plans<ArrowRight size={17} /></button>}</section>

      <AnimatePresence initial={false} mode="popLayout">
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
                <span className="text-xs text-[rgb(var(--c4))]">Refreshes in</span><Timer size={16} className="text-[rgb(var(--gold))]" aria-label="Featured items rotate weekly" />
                <span className="text-[rgb(var(--gold-ink))] text-sm font-mono">{timeLeft}</span>
              </div>
            </div>

            <div className="store-item-grid">
              {featuredItems.length === 0 && <p>No featured items right now. Check back after the next rotation.</p>}
              {featuredItems.map((item) => (
                <CosmeticCard
                  key={item.id}
                  item={item}
                  isOwned={isItemOwned(item.id)}
                  isFeatured
                  onPurchase={() => handlePurchase(item)}
                  onEquip={() => handleEquip(item)}
                  onPreview={() => { setIntent('preview'); setSelectedItem(item); }}
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

            <div className="store-item-grid">
              {permanentItems.length === 0 && <p className="col-span-full py-12 text-center text-sm text-[rgb(var(--c4))]">{t('inventory_nothingHere')}</p>}
              {permanentItems.map((item) => (
                <CosmeticCard
                  key={item.id}
                  item={item}
                  isOwned={isItemOwned(item.id)}
                  onPurchase={() => handlePurchase(item)}
                  onEquip={() => handleEquip(item)}
                  onPreview={() => { setIntent('preview'); setSelectedItem(item); }}
                  isEquipped={isItemEquipped(item)}
                  price={priceFor(item)}
                />
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
                    disabled={state.profile.vip.active}
                    onClick={() => {
                      const plan = VIP_PLANS.find(p => p.id === selectedVipPlan)!;
                      if (state.profile.vip.active) return;
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
                    {state.profile.vip.active ? 'VIP Active' : t('vip_activateBtn').replace('{plan}', selectedVipPlan === 'weekly' ? t('vip_weeklyLabel') : t('vip_monthlyLabel'))}
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

      {(activeTab === 'featured' || activeTab === 'coins') && <section className="store-coin-section">
        <header><Coins size={22} /><h2>Coin Packs</h2><p>Get coins to buy exclusive cosmetics</p>{activeTab === 'featured' && <button onClick={() => setActiveTab('coins')}>View All<ArrowRight size={16} /></button>}</header>
        <p className="store-payment-note">Prices in MVR. Top-ups require admin approval before coins are credited.</p>
        {pendingTopup && <p role="status" className="store-payment-note">Your {pendingTopup.packName} request is pending admin approval.</p>}
        <div className="store-coin-grid">{(activeTab === 'featured' ? COIN_PACKS.slice(0, 4) : COIN_PACKS).map(pack => <CoinPackCard key={pack.id} pack={pack} disabled={topupBusy || !!pendingTopup} onPurchase={() => handlePurchaseCoinPack(pack)} />)}</div>
      </section>}
      {selectedItem && <ShopItemDialog item={selectedItem} intent={intent} price={priceFor(selectedItem)} balance={state.economy.coins} owned={isItemOwned(selectedItem.id)} equipped={isItemEquipped(selectedItem)} onClose={() => setSelectedItem(null)} onBuy={() => confirmPurchase(selectedItem)} onEquip={() => { handleEquip(selectedItem); setSelectedItem(null); }} onCoins={() => { setSelectedItem(null); setActiveTab('coins'); }} />}
    </div>
  );
}
