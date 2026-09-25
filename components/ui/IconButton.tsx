"use client";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * A 48px square graphite button that turns lime on hover
 * (design/arena/README.md "Components" → Icon button).
 *
 * `aria-label` is required rather than optional: every use of this is an
 * icon with no text, so without one it is a button that announces nothing.
 */
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  size?: "sm" | "md";
}

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { size = "md", className, children, ...props },
  ref
) {
  return (
    <button {...props} ref={ref} type={props.type ?? "button"}
      className={cn("ar-ibtn", size === "sm" && "sm", className)}>
      {children}
    </button>
  );
});
