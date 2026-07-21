"use client";

import { motion } from "framer-motion";
import { ProfileCard } from "@/components/home/ProfileCard";
import { SeasonCard } from "@/components/home/SeasonCard";
import { MatchesRemaining } from "@/components/home/MatchesRemaining";
import { QuickPlayButtons } from "@/components/home/QuickPlayButtons";
import { NewsSection } from "@/components/home/NewsSection";
import { WeekendLeague } from "@/components/home/WeekendLeague";
import { RankProgress } from "@/components/home/RankProgress";
import { DailyMatchCounter } from "@/components/home/DailyMatchCounter";

export default function HomePage() {
  return (
    <div className="px-4 pt-6 pb-6 space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-bold text-white">Thaasbai</h1>
          <p className="text-[#3A3A3A] text-xs">The Home of Maldivian Card Games</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8962E] flex items-center justify-center">
          <span className="text-[#0F0F0F] text-xs font-bold">T</span>
        </div>
      </motion.div>

      <ProfileCard />
      <RankProgress />
      <DailyMatchCounter />
      <SeasonCard />
      <MatchesRemaining remaining={2} total={3} />
      <QuickPlayButtons />
      <WeekendLeague />
      <NewsSection />

      {/* Future placeholders */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="space-y-2"
      >
        <div className="glass-card rounded-xl p-3 border border-dashed border-[#2A2A2A]">
          <p className="text-[#2A2A2A] text-[10px] text-center tracking-wider uppercase">Friends (Coming Soon)</p>
        </div>
        <div className="glass-card rounded-xl p-3 border border-dashed border-[#2A2A2A]">
          <p className="text-[#2A2A2A] text-[10px] text-center tracking-wider uppercase">Private Rooms (Coming Soon)</p>
        </div>
        <div className="glass-card rounded-xl p-3 border border-dashed border-[#2A2A2A]">
          <p className="text-[#2A2A2A] text-[10px] text-center tracking-wider uppercase">Weekend Tournament (Coming Soon)</p>
        </div>
        <div className="glass-card rounded-xl p-3 border border-dashed border-[#2A2A2A]">
          <p className="text-[#2A2A2A] text-[10px] text-center tracking-wider uppercase">VIP Pass (Coming Soon)</p>
        </div>
        <div className="glass-card rounded-xl p-3 border border-dashed border-[#2A2A2A]">
          <p className="text-[#2A2A2A] text-[10px] text-center tracking-wider uppercase">Cosmetic Shop (Coming Soon)</p>
        </div>
      </motion.div>
    </div>
  );
}
