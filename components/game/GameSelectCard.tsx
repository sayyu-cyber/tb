"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Swords, Lock, Bot, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface GameSelectCardProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  players: string;
  index: number;
}

export function GameSelectCard({ id, name, description, icon, players, index }: GameSelectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { isGuest } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/15 bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F]"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <motion.div className="text-5xl mb-3">{icon}</motion.div>
            <h2 className="text-2xl font-bold text-white">{name}</h2>
            <p className="text-[#3A3A3A] text-sm mt-1">{description}</p>
          </div>
          <div className="flex items-center gap-1 bg-[#1A1A1A] rounded-full px-3 py-1.5 border border-[#2A2A2A]">
            <Users size={14} className="text-[#D4AF37]" />
            <span className="text-[#D4AF37] text-xs font-medium">{players}</span>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              {/* Casual Mode */}
              <div className="space-y-2">
                <p className="text-[#3A3A3A] text-xs uppercase tracking-wider">Casual Mode</p>
                <div className="grid grid-cols-2 gap-2">
                  <Link href={`/play/${id}/casual/ai`}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#D4AF37]/30 text-white rounded-xl py-3 transition-colors"
                    >
                      <Bot size={16} className="text-[#D4AF37]" />
                      <span className="text-sm">vs AI</span>
                    </motion.button>
                  </Link>
                  <Link href={`/play/${id}/casual/passplay`}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#D4AF37]/30 text-white rounded-xl py-3 transition-colors"
                    >
                      <Smartphone size={16} className="text-[#D4AF37]" />
                      <span className="text-sm">Pass & Play</span>
                    </motion.button>
                  </Link>
                </div>
              </div>

              {/* Ranked Mode */}
              <div className="space-y-2 pt-2">
                <p className="text-[#3A3A3A] text-xs uppercase tracking-wider">Ranked Mode</p>
                {isGuest ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A]">
                    <Lock size={16} className="text-[#3A3A3A]" />
                    <p className="text-[#3A3A3A] text-sm">Please sign in to access Ranked Mode</p>
                  </div>
                ) : (
                  <Link href={`/play/${id}/ranked`}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#B8962E] via-[#D4AF37] to-[#E8C84A] text-[#0F0F0F] font-semibold rounded-xl py-3 shadow-[0_4px_15px_rgba(212,175,55,0.3)]"
                    >
                      <Swords size={16} />
                      <span>Play Ranked</span>
                    </motion.button>
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-4 py-2 text-[#D4AF37] text-sm font-medium border border-[#D4AF37]/20 rounded-xl hover:bg-[#D4AF37]/5 transition-colors"
        >
          {expanded ? "Close" : "Select Mode"}
        </motion.button>
      </div>
    </motion.div>
  );
}
