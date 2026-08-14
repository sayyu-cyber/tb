// src/components/roomcards/RoomCardManager.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useEconomy } from '../../contexts/EconomyContext';
import { ROOM_CARD_LABELS, RoomCardType } from '../../types/economy';
import { ROOM_CARD_PRICES } from '../../data/cosmetics';
import { useTranslation } from '../../hooks/useTranslation';
import { CoinIcon, Ticket } from '../ui/icons';

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
  const t = useTranslation();

  const availableCards = profile.roomCards.filter(c => !c.activated);
  const activeCards = profile.roomCards.filter(c => c.activated && c.remainingTime && c.remainingTime > 0);

  return (
    <div className="w-full p-4">
      <p className="text-[rgb(var(--c4))] text-sm mb-4">{t("roomcards_desc")}</p>

      {activeCards.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-green-400 mb-2">{t("roomcards_active")}</h3>
          <div className="space-y-2">
            {activeCards.map(card => (
              <motion.div
                key={card.id}
                className="bg-green-900/20 border border-green-500/20 rounded-xl p-4 flex items-center justify-between"
                animate={{ opacity: [1, 0.8, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <div>
                  <span className="text-green-300 font-bold">{t("roomcards_roomCard").replace("{type}", ROOM_CARD_LABELS[card.type])}</span>
                  <p className="text-green-400/60 text-sm">{t("roomcards_unlimited")}</p>
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
          <h3 className="text-sm font-bold text-[rgb(var(--c5))] mb-2">{t("roomcards_available")}</h3>
          <div className="space-y-2">
            {availableCards.map(card => (
              <div
                key={card.id}
                className="bg-[rgb(var(--c2)/60%)] border border-[rgb(var(--c3)/30%)] rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <span className="text-[rgb(var(--text-primary))] font-bold">{t("roomcards_roomCard").replace("{type}", ROOM_CARD_LABELS[card.type])}</span>
                  <p className="text-[rgb(var(--c4))] text-sm">{t("roomcards_activateToCreate")}</p>
                </div>
                <motion.button
                  className="px-4 py-2 rounded-lg bg-amber-600 text-[rgb(var(--text-primary))] text-sm font-bold hover:bg-amber-500 transition-all"
                  onClick={() => activateRoomCard(card.id)}
                  whileTap={{ scale: 0.95 }}
                >
                  {t("roomcards_activate")}
                </motion.button>
              </div>
            ))}
          </div>
        </div>
      )}

      {availableCards.length === 0 && activeCards.length === 0 && (
        <div className="text-center py-8 text-[rgb(var(--c4))]">
          <Ticket size={34} className="mx-auto mb-3 text-[rgb(var(--c4))]" />
          <p>{t("roomcards_noneAvailable")}</p>
          <p className="text-sm">{t("roomcards_getFrom")}</p>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-[rgb(var(--c5))] mb-2">{t("roomcards_buyWithCoins")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ROOM_CARD_TYPES.map((type) => (
            <div key={type} className="bg-[rgb(var(--c2)/60%)] border border-[rgb(var(--c3)/30%)] rounded-xl p-3 flex flex-col items-center gap-2">
              <span className="text-[rgb(var(--text-primary))] text-sm font-bold">{ROOM_CARD_LABELS[type]}</span>
              <motion.button
                className="w-full px-3 py-2 rounded-lg bg-[rgb(var(--c3))] text-amber-300 text-xs font-bold hover:bg-[rgb(var(--c3))] transition-all flex items-center justify-center gap-1"
                onClick={() => purchaseRoomCard(type)}
                whileTap={{ scale: 0.95 }}
              >
                <CoinIcon size={13} />
                <span>{ROOM_CARD_PRICES[type].toLocaleString()}</span>
              </motion.button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
