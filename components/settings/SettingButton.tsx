"use client";

import { motion } from "framer-motion";
import { LucideIcon, ChevronRight } from "lucide-react";

interface SettingButtonProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  danger?: boolean;
  onClick: () => void;
}

export function SettingButton({ icon: Icon, label, description, danger = false, onClick }: SettingButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center justify-between w-full py-4 px-1 group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          danger ? "bg-red-500/10" : "bg-[rgb(var(--c2))]"
        }`}>
          <Icon size={18} className={danger ? "text-red-400" : "text-[rgb(var(--c4))] group-hover:text-[rgb(var(--gold))]"} />
        </div>
        <div className="text-left">
          <p className={`text-sm font-medium ${danger ? "text-red-400" : "text-[rgb(var(--text-primary))]"}`}>{label}</p>
          {description && (
            <p className="text-[rgb(var(--c4))] text-[11px] mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <ChevronRight size={16} className="text-[rgb(var(--c3))] group-hover:text-[rgb(var(--gold))] transition-colors" />
    </motion.button>
  );
}
