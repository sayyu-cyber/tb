"use client";

import { motion } from "framer-motion";
import { Gamepad2 } from "lucide-react";
import { GameSelectCard } from "@/components/game/GameSelectCard";

const games = [
  {
    id: "mindi",
    name: "Mindi",
    description: "The classic Maldivian card game. Outsmart your opponents with strategy and skill.",
    icon: "♠",
    color: "#D4AF37",
    players: "2-4 Players",
  },
  {
    id: "gin-rummy",
    name: "Gin Rummy",
    description: "Form sets and runs to declare Gin. A timeless card game of skill and luck.",
    icon: "♥",
    color: "#D4AF37",
    players: "2 Players",
  },
];

export default function PlayPage() {
  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
          <Gamepad2 size={20} className="text-[#D4AF37]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Play</h1>
          <p className="text-[#3A3A3A] text-xs">Choose your game</p>
        </div>
      </motion.div>

      <div className="space-y-5">
        {games.map((game, index) => (
          <GameSelectCard key={game.id} {...game} index={index} />
        ))}
      </div>

      {/* Future placeholders */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="glass-card rounded-2xl p-4 border border-dashed border-[#2A2A2A]"
      >
        <p className="text-[#2A2A2A] text-xs text-center tracking-wider uppercase">More games coming soon</p>
      </motion.div>
    </div>
  );
}
