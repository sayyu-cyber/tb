// src/components/achievements/AchievementsPage.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useEconomy } from '../../contexts/EconomyContext';
import { useTranslation } from '../../hooks/useTranslation';

export default function AchievementsPage() {
  const { state } = useEconomy();
  const { achievements } = state;
  const t = useTranslation();

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <div className="w-full pt-4 pb-32 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <p className="text-[rgb(var(--c4))] text-sm">{t("achievements_subtitle")}</p>
          <span className="text-amber-400 font-bold text-lg shrink-0 ml-3">
            {unlockedCount}/{totalCount}
          </span>
        </div>

        <div className="w-full bg-[rgb(var(--c3))] rounded-full h-2 mb-6 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(unlockedCount / totalCount) * 100}%` }}
            transition={{ duration: 1 }}
          />
        </div>

        <div className="space-y-3">
          {achievements.map((ach, index) => (
            <motion.div
              key={ach.id}
              className={`rounded-xl p-4 border flex items-center gap-4 ${
                ach.unlocked
                  ? 'bg-gradient-to-r from-amber-900/20 to-yellow-900/20 border-amber-500/30'
                  : 'bg-[rgb(var(--c2)/40%)] border-[rgb(var(--c3)/20%)] opacity-60'
              }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="text-3xl">{ach.unlocked ? ach.icon : '🔒'}</div>
              <div className="flex-1">
                <h3 className={`font-bold ${ach.unlocked ? 'text-amber-200' : 'text-[rgb(var(--c4))]'}`}>
                  {ach.title}
                </h3>
                <p className="text-[rgb(var(--c4))] text-sm">{ach.description}</p>
                {!ach.unlocked && ach.target > 1 && (
                  <div className="w-full bg-[rgb(var(--c3))] rounded-full h-1.5 mt-2">
                    <div
                      className="h-full bg-[rgb(var(--c4))] rounded-full"
                      style={{ width: `${(ach.progress / ach.target) * 100}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-amber-400">
                  <span>🪙</span>
                  <span className="font-bold">{ach.reward}</span>
                </div>
                {ach.unlocked && (
                  <motion.span
                    className="text-green-400 text-xs font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    {t("achievements_unlocked")}
                  </motion.span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
