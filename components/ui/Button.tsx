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

/**
 * The Arena button (design/arena/README.md "Components"), driven by the
 * `.ar-btn` recipe in styles/arena.css: uppercase Space Grotesk on a lit
 * face, a 6px colour lip under it, and a press that sinks the face 5px onto
 * that lip.
 *
 * Sizes are set here rather than in styles/buttons.css, which is
 * contractually depth-only and guarded by scripts/check-button-3d.mjs. That
 * file's generic bevel is a bare `button` rule, so these classes win.
 */
const BASE = "ar-btn select-none";

const SIZES: Record<Size, string> = {
  sm: "sm",   // 48px
  md: "md",   // 52px
  lg: "",     // 58px, the default in .ar-btn
};

/**
 * Arena variants. Lime is you and the one action a screen wants you to take;
 * blue is the table and the other side, so it carries secondary actions.
 * (The design pack calls that blue "violet" — see styles/arena.css.)
 */
const VARIANTS: Record<Variant, string> = {
  primary: "",            // lime, the default face in .ar-btn
  accent: "blue",
  secondary: "blue",
  ghost: "ghost",
  danger: "danger",
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
      // No whileTap/whileHover: the Arena press is a CSS transition on
      // .ar-btn (5px down in 90ms, back in 180ms on a spring). Framer writes
      // transform inline, which would override that rule and leave the lip
      // collapsing while the face moved a different distance.
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
