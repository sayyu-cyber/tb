// src/components/roomcards/RoomCardManager.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useEconomy } from '../../contexts/EconomyContext';

export default function RoomCardManager() {
  const { state, activateRoomCard } = useEconomy();
  const { profile } = state;

  const availableCards = profile.roomCards.filter(c => !c.activated);
  const activeCards = profile.roomCards.filter(c => c.activated && c.remainingTime && c.remainingTime > 0);

  return (
    <div className="w-full max-w-lg mx-auto p-4">
      <h2 className="text-2xl font-bold text-amber-300 mb-4">Room Cards</h2>

      {activeCards.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-green-400 mb-2">Active</h3>
          <div className="space-y-2">
            {activeCards.map(card => (
              <motion.div
                key={card.id}
                className="bg-green-900/20 border border-green-500/20 rounded-xl p-4 flex items-center justify-between"
                animate={{ opacity: [1, 0.8, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <div>
                  <span className="text-green-300 font-bold">{card.type === '1h' ? '1-Hour' : '24-Hour'} Room Card</span>
                  <p className="text-green-400/60 text-sm">Unlimited private rooms</p>
                </div>
                <div className="text-green-400 font-mono text-sm">
                  {card.remainingTime && Math.ceil(card.remainingTime / 60000)}m left
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {availableCards.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-400 mb-2">Available</h3>
          <div className="space-y-2">
            {availableCards.map(card => (
              <div
                key={card.id}
                className="bg-neutral-900/60 border border-neutral-700/30 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <span className="text-gray-200 font-bold">{card.type === '1h' ? '1-Hour' : '24-Hour'} Room Card</span>
                  <p className="text-gray-500 text-sm">Activate to create unlimited private rooms</p>
                </div>
                <motion.button
                  className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-bold hover:bg-amber-500 transition-all"
                  onClick={() => activateRoomCard(card.id)}
                  whileTap={{ scale: 0.95 }}
                >
                  Activate
                </motion.button>
              </div>
            ))}
          </div>
        </div>
      )}

      {availableCards.length === 0 && activeCards.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-4xl mb-2">🎫</p>
          <p>No room cards available</p>
          <p className="text-sm">Get them from daily login or the shop</p>
        </div>
      )}
    </div>
  );
}
