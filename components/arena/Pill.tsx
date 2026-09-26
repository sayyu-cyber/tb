/**
 * The small uppercase status chip: LIVE, EQUIPPED, CASUAL MODE, WIN +10.
 * `.pill` plus one tone on the boards.
 *
 * `live` adds the blinking dot. It stops under prefers-reduced-motion
 * (styles/arena-shell.css) rather than looping forever.
 */
import type { ReactNode } from "react";

export type PillTone = "lime" | "blue" | "dim" | "line";

export type PillProps = {
  children: ReactNode;
  tone?: PillTone;
  /** Prefix the label with the pulsing dot. */
  live?: boolean;
  /** Leading icon, sized by the sheet to 13px. */
  icon?: ReactNode;
  className?: string;
  title?: string;
};

export function Pill({ children, tone = "dim", live = false, icon, className = "", title }: PillProps) {
  const classes = ["pill", tone, live && "live", className].filter(Boolean).join(" ");
  return (
    <span className={classes} title={title}>
      {icon}
      {children}
    </span>
  );
}
