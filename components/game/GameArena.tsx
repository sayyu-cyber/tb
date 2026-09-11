"use client";

import { motion } from "framer-motion";
import { getAvatarPreset } from "@/constants/profileCustomization";
import { CardFan } from "@/components/game/PlayingCard";
import { cn } from "@/lib/utils";

/**
 * Shared "arena" shell for live match screens (Mindi and Gin Rummy alike).
 *
 * Before this, a live match was a flat page: a title bar, a row of plain
 * text seat labels ("Partner — 6 cards"), and cards floating on the bare
 * background. It read as a form, not a table. This gives every mode the
 * same physical table metaphor: a felt surface with a lit rim, opponents
 * seated around it with their own avatar and a fanned, face-down hand in
 * their equipped card-back skin, and a defined "well" in the middle where
 * cards actually get played - the same shape as sitting at a real table,
 * just without pretending to be a 3D scene.
 */

// ─── Avatar ──────────────────────────────────────────────────────────

const AVATAR_SIZES = {
  sm: "w-9 h-9 text-xs",
  md: "w-11 h-11 text-sm",
  lg: "w-14 h-14 text-base",
} as const;

export function Avatar({
  name,
  presetId,
  size = "md",
  active = false,
}: {
  name: string;
  presetId?: string;
  size?: keyof typeof AVATAR_SIZES;
  active?: boolean;
}) {
  const preset = getAvatarPreset(presetId);
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="relative shrink-0">
      {active && (
        <motion.span
          className="absolute -inset-1 rounded-2xl bg-[rgb(var(--gold)/35%)] blur-[6px]"
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          AVATAR_SIZES[size],
          "relative rounded-2xl flex items-center justify-center font-bold text-white bg-gradient-to-br shadow-[var(--shadow-sm)] border-2",
          preset.gradient,
          active ? "border-[rgb(var(--gold))]" : "border-black/10"
        )}
      >
        {initial}
      </div>
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────

export function ArenaHeader({
  leaveSlot,
  title,
  subtitle,
  rightSlot,
}: {
  leaveSlot: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="px-4 pt-4 pb-2 flex items-center justify-between relative z-10">
      {leaveSlot}
      <div className="text-center">
        <p className="text-[rgb(var(--text-primary))] text-sm font-semibold">{title}</p>
        {subtitle && <p className="text-[rgb(var(--c4))] text-[10px] flex items-center justify-center gap-1">{subtitle}</p>}
      </div>
      <div className="w-10 flex justify-end">{rightSlot}</div>
    </div>
  );
}

// ─── Opponent seat ───────────────────────────────────────────────────

export interface ArenaSeatData {
  uid: string;
  name: string;
  avatarPreset?: string;
  cardBackId?: string;
  cardCount: number;
  active: boolean;
  tag?: string;
}

/** A seated opponent: avatar + name above a fanned, face-down hand in their skin. */
export function OpponentSeat({ seat, orientation = "row" }: { seat: ArenaSeatData; orientation?: "row" | "column" }) {
  return (
    <div className={cn("flex items-center gap-2", orientation === "column" && "flex-col")}>
      <Avatar name={seat.name} presetId={seat.avatarPreset} size="sm" active={seat.active} />
      <div className={cn("flex flex-col", orientation === "column" && "items-center")}>
        <span className={cn("text-[11px] font-semibold truncate max-w-[6rem]", seat.active ? "text-[rgb(var(--gold))]" : "text-[rgb(var(--c5))]")}>
          {seat.name}
        </span>
        <CardFan count={seat.cardCount} size="xs" cardBackId={seat.cardBackId} />
      </div>
    </div>
  );
}

// ─── Table well ──────────────────────────────────────────────────────

/**
 * The felt-inset centre of the table where cards are actually played.
 * A wide rounded well rather than a strict circle - Mindi's clustered trick
 * cards and Gin Rummy's side-by-side stock/discard piles need different
 * proportions, and a circular mask would clip the wider layout.
 */
export function TableWell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-full max-w-sm min-h-[8.5rem] rounded-[2.5rem] flex items-center justify-center flex-wrap gap-1 px-4 py-3
                 bg-[rgb(var(--c1)/55%)] shadow-[inset_0_2px_18px_rgba(0,0,0,0.35)]"
      style={{
        backgroundImage:
          "radial-gradient(70% 70% at 50% 40%, rgb(var(--accent)/18%), transparent 75%)," +
          "repeating-linear-gradient(45deg, rgb(var(--accent)/6%) 0 2px, transparent 2px 10px)",
      }}
    >
      <div className="absolute inset-[6px] rounded-[inherit] border border-[rgb(var(--accent)/25%)]" />
      {children}
    </div>
  );
}

// ─── Self row ────────────────────────────────────────────────────────

/** The current player's own identity strip, sitting just above their hand. */
export function SelfRow({
  name,
  avatarPreset,
  active,
  trailing,
}: {
  name: string;
  avatarPreset?: string;
  active: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-1 mb-2">
      <div className="flex items-center gap-2">
        <Avatar name={name} presetId={avatarPreset} size="sm" active={active} />
        <span className={cn("text-xs font-semibold", active ? "text-[rgb(var(--gold))]" : "text-[rgb(var(--c5))]")}>{name}</span>
      </div>
      {trailing}
    </div>
  );
}

// ─── Felt background ─────────────────────────────────────────────────

/**
 * Full-screen table surface: a lit accent pool up top (so Mindi/lagoon and
 * Gin Rummy/deep-blue read as distinct rooms), plus a rounded, rimmed
 * "table" panel wrapping the seats and well so the playing surface reads
 * as a physical object rather than the app's flat background.
 */
export function ArenaFelt({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div
      style={{ ["--accent" as string]: accent } as React.CSSProperties}
      className="min-h-screen flex flex-col bg-[rgb(var(--c1))]
                 [background-image:radial-gradient(120%_60%_at_50%_12%,rgb(var(--accent)/16%),transparent_70%)]"
    >
      {children}
    </div>
  );
}

/** The rimmed table panel itself — seats, well and hand all live inside this. */
export function ArenaTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col mx-3 mb-3 rounded-[2rem] relative overflow-hidden
                     bg-[rgb(var(--c2)/45%)] border border-[rgb(var(--accent)/20%)] shadow-[var(--shadow-lg)]">
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(90% 50% at 50% 0%, rgb(var(--accent)/14%), transparent 70%)" }}
      />
      <div className="absolute inset-[3px] rounded-[inherit] border border-white/5 pointer-events-none" />
      <div className="relative z-10 flex-1 flex flex-col px-3 py-4">{children}</div>
    </div>
  );
}
