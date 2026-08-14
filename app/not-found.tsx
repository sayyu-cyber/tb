"use client";

import { motion } from "framer-motion";
import { SearchX, Home } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * 404 screen. Reachable both from a genuinely bad URL and from any
 * notFound() call. Kept visually consistent with app/error.tsx so the two
 * failure states feel like the same app rather than two different ones.
 */
export default function NotFound() {
  const t = useTranslation();

  return (
    <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="w-16 h-16 rounded-full bg-[rgb(var(--gold)/10%)] border border-[rgb(var(--gold)/20%)] flex items-center justify-center mx-auto">
          <SearchX size={28} className="text-[rgb(var(--gold))]" />
        </div>

        <div className="space-y-2">
          <p className="gold-text-gradient text-5xl font-bold tracking-tight">404</p>
          <h1 className="text-xl font-bold text-[rgb(var(--text-primary))]">{t("error_notFoundTitle")}</h1>
          <p className="text-[rgb(var(--c5))] text-sm leading-relaxed">{t("error_notFoundDesc")}</p>
        </div>

        <Link href="/home" className="block">
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Home size={16} />
            {t("error_goHome")}
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
