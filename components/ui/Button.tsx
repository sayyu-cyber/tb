"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The app had 43 buttons all wearing the same gold gradient, so a
 * destructive "Ban player", a neutral "Cancel" and the primary "Start
 * Match" were indistinguishable. This gives them real hierarchy.
 *
 * Variants, roughly in descending visual weight:
 *   primary   - the one action a screen wants you to take (gold)
 *   accent    - domain-coloured primary; pass `accent` to pick the hue
 *   secondary - a real alternative, outlined rather than filled
 *   ghost     - tertiary / dismissive, no chrome until hovered
 *   danger    - destructive, and deliberately never gold
 */
type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const BASE =
  "relative inline-flex items-center justify-center gap-2 font-semibold rounded-xl " +
  "transition-colors duration-200 select-none " +
  "disabled:opacity-45 disabled:pointer-events-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2";

const SIZES: Record<Size, string> = {
  sm: "text-xs px-3 py-2 min-h-[36px]",
  // 44px is the minimum comfortable touch target; the old ad-hoc buttons
  // were frequently smaller than that.
  md: "text-sm px-4 py-2.5 min-h-[44px]",
  lg: "text-base px-6 py-3.5 min-h-[52px]",
};

const VARIANTS: Record<Variant, string> = {
  primary:
    "text-[#0C0E12] bg-gradient-to-b from-[rgb(var(--gold-bright))] to-[rgb(var(--gold-deep))] " +
    "shadow-[0_2px_12px_-2px_rgb(var(--gold)/45%)] hover:brightness-110 active:brightness-95",
  accent:
    "text-[#0C0E12] bg-gradient-to-b from-[rgb(var(--accent))] to-[rgb(var(--accent))] " +
    "shadow-[0_2px_12px_-2px_rgb(var(--accent)/45%)] hover:brightness-110 active:brightness-95",
  secondary:
    "text-[rgb(var(--text-primary))] bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] " +
    "hover:border-[rgb(var(--gold)/45%)] hover:bg-[rgb(var(--c3)/60%)]",
  ghost:
    "text-[rgb(var(--c5))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--c2))]",
  danger:
    "text-[rgb(var(--coral))] bg-[rgb(var(--coral)/10%)] border border-[rgb(var(--coral)/30%)] " +
    "hover:bg-[rgb(var(--coral)/18%)]",
};

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: Size;
  /** CSS colour token for the `accent` variant, e.g. TOKEN.lagoon. */
  accent?: string;
  /** Shows a spinner and blocks interaction. Keeps width stable. */
  loading?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    accent,
    loading = false,
    fullWidth = false,
    disabled,
    className,
    children,
    style,
    ...rest
  },
  ref
) {
  return (
    <motion.button
      ref={ref}
      // A small, quick press is more convincing than a large slow one -
      // the old buttons used scale 0.9-0.95, which reads as rubbery.
      whileTap={disabled || loading ? undefined : { scale: 0.975 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BASE, SIZES[size], VARIANTS[variant], fullWidth && "w-full", className)}
      style={accent ? ({ ...style, ["--accent" as string]: accent } as React.CSSProperties) : style}
      {...rest}
    >
      {/* Label stays mounted and just fades, so the button doesn't resize
          when it enters the loading state. */}
      <span className={cn("inline-flex items-center gap-2", loading && "opacity-0")}>{children}</span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        </span>
      )}
    </motion.button>
  );
});
