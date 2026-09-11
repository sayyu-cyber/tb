"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { riseIn } from "@/lib/motion";

/**
 * Bold, saturated card background for Home's stat and game cards - a fill
 * in the card's own accent colour, given real depth (a glossy highlight top
 * -left, a dark scrim bottom-right, a coloured glow shadow that makes the
 * card read as floating rather than flat) so white text and icons always
 * have real contrast, and the card itself reads as a physical, game-like
 * object rather than a flat rectangle of colour.
 *
 * Replaces `.surface-accent` (globals.css) on cards where the brief is
 * "make it colorful and bold, like a game" rather than "hint at a hue on
 * an otherwise white card" - `.surface-accent` still exists and is still
 * right for surfaces that should read as calm/neutral.
 */
export function VividCard({
  accent,
  className,
  children,
}: {
  accent: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={riseIn}
      initial="hidden"
      animate="show"
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      style={{ ["--accent" as string]: accent } as React.CSSProperties}
      className={cn(
        "relative overflow-hidden rounded-lg p-5 bg-[rgb(var(--c2))]",
        "border border-[rgb(var(--accent)/25%)] border-t-2 border-t-[rgb(var(--accent)/65%)]",
        className
      )}
    >
      <div className="absolute inset-0 bg-[rgb(var(--accent)/5%)]" aria-hidden="true" />
      {/* Glossy top-left highlight, dark scrim bottom-right - the two
          together give a flat fill real gradient depth instead of one flat
          tone edge to edge. */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
