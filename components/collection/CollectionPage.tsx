// src/components/collection/CollectionPage.tsx
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useEconomy } from '../../contexts/EconomyContext';
import { ALL_COSMETICS, RARITY_COLORS } from '../../data/cosmetics';

export default function CollectionPage() {
  const { state, equipCosmetic } = useEconomy();
  const { profile } = state;
  const [activeCategory, setActiveCategory] = useState<string>('cardBack');

  const categories = [
    { key: 'cardBack', label: 'Card Backs', icon: '🃏', owned: profile.collection.cardBacks, total: 25 },
    { key: 'tableTheme', label: 'Table Themes', icon: '🎰', owned: profile.collection.tableThemes, total: 12 },
    { key: 'profileFrame', label: 'Profile Frames', icon: '🖼️', owned: profile.collection.profileFrames, total: 18 },
    { key: 'emote', label: 'Emotes', icon: '😊', owned: profile.collection.emotes, total: 30 },
    { key: 'victoryAnimation', label: 'Victory Animations', icon: '✨', owned: profile.collection.victoryAnimations, total: 8 },
  ];

  const totalOwned = categories.reduce((acc, c) => acc + c.owned.length, 0);
  const totalItems = categories.reduce((acc, c) => acc + c.total, 0);
  const percentage = Math.round((totalOwned / totalItems) * 100);

  const currentCategory = categories.find(c => c.key === activeCategory);
  const ownedInCategory = currentCategory ? currentCategory.owned : [];
  const allInCategory = ALL_COSMETICS.filter(c => c.category === activeCategory);
  const unknownCount = (currentCategory?.total || 0) - allInCategory.length;

  const equipMap: Record<string, string> = {
    cardBack: profile.equipped.cardBack,
    tableTheme: profile.equipped.tableTheme,
    profileFrame: profile.equipped.profileFrame,
    victoryAnimation: profile.equipped.victoryAnimation,
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-amber-300 mb-2">Collection</h1>
        <p className="text-gray-500 mb-6">Track and equip your cosmetics</p>

        {/* Overall Progress */}
        <div className="bg-gradient-to-r from-neutral-900 to-black border border-amber-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-amber-200">Overall Progress</h2>
            <span className="text-2xl font-bold text-amber-400">{percentage}%</span>
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1 }}
            />
          </div>
          <p className="text-gray-500 text-sm mt-2">{totalOwned} / {totalItems} Cosmetics Collected</p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                activeCategory === cat.key
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white'
                  : 'bg-neutral-900/60 text-gray-400 border border-neutral-700/30 hover:border-amber-500/20'
              }`}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.label}
              <span className={`ml-2 ${activeCategory === cat.key ? 'text-amber-200' : 'text-gray-600'}`}>
                {cat.owned.length}/{cat.total}
              </span>
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {allInCategory.map((item) => {
            const isOwned = ownedInCategory.includes(item.id);
            const isEquipped = equipMap[activeCategory] === item.id;

            return (
              <motion.div
                key={item.id}
                className={`relative rounded-xl border p-3 transition-all ${
                  isOwned
                    ? isEquipped
                      ? 'border-amber-500 bg-amber-900/20 ring-1 ring-amber-500/50'
                      : 'border-neutral-700/30 bg-neutral-900/40 hover:border-amber-500/30'
                    : 'border-neutral-800/30 bg-neutral-900/20 opacity-50'
                }`}
                whileHover={isOwned ? { y: -2 } : {}}
              >
                <div className="aspect-square bg-neutral-800/50 rounded-lg flex items-center justify-center mb-2">
                  {isOwned ? (
                    <span className="text-3xl opacity-60">
                      {activeCategory === 'cardBack' ? '🃏' : activeCategory === 'tableTheme' ? '🎰' : activeCategory === 'profileFrame' ? '🖼️' : activeCategory === 'emote' ? '😊' : '✨'}
                    </span>
                  ) : (
                    <span className="text-2xl text-gray-700">???</span>
                  )}
                </div>

                <h3 className={`text-sm font-bold truncate ${isOwned ? 'text-gray-200' : 'text-gray-600'}`}>
                  {isOwned ? item.name : '???'}
                </h3>

                {isOwned && (
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{
                        color: RARITY_COLORS[item.rarity],
                        backgroundColor: `${RARITY_COLORS[item.rarity]}15`,
                      }}
                    >
                      {item.rarity}
                    </span>
                    {isEquipped && (
                      <span className="text-amber-400 text-xs font-bold">Equipped</span>
                    )}
                  </div>
                )}

                {isOwned && !isEquipped && (
                  <motion.button
                    className="w-full mt-2 py-1.5 rounded-lg bg-neutral-800 text-gray-300 text-xs font-bold hover:bg-amber-900/30 hover:text-amber-300 transition-all"
                    onClick={() => equipCosmetic(activeCategory, item.id)}
                    whileTap={{ scale: 0.95 }}
                  >
                    Equip
                  </motion.button>
                )}

                {!isOwned && (
                  <p className="text-gray-700 text-xs mt-1 text-center">
                    {item.rarity === 'Legendary' ? 'Legendary Cosmetic' : 'Locked'}
                  </p>
                )}
              </motion.div>
            );
          })}

          {/* Unknown slots */}
          {[...Array(unknownCount)].map((_, i) => (
            <div
              key={`unknown-${i}`}
              className="rounded-xl border border-neutral-800/30 bg-neutral-900/20 p-3 opacity-40"
            >
              <div className="aspect-square bg-neutral-800/30 rounded-lg flex items-center justify-center mb-2">
                <span className="text-2xl text-gray-700">???</span>
              </div>
              <h3 className="text-sm font-bold text-gray-600 truncate">???</h3>
              <p className="text-gray-700 text-xs mt-1 text-center">Unlock Requirement Unknown</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
