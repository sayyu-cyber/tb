"use client";

import { motion } from "framer-motion";
import { LucideIcon, ChevronRight } from "lucide-react";

interface SettingButtonProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  danger?: boolean;
  onClick: () => void;
  /** CSS colour token, e.g. "var(--deep)" - see SettingToggle's `accent`.
   *  Ignored when `danger` is set. */
  accent?: string;
}

export function SettingButton({ icon: Icon, label, description, danger = false, onClick, accent }: SettingButtonProps) {
  const accented = Boolean(accent) && !danger;
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center justify-between w-full py-4 px-1 group"
      style={accented ? ({ ["--accent" as string]: accent } as React.CSSProperties) : undefined}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            danger
              ? "bg-[rgb(var(--coral)/10%)]"
              : accented
                ? "bg-[rgb(var(--accent)/10%)] group-hover:bg-[rgb(var(--accent)/18%)]"
                : "bg-[rgb(var(--c2))] group-hover:bg-[rgb(var(--gold)/10%)]"
          }`}
        >
          <Icon
            size={18}
            className={
              danger
                ? "text-[rgb(var(--coral-ink))]"
                : accented
                  ? "text-[rgb(var(--accent))]"
                  : "text-[rgb(var(--c4))] group-hover:text-[rgb(var(--gold-ink))]"
            }
          />
        </div>
        <div className="text-left">
          <p className={`text-sm font-medium ${danger ? "text-[rgb(var(--coral-ink))]" : "text-[rgb(var(--text-primary))]"}`}>{label}</p>
          {description && (
            <p className="text-[rgb(var(--c4))] text-[11px] mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <ChevronRight
        size={16}
        className={`text-[rgb(var(--c3))] transition-colors ${accented ? "group-hover:text-[rgb(var(--accent))]" : "group-hover:text-[rgb(var(--gold-ink))]"}`}
      />
    </motion.button>
  );
}
