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
  count,
}: {
  name: string;
  presetId?: string;
  size?: keyof typeof AVATAR_SIZES;
  active?: boolean;
  /** Cards in hand. Shown as a badge, the way seated players read a table. */
  count?: number;
}) {
  const preset = getAvatarPreset(presetId);
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="relative shrink-0">
      {active && (
        <motion.span
          // Glow follows the table's accent rather than always being gold,
          // so "it's their turn" reads as part of this game's colour.
          className="absolute -inset-1 rounded-2xl bg-[rgb(var(--accent,var(--gold))/40%)] blur-[6px]"
          animate={{ opacity: [0.45, 0.9, 0.45] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          AVATAR_SIZES[size],
          "relative rounded-2xl flex items-center justify-center font-bold text-white bg-gradient-to-br shadow-[var(--shadow-sm)] border-2",
          preset.gradient,
          active ? "border-[rgb(var(--accent,var(--gold)))]" : "border-black/20"
        )}
      >
        {initial}
      </div>
      {count !== undefined && (
        <span
          className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full
                     bg-[rgb(var(--c1))] border border-[rgb(var(--accent,var(--gold))/55%)]
                     text-[10px] font-bold tabular-nums leading-none
                     text-[rgb(var(--text-primary))] flex items-center justify-center"
        >
          {count}
        </span>
      )}
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
    <div
      className="mx-3 mt-3 px-4 py-2.5 flex items-center justify-between relative z-10 rounded-2xl
                 bg-[rgb(var(--c2)/35%)] backdrop-blur-md border border-[rgb(var(--c3)/50%)]"
    >
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

/** A seated opponent: avatar + name above a fanned, face-down hand in their
 *  skin, sat on a glass pill when it's their turn - the premium "who's up"
 *  signal, distinct from the plain avatar glow used the rest of the time. */
export function OpponentSeat({ seat, orientation = "row" }: { seat: ArenaSeatData; orientation?: "row" | "column" }) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-2 rounded-2xl transition-colors duration-300",
        orientation === "column" && "flex-col gap-1",
        seat.active
          ? "px-2.5 py-2 bg-[rgb(var(--accent,var(--gold))/15%)] backdrop-blur-md ring-1 ring-inset ring-[rgb(var(--accent,var(--gold))/42%)] shadow-[0_0_24px_-5px_rgb(var(--accent,var(--gold))/65%)]"
          : "px-2.5 py-2 bg-black/10 backdrop-blur-[2px]"
      )}
    >
      <div
        className="absolute -inset-x-3 bottom-0 h-8 rounded-full opacity-60 blur-xl pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(70% 80% at 50% 50%, rgb(var(--accent)/28%), transparent 70%)",
        }}
        aria-hidden="true"
      />
      <Avatar name={seat.name} presetId={seat.avatarPreset} size="sm" active={seat.active} count={seat.cardCount} />
      <div className={cn("flex flex-col min-w-0", orientation === "column" && "items-center")}>
        <span
          className={cn(
            "text-[11px] font-semibold truncate max-w-[6rem]",
            seat.active ? "text-[rgb(var(--accent,var(--gold)))]" : "text-[rgb(var(--c5))]"
          )}
        >
          {seat.name}
        </span>
        <CardFan count={seat.cardCount} size="xs" cardBackId={seat.cardBackId} hideOverflowCount />
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
      className="relative w-full max-w-[min(36rem,100%)] min-h-[8.5rem] sm:min-h-[10rem] lg:min-h-[12rem] rounded-[2rem] sm:rounded-[3rem] flex items-center justify-center flex-wrap gap-1 px-4 py-3
                 bg-black/30 backdrop-blur-[1px]
                 shadow-[inset_0_8px_30px_rgba(0,0,0,0.48),inset_0_-1px_0_rgb(255_255_255/8%),0_18px_34px_-26px_rgb(var(--accent)/70%)]"
      style={{
        backgroundImage:
          "radial-gradient(70% 70% at 50% 38%, rgb(var(--accent)/26%), transparent 75%)," +
          "radial-gradient(90% 120% at 50% 115%, rgb(0 0 0/45%), transparent 62%)," +
          "repeating-linear-gradient(45deg, rgb(var(--accent)/7%) 0 2px, transparent 2px 10px)",
      }}
    >
      {/* Two hairlines: an accent rim, and a lighter one just inside it, so
          the well reads as a recess cut into the table rather than a panel
          floating on top of it. */}
      <div className="absolute inset-[6px] rounded-[inherit] border border-[rgb(var(--accent)/30%)] pointer-events-none" />
      <div className="absolute inset-[7px] rounded-[inherit] border-t border-white/10 pointer-events-none" />
      <div className="relative flex items-center justify-center flex-wrap gap-1">{children}</div>
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
    <div
      className={cn(
        "flex items-center justify-between px-2 py-1.5 mb-2 rounded-2xl transition-colors duration-300",
        active && "bg-[rgb(var(--gold)/10%)] backdrop-blur-md ring-1 ring-inset ring-[rgb(var(--gold)/35%)]"
      )}
    >
      <div className="flex items-center gap-2">
        <Avatar name={name} presetId={avatarPreset} size="sm" active={active} />
        <span className={cn("text-xs font-semibold", active ? "text-[rgb(var(--gold-ink))]" : "text-[rgb(var(--c5))]")}>{name}</span>
      </div>
      {trailing}
    </div>
  );
}

// ─── Table skins ─────────────────────────────────────────────────────

/**
 * Table-skin rendering. Mirrors PlayingCard's `CARD_BACK_STYLES`: table
 * skins (data/cosmetics.ts `TABLE_THEMES`) are catalogue entries with a
 * `previewImage` path, but no art asset exists yet, so each skin gets a
 * procedural tint + pattern here - genuinely visible and distinct at the
 * table without needing uploaded artwork. `base` doubles as the shared
 * surface colour and (via template-literal alpha suffixes like
 * `${base}CC`) needs to stay a 6-digit hex.
 *
 * This is the single equipped-skin source every play mode reads from - a
 * player's own `equipped.tableTheme` (see EconomyContext/CosmeticShop) is
 * passed down as `tableThemeId` from each game client, so Classic (Ranked),
 * Quick Match (Casual Online) and Private Room all render identically:
 * same component, same lookup, no per-mode branching.
 */
export const TABLE_THEME_STYLES: Record<string, { base: string; glow: string; pattern?: string }> = {
  tt_default: {
    base: "#123D35",
    glow: "#62BBA3",
    pattern:
      "repeating-linear-gradient(45deg, #ffffff03 0 1px, transparent 1px 4px)",
  },
  tt_midnight: { base: "#0A0A12", glow: "#6B7280" },
  tt_red: { base: "#3A0E14", glow: "#D23B54" },
  tt_blue: { base: "#0B2A4A", glow: "#3B82F6" },
  tt_gold: {
    base: "#241A05",
    glow: "#E8C84A",
    pattern: "repeating-linear-gradient(90deg, #E8C84A1A 0 2px, transparent 2px 14px)",
  },
  tt_space: {
    base: "#0B0620",
    glow: "#8B5CF6",
    pattern:
      "radial-gradient(1.5px 1.5px at 15% 25%, #ffffffaa 50%, transparent 51%)," +
      "radial-gradient(1px 1px at 75% 15%, #ffffff88 50%, transparent 51%)," +
      "radial-gradient(1.5px 1.5px at 45% 65%, #ffffffcc 50%, transparent 51%)," +
      "radial-gradient(1px 1px at 85% 75%, #ffffff77 50%, transparent 51%)," +
      "radial-gradient(1px 1px at 25% 88%, #ffffff99 50%, transparent 51%)",
  },
  tt_vip: {
    base: "#241405",
    glow: "#FDE047",
    pattern: "repeating-linear-gradient(90deg, #FDE0471A 0 2px, transparent 2px 14px)",
  },
  tt_wooden: {
    base: "#3E2718",
    glow: "#C89A66",
    pattern: "repeating-linear-gradient(90deg, #C89A6622 0 3px, transparent 3px 14px)",
  },
  tt_ice: {
    base: "#173B4D",
    glow: "#7DD3FC",
    pattern: "repeating-linear-gradient(120deg, #BFEFFF1A 0 2px, transparent 2px 12px)",
  },
  tt_lava: {
    base: "#3A0E0E",
    glow: "#FB923C",
    pattern: "repeating-linear-gradient(45deg, #FF6B4A22 0 3px, transparent 3px 16px)",
  },
};

function tableTheme(tableThemeId?: string) {
  return TABLE_THEME_STYLES[tableThemeId ?? ""] ?? TABLE_THEME_STYLES.tt_default;
}

// ─── Felt background ─────────────────────────────────────────────────

/**
 * Full-screen table surface: a lit accent pool up top (so Mindi/lagoon and
 * Gin Rummy/deep-blue still read as distinct rooms via `accent`), washed in
 * the player's equipped table skin (`tableThemeId`) rather than the app's
 * flat background - so the skin, not just the game, is visible the instant
 * a match loads. Falls back to the default felt when no skin is equipped.
 */
export function ArenaFelt({
  accent, tableThemeId, children,
}: { accent: string; tableThemeId?: string; children: React.ReactNode }) {
  const theme = tableTheme(tableThemeId);
  return (
    <div className="game-arena" style={{ "--accent": accent, "--table-glow": theme.glow } as React.CSSProperties}>
      {children}
    </div>
  );
}

/** Physical rim and felt are separate layers; the equipped skin owns the surface. */
export function ArenaTable({ tableThemeId, children }: { tableThemeId?: string; children: React.ReactNode }) {
  const theme = tableTheme(tableThemeId);
  return (
    <div className="arena-table-frame">
      <div className="arena-table-felt" style={{ backgroundColor: theme.base, backgroundImage: theme.pattern, borderColor: theme.glow }}>
        <div className="arena-table-stitch" aria-hidden="true" />
        <div className="arena-table-content">{children}</div>
      </div>
    </div>
  );
}

// ─── Turn indicator ──────────────────────────────────────────────────

/**
 * Premium "whose turn" HUD - a glowing pulsing pill rather than plain
 * status text ("Select a card to play"). Used in the SelfRow trailing slot
 * across every game client, active only when it's genuinely this player's
 * turn (no fabricated urgency when it isn't).
 */
export function TurnIndicator({
  active,
  activeLabel,
  waitingLabel,
}: {
  active: boolean;
  activeLabel: string;
  waitingLabel?: string;
}) {
  if (!active) {
    return waitingLabel ? <span className="text-[rgb(var(--c4))] text-[11px]">{waitingLabel}</span> : null;
  }
  return (
    <span
      className="relative inline-flex items-center gap-1.5 rounded-full px-3 py-1
                 text-[10px] font-black uppercase tracking-widest text-[rgb(var(--gold-ink))]
                 bg-[rgb(var(--gold)/14%)] ring-1 ring-inset ring-[rgb(var(--gold)/45%)]"
    >
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        animate={{ boxShadow: ["0 0 0px rgb(var(--gold)/0%)", "0 0 14px rgb(var(--gold)/65%)", "0 0 0px rgb(var(--gold)/0%)"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="relative h-1.5 w-1.5 rounded-full bg-[rgb(var(--gold))] animate-pulse" aria-hidden="true" />
      <span className="relative">{activeLabel}</span>
    </span>
  );
}
