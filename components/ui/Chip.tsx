"use client";
import { cn } from "@/lib/utils";

/**
 * A 26px tracked-caps chip (design/arena/README.md "Components" → Chips).
 *
 * `live` carries a blinking dot and is for things happening right now —
 * Weekend League, a match in progress. `blue` is the table/opponent tone
 * (the design pack calls it violet; see styles/arena.css).
 */
export function Chip({
  tone = "mono",
  children,
  className,
}: {
  tone?: "live" | "blue" | "mono" | "white";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("ar-chip", tone, className)}>
      {tone === "live" && <i className="ar-chip-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
