"use client";

import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Route-transition fallback. Shown while a route segment's JS chunk is
 * still loading - previously the app just showed nothing during that gap,
 * which read as a frozen tap on a slow connection.
 *
 * Deliberately minimal (a spinner, not a skeleton): screens here vary too
 * much in shape for one shared skeleton to look right, and the individual
 * data-loading skeletons already live inside each page.
 */
export default function Loading() {
  const t = useTranslation();

  return (
    <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center gap-4">
      <div className="relative w-12 h-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-2 border-[rgb(var(--gold)/20%)] border-t-[rgb(var(--gold))]"
        />
      </div>
      <p className="text-[rgb(var(--c5))] text-xs">{t("error_loading")}</p>
    </div>
  );
}
