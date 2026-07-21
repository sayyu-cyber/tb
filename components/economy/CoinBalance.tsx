// src/components/economy/CoinBalance.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useEconomy } from '../../contexts/EconomyContext';

interface CoinBalanceProps {
  showAnimation?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function CoinBalance({ showAnimation = false, size = 'md', className = '' }: CoinBalanceProps) {
  const { state } = useEconomy();
  const { coins } = state.profile;

  const sizeClasses = {
    sm: 'text-sm px-2 py-1 gap-1',
    md: 'text-base px-3 py-1.5 gap-2',
    lg: 'text-xl px-4 py-2 gap-2',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <motion.div
      className={`inline-flex items-center rounded-full bg-gradient-to-r from-amber-900/80 to-yellow-900/80 border border-amber-500/40 backdrop-blur-sm ${sizeClasses[size]} ${className}`}
      initial={showAnimation ? { scale: 0.8, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <motion.svg
        className={`${iconSizes[size]} text-amber-400`}
        viewBox="0 0 24 24"
        fill="currentColor"
        animate={showAnimation ? { rotate: [0, 360] } : {}}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor">T</text>
      </motion.svg>
      <motion.span
        className="font-bold text-amber-100 tabular-nums"
        key={coins}
        initial={showAnimation ? { y: -10, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        {coins.toLocaleString()}
      </motion.span>
    </motion.div>
  );
}
