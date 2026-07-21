// src/components/profile/ProfilePage.tsx
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useEconomy } from '../../contexts/EconomyContext';
import { ALL_COSMETICS } from '../../data/cosmetics';
import CoinBalance from '../economy/CoinBalance';

export default function ProfilePage() {
  const { state, equipCosmetic } = useEconomy();
  const { profile } = state;
  const [activeEquipTab, setActiveEquipTab] = useState('cardBack');

  const equipTabs = [
    { id: 'cardBack', label: 'Card Back', icon: '🃏' },
    { id: 'tableTheme', label: 'Table', icon: '🎰' },
    { id: 'profileFrame', label: 'Frame', icon: '🖼️' },
    { id: 'victoryAnimation', label: 'Victory', icon: '✨' },
  ];

  const ownedItems = ALL_COSMETICS.filter(c =>
    Object.values(profile.collection).flat().includes(c.id) && c.category === activeEquipTab
  );

  const equippedMap: Record<string, string> = {
    cardBack: profile.equipped.cardBack,
    tableTheme: profile.equipped.tableTheme,
    profileFrame: profile.equipped.profileFrame,
    victoryAnimation: profile.equipped.victoryAnimation,
  };

  const activeRoomCards = profile.roomCards.filter(c => c.activated && c.remainingTime && c.remainingTime > 0);
  const availableRoomCards = profile.roomCards.filter(c => !c.activated);

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Profile Header */}
        <div className="bg-gradient-to-b from-neutral-900 to-black border border-amber-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-600 to-yellow-600 flex items-center justify-center text-4xl border-2 border-amber-400/30">
                {profile.avatar}
              </div>
              {profile.vip.active && (
                <motion.div
                  className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs font-bold px-2 py-1 rounded-full border border-purple-400/30"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  VIP
                </motion.div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-amber-200">{profile.displayName}</h1>
              <p className="text-amber-400/60 font-medium">{profile.title}</p>
              <div className="flex items-center gap-3 mt-2">
                <CoinBalance size="md" />
                <span className="text-gray-400 text-sm">🏆 {profile.trophies} Trophies</span>
                <span className="text-gray-400 text-sm" style={{ color: profile.rankColor }}>
                  ● {profile.rank}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-neutral-900/60 rounded-xl p-3 text-center border border-neutral-700/20">
              <div className="text-2xl font-bold text-amber-300">{profile.stats.matchesPlayed}</div>
              <div className="text-gray-500 text-xs">Matches Played</div>
            </div>
            <div className="bg-neutral-900/60 rounded-xl p-3 text-center border border-neutral-700/20">
              <div className="text-2xl font-bold text-green-400">{profile.stats.matchesWon}</div>
              <div className="text-gray-500 text-xs">Wins</div>
            </div>
            <div className="bg-neutral-900/60 rounded-xl p-3 text-center border border-neutral-700/20">
              <div className="text-2xl font-bold text-amber-400">{profile.stats.winRate}%</div>
              <div className="text-gray-500 text-xs">Win Rate</div>
            </div>
          </div>
        </div>

        {/* VIP Status */}
        {profile.vip.active && (
          <motion.div
            className="bg-gradient-to-r from-purple-900/30 to-violet-900/30 border border-purple-500/30 rounded-xl p-4 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👑</span>
                <div>
                  <h3 className="text-purple-300 font-bold">VIP Active</h3>
                  <p className="text-purple-200/60 text-sm">{profile.vip.remainingDays} days remaining</p>
                </div>
              </div>
              <div className="text-purple-400 text-sm font-bold">
                Expires: {new Date(profile.vip.expiresAt).toLocaleDateString()}
              </div>
            </div>
          </motion.div>
        )}

        {/* Room Cards */}
        {(activeRoomCards.length > 0 || availableRoomCards.length > 0) && (
          <div className="bg-neutral-900/60 border border-neutral-700/30 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-bold text-gray-300 mb-3">Room Cards</h3>
            <div className="flex gap-2 flex-wrap">
              {activeRoomCards.map(card => (
                <div
                  key={card.id}
                  className="px-3 py-1.5 rounded-lg text-sm bg-green-900/30 text-green-300 border border-green-500/20"
                >
                  {card.type === '1h' ? '1-Hour' : '24-Hour'} Active
                  {card.remainingTime && (
                    <span className="ml-2 text-xs opacity-80">
                      {Math.ceil(card.remainingTime / 60000)}m left
                    </span>
                  )}
                </div>
              ))}
              {availableRoomCards.map(card => (
                <div
                  key={card.id}
                  className="px-3 py-1.5 rounded-lg text-sm bg-neutral-800 text-gray-400"
                >
                  {card.type === '1h' ? '1-Hour' : '24-Hour'} Available
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Equip Section */}
        <div className="bg-neutral-900/60 border border-neutral-700/30 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-amber-200 mb-4">Equip Cosmetics</h2>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {equipTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveEquipTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                  activeEquipTab === tab.id
                    ? 'bg-amber-600/30 text-amber-300 border border-amber-500/30'
                    : 'bg-neutral-800 text-gray-500 hover:text-gray-300'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {ownedItems.map(item => {
              const isEquipped = equippedMap[activeEquipTab] === item.id;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => equipCosmetic(activeEquipTab, item.id)}
                  className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                    isEquipped
                      ? 'border-amber-500 bg-amber-900/20'
                      : 'border-neutral-700 hover:border-amber-500/30'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-2xl opacity-50">
                    {activeEquipTab === 'cardBack' ? '🃏' : activeEquipTab === 'tableTheme' ? '🎰' : activeEquipTab === 'profileFrame' ? '🖼️' : '✨'}
                  </span>
                  <span className="text-xs text-gray-300 truncate w-full text-center px-1">{item.name}</span>
                  {isEquipped && (
                    <span className="text-amber-400 text-xs font-bold">Equipped</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
