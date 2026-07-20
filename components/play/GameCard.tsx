"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Swords, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { GoldButton } from "@/components/ui/GoldButton";

interface GameCardProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  players: string;
}

export function GameCard({ name, description, icon, color, players }: GameCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { isGuest } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/15 bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] group"
    >
      {/* Animated background glow */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${color}15, transparent 70%)`,
        }}
      />

      {/* Card content */}
      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <motion.div
              animate={{ rotate: isHovered ? [0, -10, 10, 0] : 0 }}
              transition={{ duration: 0.5 }}
              className="text-5xl mb-3"
            >
              {icon}
            </motion.div>
            <h2 className="text-2xl font-bold text-white">{name}</h2>
            <p className="text-[#3A3A3A] text-sm mt-1">{description}</p>
          </div>
          <div className="flex items-center gap-1 bg-[#1A1A1A] rounded-full px-3 py-1.5 border border-[#2A2A2A]">
            <Users size={14} className="text-[#D4AF37]" />
            <span className="text-[#D4AF37] text-xs font-medium">{players}</span>
          </div>
        </div>

        {/* Game preview area */}
        <div className="relative h-32 bg-[#0F0F0F] rounded-2xl border border-[#2A2A2A] mb-6 overflow-hidden flex items-center justify-center">
          <motion.div
            animate={{
              scale: isHovered ? 1.1 : 1,
              rotate: isHovered ? 5 : 0,
            }}
            transition={{ duration: 0.4 }}
            className="text-6xl opacity-30"
          >
            {icon}
          </motion.div>
          {/* Decorative lines */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-[#D4AF37]" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#D4AF37]" />
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <GoldButton variant="primary" size="lg" className="w-full">
            <div className="flex items-center justify-center gap-2">
              <Users size={18} />
              <span>Play Casual</span>
            </div>
          </GoldButton>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            disabled={isGuest}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold tracking-wide transition-all duration-300 ${
              isGuest
                ? "bg-[#1A1A1A] text-[#2A2A2A] border border-[#2A2A2A] cursor-not-allowed"
                : "bg-gradient-to-r from-[#B8962E] via-[#D4AF37] to-[#E8C84A] text-[#0F0F0F] shadow-[0_4px_15px_rgba(212,175,55,0.3)] hover:shadow-[0_6px_25px_rgba(212,175,55,0.5)]"
            }`}
          >
            {isGuest ? (
              <>
                <Lock size={18} />
                <span>Ranked Locked</span>
              </>
            ) : (
              <>
                <Swords size={18} />
                <span>Play Ranked</span>
              </>
            )}
          </motion.button>

          {isGuest && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-[#2A2A2A] text-[10px]"
            >
              Sign in to unlock Ranked Mode
            </motion.p>
          )}
        </div>
      </div>

      {/* Bottom decorative line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
        animate={{ opacity: isHovered ? 1 : 0.3 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}
