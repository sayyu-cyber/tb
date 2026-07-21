// src/components/vip/VipStatusBar.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useEconomy } from '../../contexts/EconomyContext';

export default function VipStatusBar() {
  const { state } = useEconomy();
  const { profile } = state;

  if (!profile.vip.active) return null;

  return (
    <motion.div
      className="bg-gradient-to-r from-purple-900/40 to-violet-900/40 border border-purple-500/20 rounded-xl px-4 py-2 flex items-center justify-between"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">👑</span>
        <span className="text-purple-300 font-bold text-sm">VIP Active</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-purple-200/60 text-sm">{profile.vip.remainingDays} days left</span>
        <div className="w-24 bg-neutral-800 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-violet-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(profile.vip.remainingDays / 7) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
