"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  delay?: number;
  highlight?: boolean;
}

export function StatCard({ icon: Icon, label, value, delay = 0, highlight = false }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ y: -2 }}
      className={`rounded-xl p-4 border ${
        highlight
          ? "bg-gradient-to-br from-[#D4AF37]/10 to-transparent border-[#D4AF37]/20"
          : "bg-[#1A1A1A]/50 border-[#2A2A2A]"
      }`}
    >
      <Icon size={18} className={highlight ? "text-[#D4AF37]" : "text-[#3A3A3A]"} />
      <p className="text-white text-lg font-bold mt-2">{value}</p>
      <p className="text-[#3A3A3A] text-[10px] uppercase tracking-wider mt-0.5">{label}</p>
    </motion.div>
  );
}
