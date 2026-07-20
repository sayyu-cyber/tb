"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface SettingToggleProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  enabled: boolean;
  onChange: () => void;
}

export function SettingToggle({ icon: Icon, label, description, enabled, onChange }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between py-4 px-1">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          enabled ? "bg-[#D4AF37]/10" : "bg-[#1A1A1A]"
        }`}>
          <Icon size={18} className={enabled ? "text-[#D4AF37]" : "text-[#3A3A3A]"} />
        </div>
        <div>
          <p className="text-white text-sm font-medium">{label}</p>
          {description && (
            <p className="text-[#3A3A3A] text-[11px] mt-0.5">{description}</p>
          )}
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onChange}
        className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
          enabled ? "bg-[#D4AF37]" : "bg-[#2A2A2A]"
        }`}
      >
        <motion.div
          animate={{ x: enabled ? 20 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
        />
      </motion.button>
    </div>
  );
}
