// src/components/rewards/WeeklyRankReward.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEconomy } from '../../contexts/EconomyContext';
import { RANK_CONFIGS } from '../../data/cosmetics';

export default function WeeklyRankReward() {
  const { state, addCoins } = useEconomy();
  const { profile, weeklyRankReward } = state;
  const [show, setShow] = useState(false);

  useEffect(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = (day + 3) % 7;
    const lastThursday = new Date(now);
    lastThursday.setDate(now.getDate() - diff);
    lastThursday.setHours(23, 59, 0, 0);

    if (weeklyRankReward.lastClaimed < lastThursday.getTime()) {
      setShow(true);
    }
  }, [weeklyRankReward.lastClaimed]);

  const rankConfig = RANK_CONFIGS.find(r => r.tier === profile.rank);
  if (!rankConfig || !show) return null;

  const handleClaim = () => {
    addCoins(rankConfig.weeklyReward, 'weekly_rank', `${profile.rank} Weekly Rank Reward`);
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-gradient-to-b from-neutral-900 to-black border-2 rounded-2xl p-8 text-center max-w-md mx-4 relative overflow-hidden"
            style={{ borderColor: rankConfig.color }}
            initial={{ scale: 0.5, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <motion.div
              className="absolute inset-0 opacity-10"
              style={{ backgroundColor: rankConfig.color }}
              animate={{ opacity: [0.05, 0.15, 0.05] }}
              transition={{ repeat: Infinity, duration: 3 }}
            />

            <motion.div
              className="text-6xl mb-4"
              animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              🏅
            </motion.div>

            <h2 className="text-3xl font-bold mb-2" style={{ color: rankConfig.color }}>
              {profile.rank} Rank Achieved!
            </h2>
            <p className="text-gray-400 mb-6">Weekly Rank Rewards</p>

            <motion.div
              className="bg-amber-900/30 rounded-xl p-4 border border-amber-500/20 mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-4xl font-bold text-amber-400 mb-1">+{rankConfig.weeklyReward}</div>
              <div className="text-amber-200/60">Coins</div>
            </motion.div>

            <motion.button
              className="w-full py-3 rounded-xl font-bold text-white"
              style={{ backgroundColor: rankConfig.color }}
              onClick={handleClaim}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Claim Reward
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
