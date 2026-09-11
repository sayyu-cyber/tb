// src/components/missions/MissionsPanel.tsx
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEconomy } from '../../contexts/EconomyContext';
import { DailyMission, WeeklyMission } from '../../types/economy';
import { useTranslation } from '../../hooks/useTranslation';
import { CoinIcon, Check } from '../ui/icons';

function MissionCard({ mission, isWeekly = false }: { mission: DailyMission | WeeklyMission; isWeekly?: boolean }) {
  const progressPercent = Math.min((mission.progress / mission.target) * 100, 100);
  const isCompleted = mission.completed;

  return (
    <motion.div
      className={`
        relative rounded-xl p-4 border transition-all duration-300
        ${isCompleted
          ? 'bg-gradient-to-r from-[rgb(var(--gold)/10%)] to-[rgb(var(--gold-deep)/15%)] border-[rgb(var(--gold)/30%)]'
          : 'bg-[rgb(var(--c2)/60%)] border-[rgb(var(--c3)/30%)] hover:border-[rgb(var(--gold)/20%)]'
        }
      `}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      layout
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`font-bold ${isCompleted ? 'text-[rgb(var(--gold-ink))]' : 'text-[rgb(var(--text-primary))]'}`}>
              {mission.title}
            </h3>
            {isCompleted && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-[rgb(var(--lagoon-ink))] text-sm"
              >
                <Check size={14} strokeWidth={3} />
              </motion.span>
            )}
          </div>
          <p className="text-[rgb(var(--c4))] text-sm mt-0.5">{mission.description}</p>
        </div>
        <div className="flex items-center gap-1.5 bg-[rgb(var(--gold)/15%)] rounded-full px-3 py-1 border border-[rgb(var(--gold)/20%)]">
          <CoinIcon size={14} />
          <span className="text-[rgb(var(--gold-ink))] font-bold text-sm">{mission.reward}</span>
        </div>
      </div>

      <div className="relative">
        <div className="w-full bg-[rgb(var(--c3))] rounded-full h-2.5 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isCompleted ? 'bg-gradient-to-r from-[rgb(var(--lagoon))] to-[rgb(var(--lagoon-deep))]' : 'bg-gradient-to-r from-[rgb(var(--gold))] to-[rgb(var(--gold-bright))]'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-[rgb(var(--c4))]">
            {mission.progress} / {mission.target}
          </span>
          <span className="text-xs text-[rgb(var(--c4))]">
            {Math.round(progressPercent)}%
          </span>
        </div>
      </div>

      {isCompleted && (
        <motion.div
          className="absolute top-2 right-2 w-2 h-2 bg-[rgb(var(--lagoon))] rounded-full"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      )}
    </motion.div>
  );
}

export default function MissionsPanel() {
  const { state } = useEconomy();
  const { missions } = state;
  const t = useTranslation();

  const dailyCompleted = missions.daily.filter(m => m.completed).length;
  const allDailyComplete = dailyCompleted === missions.daily.length;
  const weeklyCompleted = missions.weekly.filter(m => m.completed).length;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Daily Missions */}
      <motion.div
        className="bg-gradient-to-b from-[rgb(var(--c2))] to-[rgb(var(--c1))] border border-[rgb(var(--gold)/15%)] rounded-2xl p-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[rgb(var(--gold-ink))]">{t('missions_dailyTitle')}</h2>
            <p className="text-[rgb(var(--c4))] text-sm">{t('missions_dailyReset')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[rgb(var(--gold-ink))] font-bold">{dailyCompleted}/{missions.daily.length}</span>
              <span className="text-[rgb(var(--c4))] text-sm ml-1">{t('missions_completed')}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {missions.daily.map((mission) => (
              <MissionCard key={mission.id} mission={mission} />
            ))}
          </AnimatePresence>
        </div>

        {allDailyComplete && (
          <motion.div
            className="mt-4 p-3 bg-gradient-to-r from-[rgb(var(--gold-deep)/30%)] to-[rgb(var(--gold-deep)/25%)] rounded-xl border border-[rgb(var(--gold)/20%)] text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="text-[rgb(var(--gold-ink))] font-bold">
              🎉 {t('missions_allDailyComplete').replace('{n}', String(missions.dailyAllBonus))}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Weekly Missions */}
      <motion.div
        className="bg-gradient-to-b from-[rgb(var(--c2))] to-[rgb(var(--c1))] border border-[rgb(var(--gold)/15%)] rounded-2xl p-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[rgb(var(--gold-ink))]">{t('missions_weeklyTitle')}</h2>
            <p className="text-[rgb(var(--c4))] text-sm">{t('missions_weeklyReset')}</p>
          </div>
          <div className="text-right">
            <span className="text-[rgb(var(--gold-ink))] font-bold">{weeklyCompleted}/{missions.weekly.length}</span>
            <span className="text-[rgb(var(--c4))] text-sm ml-1">{t('missions_completed')}</span>
          </div>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {missions.weekly.map((mission) => (
              <MissionCard key={mission.id} mission={mission} isWeekly />
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
