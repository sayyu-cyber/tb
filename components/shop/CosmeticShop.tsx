// src/components/shop/CosmeticShop.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEconomy } from '../../contexts/EconomyContext';
import { CosmeticItem, Rarity } from '../../types/economy';
import { ALL_COSMETICS, RARITY_COLORS, RARITY_GLOW, COIN_PACKS } from '../../data/cosmetics';
import CoinBalance from '../economy/CoinBalance';

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

function CosmeticCard({ item, isOwned, isFeatured = false, onPurchase, onEquip, isEquipped = false }: {
  item: CosmeticItem;
  isOwned: boolean;
  isFeatured?: boolean;
  onPurchase: () => void;
  onEquip: () => void;
  isEquipped?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className={`
        relative rounded-xl overflow-hidden border transition-all duration-300
        ${isFeatured ? 'border-amber-500/40' : 'border-neutral-700/30'}
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
        <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
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
          <p className="text-gray-300 text-sm text-center px-4">{item.description}</p>
        </motion.div>
      </div>

      <div className="p-3 bg-neutral-900/80">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-gray-200 truncate">{item.name}</h3>
          <RarityBadge rarity={item.rarity} />
        </div>

        <div className="flex items-center justify-between">
          {isOwned ? (
            <motion.button
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                isEquipped
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/30'
                  : 'bg-neutral-700 text-gray-300 hover:bg-neutral-600'
              }`}
              onClick={onEquip}
              whileTap={{ scale: 0.95 }}
            >
              {isEquipped ? 'Equipped' : 'Equip'}
            </motion.button>
          ) : (
            <motion.button
              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-bold text-sm hover:from-amber-500 hover:to-yellow-500 transition-all flex items-center justify-center gap-1.5"
              onClick={onPurchase}
              whileTap={{ scale: 0.95 }}
            >
              <span>🪙</span>
              <span>{item.price.toLocaleString()}</span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CoinPackCard({ pack, onPurchase }: { pack: typeof COIN_PACKS[0]; onPurchase: () => void }) {
  return (
    <motion.div
      className={`
        relative rounded-xl overflow-hidden border p-4
        ${pack.isBestValue ? 'border-amber-500/50 bg-gradient-to-b from-amber-900/20 to-black' : 'border-neutral-700/30 bg-neutral-900/60'}
      `}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {pack.isPopular && (
        <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
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
        <p className="text-gray-500 text-sm">Coins</p>
      </div>

      <div className="flex items-center justify-center gap-1 mb-4">
        <span className="text-gray-400 text-sm">MVR</span>
        <span className="text-xl font-bold text-white">{pack.priceMVR}</span>
      </div>

      <motion.button
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-bold hover:from-amber-500 hover:to-yellow-500 transition-all border border-amber-400/20"
        onClick={onPurchase}
        whileTap={{ scale: 0.95 }}
      >
        Purchase
      </motion.button>

      <p className="text-center text-gray-600 text-xs mt-2">Payment gateway coming soon</p>
    </motion.div>
  );
}

export default function CosmeticShop() {
  const { state, purchaseCosmetic, equipCosmetic, activateVip } = useEconomy();
  const [activeTab, setActiveTab] = useState<'featured' | 'permanent' | 'coins' | 'vip'>('featured');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeLeft, setTimeLeft] = useState('');

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
    { id: 'all', label: 'All', icon: '🛍️' },
    { id: 'cardBack', label: 'Card Backs', icon: '🃏' },
    { id: 'tableTheme', label: 'Tables', icon: '🎰' },
    { id: 'profileFrame', label: 'Frames', icon: '🖼️' },
    { id: 'emote', label: 'Emotes', icon: '😊' },
    { id: 'victoryAnimation', label: 'Victory', icon: '✨' },
  ];

  const featuredItems = ALL_COSMETICS.filter(c => c.isFeatured || (c.rarity === 'Legendary' && !c.isVipExclusive)).slice(0, 6);
  const permanentItems = selectedCategory === 'all'
    ? ALL_COSMETICS.filter(c => !c.isVipExclusive)
    : ALL_COSMETICS.filter(c => c.category === selectedCategory && !c.isVipExclusive);

  const isItemEquipped = (item: CosmeticItem) => {
    const map: Record<string, string> = {
      cardBack: state.profile.equipped.cardBack,
      tableTheme: state.profile.equipped.tableTheme,
      profileFrame: state.profile.equipped.profileFrame,
      victoryAnimation: state.profile.equipped.victoryAnimation,
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
          <h1 className="text-3xl font-bold text-amber-300">Shop</h1>
          <p className="text-gray-500 text-sm">Premium cosmetics and coin packs</p>
        </div>
        <CoinBalance size="lg" />
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'featured', label: 'Featured', icon: '⭐' },
          { id: 'permanent', label: 'Permanent', icon: '🛒' },
          { id: 'coins', label: 'Coin Packs', icon: '🪙' },
          { id: 'vip', label: 'VIP Pass', icon: '👑' },
        ].map((tab) => (
          <motion.button
            key={tab.id}
            className={`
              px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all
              ${activeTab === tab.id
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-500/20'
                : 'bg-neutral-900/60 text-gray-400 border border-neutral-700/30 hover:border-amber-500/20'
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
              <h2 className="text-xl font-bold text-amber-200">Weekly Featured</h2>
              <div className="flex items-center gap-2 bg-neutral-900/60 rounded-full px-4 py-1.5 border border-amber-500/20">
                <span className="text-amber-400 text-sm">⏰</span>
                <span className="text-amber-200 text-sm font-mono">{timeLeft}</span>
              </div>
            </div>

            {state.profile.vip.active && (
              <div className="mb-4 p-3 bg-gradient-to-r from-purple-900/30 to-violet-900/30 rounded-xl border border-purple-500/20">
                <p className="text-purple-300 text-sm font-medium">👑 VIP Exclusive: +1 Featured cosmetic available</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {featuredItems.map((item) => (
                <CosmeticCard
                  key={item.id}
                  item={item}
                  isOwned={isItemOwned(item.id)}
                  isFeatured
                  onPurchase={() => purchaseCosmetic(item.id)}
                  onEquip={() => equipCosmetic(item.category, item.id)}
                  isEquipped={isItemEquipped(item)}
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
                      : 'bg-neutral-800 text-gray-500 border border-neutral-700/30 hover:text-gray-300'
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {COIN_PACKS.map((pack) => (
                <CoinPackCard
                  key={pack.id}
                  pack={pack}
                  onPurchase={() => {
                    alert(`Purchase ${pack.name} - Payment gateway integration coming soon`);
                  }}
                />
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
                  <h2 className="text-3xl font-bold text-purple-300 mb-2">VIP Pass</h2>
                  <p className="text-purple-200/60 mb-6">7 Days of Premium Benefits</p>

                  <div className="text-4xl font-bold text-white mb-6">
                    MVR <span className="text-purple-400">100</span>
                  </div>

                  <ul className="text-left space-y-3 mb-8">
                    {[
                      '4 Ranked Matches per Day',
                      'VIP Badge on Profile',
                      'Exclusive Profile Frame',
                      'VIP Shop Section Access',
                      '1x 24-Hour Room Card',
                      'VIP Exclusive Cosmetics',
                    ].map((benefit, i) => (
                      <motion.li
                        key={i}
                        className="flex items-center gap-3 text-gray-300"
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
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold text-lg hover:from-purple-500 hover:to-violet-500 transition-all border border-purple-400/30"
                    onClick={() => {
                      activateVip(7);
                      alert('VIP activated! (Payment gateway placeholder)');
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Activate VIP
                  </motion.button>

                  {state.profile.vip.active && (
                    <motion.div
                      className="mt-4 p-3 bg-green-900/30 rounded-xl border border-green-500/20"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <p className="text-green-300 text-sm">
                        ✅ VIP Active — {state.profile.vip.remainingDays} days remaining
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
