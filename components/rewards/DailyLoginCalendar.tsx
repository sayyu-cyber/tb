// src/components/rewards/DailyLoginCalendar.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEconomy } from '../../contexts/EconomyContext';
import { DAILY_LOGIN_REWARDS } from '../../data/cosmetics';

export default function DailyLoginCalendar() {
  const { state, claimDailyReward } = useEconomy();
  const { dailyLogin } = state;
  const [showPopup, setShowPopup] = useState(false);
  const [claimedDay, setClaimedDay] = useState<number | null>(null);

  const handleClaim = (day: number) => {
    const reward = dailyLogin.rewards[day - 1];
    if (reward.claimed) return;
    const nextAvailableDay = dailyLogin.rewards.findIndex(r => !r.claimed) + 1;
    if (day !== nextAvailableDay) return;

    setClaimedDay(day);
    claimDailyReward(day);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 3000);
  };

  const nextAvailableDay = dailyLogin.rewards.findIndex(r => !r.claimed) + 1;

  return (
    <div className="w-full max-w-lg mx-auto">
      <motion.div
        className="bg-gradient-to-b from-neutral-900 to-black border border-amber-500/20 rounded-2xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-amber-300">Daily Login Rewards</h2>
          <p className="text-gray-400 text-sm mt-1">Come back every day for premium rewards</p>
          <div className="mt-2 inline-flex items-center gap-2 bg-amber-900/30 rounded-full px-3 py-1">
            <span className="text-amber-400 text-sm">🔥</span>
            <span className="text-amber-200 text-sm font-medium">Streak: {dailyLogin.streak} days</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {DAILY_LOGIN_REWARDS.map((reward, index) => {
            const day = index + 1;
            const isClaimed = dailyLogin.rewards[index]?.claimed ?? false;
            const isNext = day === nextAvailableDay;
            const isPast = day < nextAvailableDay;

            return (
              <motion.button
                key={day}
                className={`
                  relative aspect-square rounded-xl flex flex-col items-center justify-center gap-1
                  border transition-all duration-300
                  ${isClaimed
                    ? 'bg-amber-900/20 border-amber-500/10 opacity-60'
                    : isNext
                    ? 'bg-gradient-to-b from-amber-800/40 to-amber-900/40 border-amber-400/60 shadow-lg shadow-amber-500/20 cursor-pointer hover:shadow-amber-500/40'
                    : 'bg-neutral-800/50 border-neutral-700/30 opacity-50'
                  }
                `}
                onClick={() => handleClaim(day)}
                whileHover={isNext ? { scale: 1.05 } : {}}
                whileTap={isNext ? { scale: 0.95 } : {}}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <span className={`text-xs font-bold ${isClaimed ? 'text-amber-600' : isNext ? 'text-amber-300' : 'text-gray-500'}`}>
                  Day {day}
                </span>
                <span className="text-lg">{isClaimed ? '✅' : day === 7 ? '🎁' : '🪙'}</span>
                <span className={`text-xs font-semibold ${isClaimed ? 'text-amber-700' : isNext ? 'text-amber-200' : 'text-gray-600'}`}>
                  {reward.coins}
                </span>
                {day === 7 && !isClaimed && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
                {isNext && !isClaimed && (
                  <motion.div
                    className="absolute inset-0 rounded-xl border-2 border-amber-400/50"
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="mt-4 text-center">
          <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(dailyLogin.rewards.filter(r => r.claimed).length / 7) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="text-gray-500 text-xs mt-2">
            {dailyLogin.rewards.filter(r => r.claimed).length} / 7 claimed this cycle
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {showPopup && claimedDay && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gradient-to-b from-neutral-900 to-black border border-amber-500/30 rounded-2xl p-8 text-center max-w-sm mx-4"
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.5, rotate: 10 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <motion.div
                className="text-5xl mb-4"
                animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6 }}
              >
                🎉
              </motion.div>
              <h3 className="text-2xl font-bold text-amber-300 mb-2">Day {claimedDay} Claimed!</h3>
              <p className="text-amber-100 text-lg font-semibold">
                +{DAILY_LOGIN_REWARDS[claimedDay - 1].coins} Coins
              </p>
              {DAILY_LOGIN_REWARDS[claimedDay - 1].bonusItem && (
                <p className="text-amber-400 text-sm mt-1">
                  + 1-Hour Room Card Bonus!
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
