"use client";

import { cn } from "@/lib/utils";

interface RankBadgeProps {
  rank: string;
  size?: "sm" | "md" | "lg";
}

const rankColors: Record<string, string> = {
  "Unranked": "bg-[#3A3A3A] text-[#888888]",
  "Bronze": "bg-[#8B6914]/20 text-[#CD7F32] border border-[#CD7F32]/30",
  "Silver": "bg-[#71797E]/20 text-[#C0C0C0] border border-[#C0C0C0]/30",
  "Gold": "bg-[#B8962E]/20 text-[#FFD700] border border-[#FFD700]/30",
  "Platinum": "bg-[#3EB489]/20 text-[#E5E4E2] border border-[#E5E4E2]/30",
  "Guest": "bg-[#2A2A2A] text-[#888888]",
};

export function RankBadge({ rank, size = "md" }: RankBadgeProps) {
  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-3 py-1 text-xs",
    lg: "px-4 py-1.5 text-sm",
  };

  return (
    <span
      className={cn(
        "rounded-full font-semibold uppercase tracking-wider",
        sizes[size],
        rankColors[rank] || rankColors["Unranked"]
      )}
    >
      {rank}
    </span>
  );
}
