"use client";

import { Trophy } from "lucide-react";

interface TrophyBadgeProps {
  count: number;
  size?: "sm" | "md" | "lg";
}

export function TrophyBadge({ count, size = "md" }: TrophyBadgeProps) {
  const sizes = {
    sm: { icon: 14, text: "text-xs" },
    md: { icon: 18, text: "text-sm" },
    lg: { icon: 24, text: "text-lg" },
  };

  const s = sizes[size];

  return (
    <div className="flex items-center gap-1.5">
      <Trophy size={s.icon} className="text-[#D4AF37]" />
      <span className={`${s.text} font-semibold text-[#D4AF37]`}>
        {count.toLocaleString()}
      </span>
    </div>
  );
}
