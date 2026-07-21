// src/components/missions/MissionsPanel.tsx
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEconomy } from '../../contexts/EconomyContext';
import { DailyMission, WeeklyMission } from '../../types/economy';

function MissionCard({ mission, isWeekly = false }: { mission: DailyMission | WeeklyMission; isWeekly?: boolean }) {
  const progressPercent = Math.min((mission.progress / mission.target) * 100, 100);
  const isCompleted = mission.completed;

  return (
    <motion.div
      className={`
        relative rounded-xl p-4 border transition-all duration-300
        ${isCompleted
          ? 'bg-gradient-to-r from-amber-900/20 to-yellow-900/20 border-amber-500/30'
          : 'bg-neutral-900/60 border-neutral-700/30 hover:border-amber-500/20'
        }
      `}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      layout
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`font-bold ${isCompleted ? 'text-amber-300' : 'text-gray-200'}`}>
              {mission.title}
            </h3>
            {isCompleted && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-green-400 text-sm"
              >
                ✅
              </motion.span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-0.5">{mission.description}</p>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-900/30 rounded-full px-3 py-1 border border-amber-500/20">
          <span className="text-amber-400 text-sm">🪙</span>
          <span className="text-amber-200 font-bold text-sm">{mission.reward}</span>
        </div>
      </div>

      <div className="relative">
        <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-yellow-400'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-gray-500">
            {mission.progress} / {mission.target}
          </span>
          <span className="text-xs text-gray-500">
            {Math.round(progressPercent)}%
          </span>
        </div>
      </div>

      {isCompleted && (
        <motion.div
          className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full"
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

  const dailyCompleted = missions.daily.filter(m => m.completed).length;
  const allDailyComplete = dailyCompleted === missions.daily.length;
  const weeklyCompleted = missions.weekly.filter(m => m.completed).length;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Daily Missions */}
      <motion.div
        className="bg-gradient-to-b from-neutral-900 to-black border border-amber-500/15 rounded-2xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-amber-300">Daily Missions</h2>
            <p className="text-gray-500 text-sm">Resets at 00:00</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-amber-400 font-bold">{dailyCompleted}/{missions.daily.length}</span>
              <span className="text-gray-500 text-sm ml-1">completed</span>
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
            className="mt-4 p-3 bg-gradient-to-r from-amber-800/30 to-yellow-800/30 rounded-xl border border-amber-500/20 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="text-amber-300 font-bold">🎉 All Daily Missions Complete! Bonus: +{missions.dailyAllBonus} Coins</span>
          </motion.div>
        )}
      </motion.div>

      {/* Weekly Missions */}
      <motion.div
        className="bg-gradient-to-b from-neutral-900 to-black border border-amber-500/15 rounded-2xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-amber-300">Weekly Missions</h2>
            <p className="text-gray-500 text-sm">Resets every Sunday</p>
          </div>
          <div className="text-right">
            <span className="text-amber-400 font-bold">{weeklyCompleted}/{missions.weekly.length}</span>
            <span className="text-gray-500 text-sm ml-1">completed</span>
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
