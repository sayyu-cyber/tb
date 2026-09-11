// src/components/vip/VipStatusBar.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useEconomy } from '../../contexts/EconomyContext';
import { Crown } from '../ui/icons';

export default function VipStatusBar() {
  const { state } = useEconomy();
  const { profile } = state;

  if (!profile.vip.active) return null;

  return (
    <motion.div
      className="bg-gradient-to-r from-[rgb(var(--orchid)/20%)] to-[rgb(var(--orchid)/20%)] border border-[rgb(var(--orchid)/20%)] rounded-xl px-4 py-2 flex items-center justify-between"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2">
        <Crown size={14} />
        <span className="text-[rgb(var(--orchid-ink))] font-bold text-sm">VIP Active</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[rgb(var(--orchid-ink)/70%)] text-sm">{profile.vip.remainingDays} days left</span>
        <div className="w-24 bg-[rgb(var(--c3))] rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[rgb(var(--orchid))] to-[rgb(var(--orchid)/70%)] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(profile.vip.remainingDays / 7) * 100}%` }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
