"use client";

import { cn } from "@/lib/utils";

interface RankBadgeProps {
  rank: string;
  size?: "sm" | "md" | "lg";
}

const rankColors: Record<string, string> = {
  "Unranked": "bg-[#3A3A3A] text-[#888888]",
  "Bronze": "bg-[#8B6914] text-[#CD7F32]",
  "Silver": "bg-[#71797E] text-[#C0C0C0]",
  "Gold": "bg-[#B8962E] text-[#FFD700]",
  "Platinum": "bg-[#3EB489] text-[#E5E4E2]",
  "Diamond": "bg-[#0F52BA] text-[#B9F2FF]",
  "Master": "bg-[#800080] text-[#DA70D6]",
  "Grandmaster": "bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] text-[#0F0F0F]",
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
