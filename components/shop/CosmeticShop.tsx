// src/components/shop/CosmeticShop.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, ArrowRight, Search, Clock, Sparkles, Layers, Coins, Crown, ChevronRight, Info } from 'lucide-react';
import { useEconomy } from '@/contexts/EconomyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTranslation } from '@/hooks/useTranslation';
import { CosmeticItem } from '@/types/economy';
import { ALL_COSMETICS, COIN_PACKS, isPurchasable } from '@/data/cosmetics';
import { getWeeklyFeaturedRotation, getRotationWeekNumber } from '@/lib/cosmeticRotation';
import { requestCoinTopup, watchMyTopups, CoinTopupRequest } from '@/lib/coinTopups';
import { Pill, CoinGem, Meter } from '@/components/arena';
import { ShopItemCard } from './ShopItemCard';
import { ShopItemDialog } from './ShopItemDialog';
import { usePhoneLayout } from "@/hooks/usePhoneLayout";
import { LandShop } from './land/LandShop';
import { CoinPackCard } from './StoreCoinPacks';
import { CoinPackRow } from './CoinPackRow';
import { VipPanel } from '@/components/vip/VipPanel';
import { categoryLabel } from './categoryLabel';
import { formatCoins } from '@/lib/wallet';

/**
 * Shop — design/arena/screens/app/app-11-shop.jpg, with the purchase
 * dialog's two states from app-11b and app-11c.
 *
 * The data flow is unchanged: the same deterministic weekly rotation, the
 * same admin price/visibility overrides, the same top-up request that waits
 * on admin approval. What changed is the markup, which is now the board's.
 *
 * The VIP tab is the Shop's fourth tab but its own board (app-12). It is
 * built on the shared Arena panels here and gets its full treatment with
 * that screen.
 */

const VIP_PLANS = [
  { id: 'weekly' as const, days: 7, priceMVR: 100, label: 'Weekly', sub: '7 Days of Premium Benefits' },
  // 4 weekly passes back-to-back would be MVR 400 (4 x 100) - the monthly
  // plan is priced a little below that as the "slight discount" you asked for.
  { id: 'monthly' as const, days: 30, priceMVR: 350, label: 'Monthly', sub: '30 Days of Premium Benefits', savingsNote: 'Save MVR 50 vs. 4 weekly passes' },
];

export default function CosmeticShop() {
  const { state, purchaseCosmetic, equipCosmetic } = useEconomy();
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
  const initial = (user?.displayName ?? 'S').charAt(0).toUpperCase();
  /* A phone gets LShop and LShopVip (components/shop/land/LandShop), with
     the purchase confirm as the landscape dialog (LShopBuy / LShopShort).
     Every rule below - rotation, overrides, top-ups, VIP billing - serves
     both compositions. */
  const phone = usePhoneLayout();
  const twoUp = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' } as const;

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
  const isItemOwned = (itemId: string) => Object.values(state.profile.collection).flat().includes(itemId);
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

  function handlePurchase(item: CosmeticItem) { setIntent('buy'); setSelectedItem(item); }
  async function confirmPurchase(item: CosmeticItem) {
    if (purchasePending.current) return;
    if (isItemOwned(item.id)) { showToast("You already own this item.", "info"); return; }
    if (isHidden(item)) { showToast("This item is no longer available.", "error"); return; }
    purchasePending.current = true;
    try {
      if (await purchaseCosmetic(item.id)) { showToast(item.name + " added to your inventory.", "success"); setSelectedItem(null); }
      else showToast("Purchase could not be completed. Check your balance.", "error");
    } finally { window.setTimeout(() => { purchasePending.current = false; }, 250); }
  }
  async function handleEquip(item: CosmeticItem) {
    if (await equipCosmetic(item.category, item.id)) {
      showToast(item.name + " equipped.", "success");
      setSelectedItem(null);
    }
  }

  const pendingTopup = myTopups.find((topup) => topup.status === 'pending');

  async function handlePurchaseCoinPack(pack: typeof COIN_PACKS[0]) {
    if (!user?.uid || isGuest) { showToast(t('toast_signInToTopUp'), 'info'); return; }
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
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
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
  // members get one extra featured slot, matching the perk in the strip.
  const featuredItems = getWeeklyFeaturedRotation(state.profile.vip.active ? 7 : 6).filter((c) => !isHidden(c));
  const permanentItems = ALL_COSMETICS
    // isPurchasable keeps rewards, starter items and VIP exclusives out of
    // the catalogue - none of them has a price (code issue 5).
    .filter((c) => isPurchasable(c) && !isHidden(c))
    .filter((c) => selectedCategory === 'all' || c.category === selectedCategory)
    .filter((c) => [c.name, c.rarity, categoryLabel(c.category)].join(' ').toLowerCase().includes(queryText.trim().toLowerCase()))
    .sort((a, b) => sort === 'price' ? priceFor(a) - priceFor(b) : sort === 'name' ? a.name.localeCompare(b.name) : 0);

  const vipActive = state.profile.vip.active;

  function itemCard(item: CosmeticItem, featured?: boolean) {
    return (
      <ShopItemCard
        key={item.id}
        item={item}
        price={priceFor(item)}
        isOwned={isItemOwned(item.id)}
        isEquipped={isItemEquipped(item)}
        isFeatured={featured}
        initial={initial}
        onPurchase={() => handlePurchase(item)}
        onEquip={() => handleEquip(item)}
        onPreview={() => { setIntent('preview'); setSelectedItem(item); }}
      />
    );
  }

  const balance = (
    <div className="bal">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: phone ? '1 1 0' : undefined }}>
        <span className="lbl">Your Balance</span>
        <b><CoinGem />{formatCoins(state.economy.coins)}</b>
      </div>
      <button
        type="button"
        className="ar-btn sm"
        aria-label="Get coins"
        style={{ width: '48px', padding: 0 }}
        onClick={() => setActiveTab('coins')}
      >
        <Plus aria-hidden="true" />
      </button>
    </div>
  );

  const dialog = selectedItem && (
    <ShopItemDialog
      item={selectedItem}
      intent={intent}
      price={priceFor(selectedItem)}
      balance={state.economy.coins}
      owned={isItemOwned(selectedItem.id)}
      equipped={isItemEquipped(selectedItem)}
      onClose={() => setSelectedItem(null)}
      onBuy={() => confirmPurchase(selectedItem)}
      onEquip={() => { void handleEquip(selectedItem); }}
      onCoins={() => { setSelectedItem(null); setActiveTab('coins'); }}
      land={phone}
      initial={initial}
    />
  );

  if (phone) return (
    <>
      <LandShop
        tab={activeTab}
        onTab={setActiveTab}
        coins={state.economy.coins}
        timeLeft={timeLeft}
        featured={featuredItems}
        permanent={permanentItems}
        categories={categories}
        category={selectedCategory}
        onCategory={setSelectedCategory}
        query={queryText}
        onQuery={setQueryText}
        sort={sort}
        onSort={setSort}
        priceFor={priceFor}
        isOwned={isItemOwned}
        isEquipped={isItemEquipped}
        onBuy={handlePurchase}
        onEquip={(item) => { void handleEquip(item); }}
        onPreview={(item) => { setIntent('preview'); setSelectedItem(item); }}
        initial={initial}
        vipActive={vipActive}
        remainingDays={state.profile.vip.remainingDays}
        plans={VIP_PLANS}
        plan={selectedVipPlan}
        onPlan={setSelectedVipPlan}
        onActivate={() => showToast('VIP purchases are unavailable until verified billing is enabled.', 'error')}
        vipUnavailable
        packs={COIN_PACKS}
        pending={pendingTopup}
        packsDisabled={topupBusy || !!pendingTopup}
        onPack={(pack) => { void handlePurchaseCoinPack(pack); }}
      />
      {dialog}
    </>
  );

  return (
    <div
      className="arena-shop arena-shopvip ar-page"
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      {/* The wide screen sets the title and the balance side by side in a
          `.phead`; the board stacks them, so the balance strip becomes a
          full-width row of its own under the heading. */}
      <div className={phone ? undefined : 'phead'}>
        <div className={phone ? 'mh' : undefined}>
          <span className="lbl dash" style={{ color: '#C6FF33' }}>
            {activeTab === 'vip' ? t('page_shop') : 'Premium cosmetics and coin packs'}
          </span>
          <h1 className={phone ? 'disp chrome' : 'disp chrome ar-h1'}>{activeTab === 'vip' ? t('vip_pass') : t('page_shop')}</h1>
          {activeTab !== 'vip' && (
            <p className="sub">Customize your table, cards, and experience. Stand out in every game.</p>
          )}
        </div>
        {activeTab !== 'vip' && !phone && balance}
      </div>
      {activeTab !== 'vip' && phone && balance}

      {/* The board's tabs fill the row at 390px rather than hugging their
          labels; the shared phone layer does that, given the chance. */}
      <div className="tabs" style={phone ? undefined : { alignSelf: 'flex-start' }} role="group" aria-label={t('page_shop')}>
        {([
          { id: 'featured', label: t('shop_tabFeatured'), Icon: Sparkles },
          { id: 'permanent', label: t('shop_tabPermanent'), Icon: Layers },
          { id: 'coins', label: t('shop_tabCoins'), Icon: Coins },
          { id: 'vip', label: t('shop_tabVip'), Icon: Crown },
        ] as const).map(({ id, label, Icon }) => (
          <button key={id} type="button" aria-pressed={activeTab === id} onClick={() => setActiveTab(id)} data-flat>
            <Icon aria-hidden="true" />{label}
          </button>
        ))}
      </div>

      {/* Wide, the crown, the copy and the button share one row. The board
          turns the strip into a column, so the crown and the copy pair up
          and the button goes full width under them. */}
      <div className="vipstrip">
        <div style={phone ? { display: 'flex', alignItems: 'center', gap: '12px' } : { display: 'contents' }}>
          <span className="cr" aria-hidden="true"><Crown /></span>
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <b className="disp" style={{ fontSize: phone ? '15px' : '17px', lineHeight: phone ? 1.1 : undefined }}>
              {vipActive ? 'VIP Active' : 'VIP Exclusive: +1 Featured cosmetic available'}
            </b>
            <p className="muted" style={{ margin: '5px 0 0', fontSize: phone ? '12.5px' : undefined, lineHeight: phone ? 1.35 : undefined }}>
              {vipActive
                ? 'Your extra weekly cosmetic slot is unlocked.'
                : 'Upgrade to VIP Pass to unlock an extra featured item every week.'}
            </p>
          </div>
        </div>
        {!vipActive && (
          <button type="button" className={`ar-btn blue sm${phone ? ' full' : ''}`} onClick={() => setActiveTab('vip')}>
            View VIP Plans<ArrowRight aria-hidden="true" />
          </button>
        )}
      </div>

      {activeTab === 'featured' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="ph">
            <h2 style={{ fontSize: '24px' }}>{t('shop_weeklyFeatured')}</h2>
            <Pill tone="line" className="refresh"><Clock aria-hidden="true" />Refreshes in {timeLeft}</Pill>
          </div>
          {featuredItems.length === 0
            ? <p className="muted">No featured items right now. Check back after the next rotation.</p>
            : <div className={phone ? undefined : 'shop-grid'} style={phone ? twoUp : undefined}>
                {featuredItems.map(item => itemCard(item, true))}
              </div>}
        </section>
      )}

      {activeTab === 'permanent' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="inv-toolbar">
            <div className="chips" role="group" aria-label="Cosmetic categories">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={selectedCategory === category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  data-flat
                >
                  {category.label}
                </button>
              ))}
            </div>
            <label className="field inv-search">
              <Search aria-hidden="true" />
              <input
                type="search"
                value={queryText}
                onChange={event => setQueryText(event.target.value)}
                placeholder="Search cosmetics"
                aria-label="Search cosmetics"
              />
            </label>
            <div className="select">
              <select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sort cosmetics">
                <option value="default">Collection order</option>
                <option value="price">Price: low to high</option>
                <option value="name">Name: A to Z</option>
              </select>
              <ChevronRight aria-hidden="true" style={{ transform: 'rotate(90deg)' }} />
            </div>
          </div>
          {permanentItems.length === 0
            ? <p className="muted">{t('inventory_nothingHere')}</p>
            : <div className={phone ? undefined : 'shop-grid'} style={phone ? twoUp : undefined}>
                {permanentItems.map(item => itemCard(item))}
              </div>}
        </section>
      )}

      {activeTab === 'vip' && (
        <div>
        <p role="status">VIP purchases are currently unavailable.</p>
        <fieldset disabled style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <VipPanel
          phone={phone}
          plans={VIP_PLANS}
          selected={selectedVipPlan}
          onSelect={setSelectedVipPlan}
          active={vipActive}
          remainingDays={state.profile.vip.remainingDays}
          onActivate={() => showToast('VIP purchases are unavailable until verified billing is enabled.', 'error')}
        />
        </fieldset>
        </div>
      )}

      {/* The Featured tab shows four packs as cards; the Coin Packs and VIP
          tabs show the whole catalogue as rows, because five cards do not
          fit the board's width. Both are the board's own treatments. */}
      {(activeTab === 'featured' || activeTab === 'coins' || activeTab === 'vip') && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: activeTab === 'featured' ? '14px' : '12px' }}>
          <div className="ph">
            <div>
              <h2 style={{ fontSize: '24px' }}>Coin Packs</h2>
              <p className="muted2" style={{ margin: '6px 0 0' }}>Get coins to buy exclusive cosmetics</p>
            </div>
            {activeTab === 'featured' ? (
              <button type="button" className="link" onClick={() => setActiveTab('coins')} data-flat>
                View All<ChevronRight aria-hidden="true" />
              </button>
            ) : (
              <span className="coins" style={{ height: '40px' }}>
                <CoinGem />{formatCoins(state.economy.coins)}
              </span>
            )}
          </div>

          {/* A request already waiting on an admin. The board puts this
              above the list, with a spinner, because it is the reason every
              button below is disabled. */}
          {pendingTopup && (
            <div className="pending" role="status">
              <i className="spin" aria-hidden="true" />
              <span style={{ flexGrow: 1, fontSize: '15px', fontWeight: 600 }}>
                Your {pendingTopup.packName} request is pending admin approval.
              </span>
              <span className="lbl" style={{ color: '#8AF0F5' }}>Coins arrive once approved</span>
            </div>
          )}

          {activeTab === 'featured' ? (
            <div className={phone ? undefined : 'pack-grid'} style={phone ? { ...twoUp, rowGap: '18px' } : undefined}>
              {COIN_PACKS.slice(0, 4).map((pack, index) => (
                <CoinPackCard
                  key={pack.id}
                  pack={pack}
                  index={index}
                  disabled={topupBusy || !!pendingTopup}
                  onPurchase={() => handlePurchaseCoinPack(pack)}
                />
              ))}
            </div>
          ) : (
            COIN_PACKS.map((pack, index) => (
              <CoinPackRow
                key={pack.id}
                pack={pack}
                index={index}
                disabled={topupBusy || !!pendingTopup}
                onPurchase={() => handlePurchaseCoinPack(pack)}
              />
            ))
          )}

          <p className="muted2" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info aria-hidden="true" style={{ width: '16px', height: '16px' }} />
            Prices in MVR. Top-ups require admin approval before coins are credited.
          </p>
        </section>
      )}

      {dialog}
    </div>
  );
}
