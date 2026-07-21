// src/components/rewards/MatchRewardPopup.tsx
'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEconomy } from '../../contexts/EconomyContext';
import CoinBalance from '../economy/CoinBalance';

interface MatchRewardPopupProps {
  isOpen: boolean;
  onClose: () => void;
  isVictory: boolean;
  coinsEarned: number;
  trophyChange: number;
  newCoinBalance: number;
}

export default function MatchRewardPopup({
  isOpen,
  onClose,
  isVictory,
  coinsEarned,
  trophyChange,
  newCoinBalance,
}: MatchRewardPopupProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-md mx-4 bg-gradient-to-b from-neutral-900 to-black border border-amber-500/30 rounded-2xl p-8 overflow-hidden"
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className={`absolute inset-0 opacity-20 ${isVictory ? 'bg-gradient-to-t from-amber-600/30 to-transparent' : 'bg-gradient-to-t from-gray-600/20 to-transparent'}`} />
            
            {isVictory && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-amber-400"
                    initial={{ x: '50%', y: '50%', scale: 0 }}
                    animate={{
                      x: `${20 + Math.random() * 60}%`,
                      y: `${10 + Math.random() * 40}%`,
                      scale: [0, 1, 0],
                      opacity: [1, 1, 0],
                    }}
                    transition={{ duration: 1.5, delay: i * 0.1, ease: 'easeOut' }}
                  />
                ))}
              </div>
            )}

            <div className="relative z-10 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className={`text-6xl mb-4 ${isVictory ? 'text-amber-400' : 'text-gray-400'}`}
              >
                {isVictory ? '🏆' : '🎮'}
              </motion.div>

              <motion.h2
                className={`text-3xl font-bold mb-2 ${isVictory ? 'text-amber-300' : 'text-gray-300'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {isVictory ? 'Victory!' : 'Defeat'}
              </motion.h2>

              <motion.div
                className="space-y-4 mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="flex items-center gap-2 bg-amber-900/40 rounded-full px-4 py-2 border border-amber-500/30">
                    <span className="text-amber-400 text-lg">🪙</span>
                    <span className="text-amber-100 font-bold">+{coinsEarned}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <span className={`text-lg ${trophyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trophyChange >= 0 ? '📈' : '📉'}
                  </span>
                  <span className={`font-bold ${trophyChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trophyChange > 0 ? '+' : ''}{trophyChange} Trophies
                  </span>
                </div>

                <div className="pt-4 border-t border-amber-500/20">
                  <p className="text-gray-400 text-sm mb-2">New Balance</p>
                  <CoinBalance showAnimation size="lg" />
                </div>
              </motion.div>

              <motion.button
                className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-bold text-lg hover:from-amber-500 hover:to-yellow-500 transition-all border border-amber-400/30"
                onClick={onClose}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Continue
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
