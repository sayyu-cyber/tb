// src/components/roomcards/RoomCardManager.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useEconomy } from '../../contexts/EconomyContext';
import { ROOM_CARD_LABELS, RoomCardType } from '../../types/economy';
import { ROOM_CARD_PRICES } from '../../data/cosmetics';

// Human-readable countdown for a card's remaining time - short durations
// show minutes, longer ones (1 week / 1 month cards) show days so the
// number doesn't look alarmingly huge in raw minutes.
function formatRemaining(ms: number): string {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days}d left`;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 1) return `${hours}h left`;
  return `${Math.max(1, Math.ceil(ms / 60000))}m left`;
}

const ROOM_CARD_TYPES: RoomCardType[] = ['1h', '3h', '6h', '24h', '1w', '1m'];

export default function RoomCardManager() {
  const { state, activateRoomCard, purchaseRoomCard } = useEconomy();
  const { profile } = state;

  const availableCards = profile.roomCards.filter(c => !c.activated);
  const activeCards = profile.roomCards.filter(c => c.activated && c.remainingTime && c.remainingTime > 0);

  return (
    <div className="w-full max-w-lg mx-auto p-4">
      <h2 className="text-2xl font-bold text-amber-300 mb-1">Room Cards</h2>
      <p className="text-gray-500 text-sm mb-4">Creating a private room requires an active Room Card - once activated, you can create as many rooms as you like until it expires.</p>

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
                  <span className="text-green-300 font-bold">{ROOM_CARD_LABELS[card.type]} Room Card</span>
                  <p className="text-green-400/60 text-sm">Unlimited private rooms</p>
                </div>
                <div className="text-green-400 font-mono text-sm">
                  {card.remainingTime ? formatRemaining(card.remainingTime) : ''}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {availableCards.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-400 mb-2">Available</h3>
          <div className="space-y-2">
            {availableCards.map(card => (
              <div
                key={card.id}
                className="bg-neutral-900/60 border border-neutral-700/30 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <span className="text-gray-200 font-bold">{ROOM_CARD_LABELS[card.type]} Room Card</span>
                  <p className="text-gray-500 text-sm">Activate to create unlimited private rooms</p>
                </div>
                <motion.button
                  className="px-4 py-2 rounded-lg bg-amber-600 text-[rgb(var(--text-primary))] text-sm font-bold hover:bg-amber-500 transition-all"
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
          <p className="text-sm">Get them from daily login, missions, or buy one below</p>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-gray-400 mb-2">Buy with Coins</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ROOM_CARD_TYPES.map((type) => (
            <div key={type} className="bg-neutral-900/60 border border-neutral-700/30 rounded-xl p-3 flex flex-col items-center gap-2">
              <span className="text-gray-200 text-sm font-bold">{ROOM_CARD_LABELS[type]}</span>
              <motion.button
                className="w-full px-3 py-2 rounded-lg bg-neutral-800 text-amber-300 text-xs font-bold hover:bg-neutral-700 transition-all flex items-center justify-center gap-1"
                onClick={() => purchaseRoomCard(type)}
                whileTap={{ scale: 0.95 }}
              >
                <span>🪙</span>
                <span>{ROOM_CARD_PRICES[type].toLocaleString()}</span>
              </motion.button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
