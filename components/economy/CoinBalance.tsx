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

/**
 * The player's coin balance.
 *
 * Arena (design/arena/APP_SCREENS.md, "Palette"): coins are a lime gem - a
 * rounded square turned 45 degrees with a soft glow - not the gold circular
 * "T" coin this used to draw. The gem is `.gem` in styles/arena-app.css, so
 * it is the same object here, in the top bar and on the shop's price tags
 * rather than three separate drawings of a coin.
 *
 * The tray around it is the board's `.coins`. The figure is tabular so a
 * balance ticking up doesn't make the row jitter.
 */
export default function CoinBalance({ showAnimation = false, size = 'md', className = '' }: CoinBalanceProps) {
  const { state } = useEconomy();
  // economy.coins, not profile.coins: this display used to read the other
  // balance from the one the shop's affordability checks used, so after a
  // weekly rank reward it showed coins the shop then refused to spend.
  const { coins } = state.economy;

  // The board's tray is 44px tall with a 16px figure; sm/lg step down and up
  // from that rather than introducing a second set of proportions.
  const trayStyle: Record<NonNullable<CoinBalanceProps['size']>, React.CSSProperties> = {
    sm: { height: 34, padding: '0 10px', gap: 7, fontSize: 13 },
    md: { height: 44, padding: '0 12px', gap: 9, fontSize: 16 },
    lg: { height: 52, padding: '0 16px', gap: 10, fontSize: 20 },
  };

  return (
    <motion.div
      className={`coins ${className}`.trim()}
      style={trayStyle[size]}
      initial={showAnimation ? { scale: 0.8, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <i className={`gem ${size === 'sm' ? 'sm' : ''}`.trim()} aria-hidden="true" />
      <motion.span
        className="tnum"
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
