"use client";

import { cn } from "@/lib/utils";

/**
 * Small status pill. The app had a dozen hand-rolled variations of this
 * (VIP tag, FEATURED tag, POPULAR tag, rarity chip, "(you)" marker), each
 * with slightly different padding, radius and type size.
 */
type Tone = "gold" | "lagoon" | "coral" | "deep" | "orchid" | "neutral";

const TONES: Record<Tone, string> = {
  gold: "text-[rgb(var(--gold))] bg-[rgb(var(--gold)/12%)] border-[rgb(var(--gold)/25%)]",
  lagoon: "text-[rgb(var(--lagoon))] bg-[rgb(var(--lagoon)/12%)] border-[rgb(var(--lagoon)/25%)]",
  coral: "text-[rgb(var(--coral))] bg-[rgb(var(--coral)/12%)] border-[rgb(var(--coral)/25%)]",
  deep: "text-[rgb(var(--deep))] bg-[rgb(var(--deep)/14%)] border-[rgb(var(--deep)/28%)]",
  orchid: "text-[rgb(var(--orchid))] bg-[rgb(var(--orchid)/12%)] border-[rgb(var(--orchid)/25%)]",
  neutral: "text-[rgb(var(--c5))] bg-[rgb(var(--c2))] border-[rgb(var(--c3))]",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
  /** Adds a pulsing halo — for genuinely live state only. */
  live = false,
}: {
  tone?: Tone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  live?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
        "text-[10px] font-bold uppercase tracking-wider leading-none whitespace-nowrap",
        TONES[tone],
        live && "halo",
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
