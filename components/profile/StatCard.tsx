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
          ? "bg-gradient-to-br from-[rgb(var(--gold)/10%)] to-transparent border-[rgb(var(--gold)/20%)]"
          : "bg-[rgb(var(--c2)/50%)] border-[rgb(var(--c3))]"
      }`}
    >
      <Icon size={18} className={highlight ? "text-[rgb(var(--gold))]" : "text-[rgb(var(--c4))]"} />
      <p className="text-[rgb(var(--text-primary))] text-lg font-bold mt-2">{value}</p>
      <p className="text-[rgb(var(--c4))] text-[10px] uppercase tracking-wider mt-0.5">{label}</p>
    </motion.div>
  );
}
