"use client";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: "dark" | "gold" | "danger";
  iconOnly?: boolean;
  busy?: boolean;
}

export const GameButton = forwardRef<HTMLButtonElement, Props>(function GameButton(
  {tone="dark", iconOnly=false, busy=false, disabled, className, children, ...props}, ref
) {
  return <button {...props} ref={ref} type={props.type??"button"} disabled={disabled||busy}
    aria-busy={busy||undefined} className={cn("game-button",`game-button-${tone}`,iconOnly&&"game-button-icon",className)}>
    {busy?<LoaderCircle size={20} className="game-button-spinner" aria-hidden="true"/>:null}{children}
  </button>;
});
