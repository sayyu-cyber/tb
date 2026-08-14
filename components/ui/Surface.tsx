"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * A panel. Exists because `glass-card rounded-2xl` was applied to 71
 * surfaces indiscriminately, which flattened the hierarchy - a page
 * background, a stat tile and a highlighted call-to-action all looked
 * identical.
 *
 * Tiers:
 *   flat    - lowest weight, sits quietly inside another surface
 *   default - the standard card
 *   raised  - carries a real shadow; use for the one thing that matters
 *   glass   - translucent, for chrome that overlaps content
 *   accent  - tinted by `accent`, for domain-owned panels
 */
type Tier = "flat" | "default" | "raised" | "glass" | "accent";

const TIERS: Record<Tier, string> = {
  flat: "bg-[rgb(var(--c2)/55%)] border border-[rgb(var(--c3)/70%)]",
  default: "surface",
  raised: "surface-raised",
  glass: "glass-card",
  accent: "surface-accent",
};

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  tier?: Tier;
  /** CSS colour token used by the `accent` tier and the top edge-light. */
  accent?: string;
  /** Adds a hairline highlight along the top edge, like a lit physical card. */
  edgeLight?: boolean;
  /** Lifts on hover. Only use where the whole surface is clickable. */
  interactive?: boolean;
  as?: "div" | "section" | "article" | "li";
}

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
  { tier = "default", accent, edgeLight, interactive, className, style, as = "div", children, ...rest },
  ref
) {
  const Tag = as as "div";
  return (
    <Tag
      ref={ref}
      className={cn(
        "rounded-2xl overflow-hidden",
        TIERS[tier],
        edgeLight && "edge-light",
        interactive && "card-hover cursor-pointer",
        className
      )}
      style={accent ? ({ ...style, ["--accent" as string]: accent } as React.CSSProperties) : style}
      {...rest}
    >
      {children}
    </Tag>
  );
});
