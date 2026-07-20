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
    primary: "bg-gradient-to-r from-[#B8962E] via-[#D4AF37] to-[#E8C84A] text-[#0F0F0F] shadow-[0_4px_15px_rgba(212,175,55,0.3)] hover:shadow-[0_6px_25px_rgba(212,175,55,0.5)]",
    secondary: "bg-[#1A1A1A] text-[#D4AF37] border border-[#D4AF37]/30 hover:border-[#D4AF37]/60 hover:bg-[#2A2A2A]",
    outline: "bg-transparent text-[#D4AF37] border-2 border-[#D4AF37]/40 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5",
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
        <div className="absolute inset-0 bg-gradient-to-r from-[#E8C84A] via-[#D4AF37] to-[#B8962E] opacity-0 hover:opacity-100 transition-opacity duration-300" />
      )}
    </motion.button>
  );
}
