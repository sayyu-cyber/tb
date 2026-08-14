"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GoldButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}

export function GoldButton({
  children,
  variant = "primary",
  size = "md",
  className,
  onClick,
  disabled = false,
  type = "button",
}: GoldButtonProps) {
  const baseStyles = "relative overflow-hidden rounded-xl font-semibold tracking-wide transition-all duration-300";

  const variants = {
    primary: "bg-gradient-to-r from-[rgb(var(--gold-deep))] via-[rgb(var(--gold))] to-[rgb(var(--gold-bright))] text-[#0F0F0F] shadow-[0_4px_15px_rgba(212,175,55,0.3)] hover:shadow-[0_6px_25px_rgba(212,175,55,0.5)]",
    secondary: "bg-[rgb(var(--c2))] text-[rgb(var(--gold))] border border-[rgb(var(--gold)/30%)] hover:border-[rgb(var(--gold)/60%)] hover:bg-[rgb(var(--c3))]",
    outline: "bg-transparent text-[rgb(var(--gold))] border-2 border-[rgb(var(--gold)/40%)] hover:border-[rgb(var(--gold))] hover:bg-[rgb(var(--gold)/5%)]",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <motion.button
      type={type}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <span className="relative z-10">{children}</span>
      {variant === "primary" && (
        <div className="absolute inset-0 bg-gradient-to-r from-[rgb(var(--gold-bright))] via-[rgb(var(--gold))] to-[rgb(var(--gold-deep))] opacity-0 hover:opacity-100 transition-opacity duration-300" />
      )}
    </motion.button>
  );
}
