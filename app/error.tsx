"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Route-level error boundary. Catches anything thrown while rendering a
 * page under the root layout - most usefully the 26 live Firestore
 * listeners, any one of which can reject on a rules change or a dropped
 * connection. Before this existed those surfaced as a blank white screen
 * with no way back.
 *
 * This sits INSIDE the root layout, so the providers (and therefore the
 * language setting) are available and the copy can be translated. The
 * root layout itself is covered separately by app/global-error.tsx.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslation();

  useEffect(() => {
    // Keep the real error visible to anyone debugging via devtools -
    // the UI below deliberately shows only a friendly summary.
    console.error("Route error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mx-auto">
          <AlertTriangle size={28} className="text-[#D4AF37]" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[rgb(var(--text-primary))]">{t("error_title")}</h1>
          <p className="text-[rgb(var(--c5))] text-sm leading-relaxed">{t("error_desc")}</p>
        </div>

        {/* The digest is the only safe identifier to show a player - it
            lets them quote something specific in a bug report without
            exposing a raw stack trace. */}
        {error.digest && (
          <p className="text-[rgb(var(--c4))] text-[10px] font-mono break-all">{error.digest}</p>
        )}

        <div className="flex gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={reset}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F] text-sm font-semibold flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            {t("error_tryAgain")}
          </motion.button>
          <Link href="/home" className="flex-1">
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--text-primary))] text-sm font-medium flex items-center justify-center gap-2"
            >
              <Home size={16} />
              {t("error_goHome")}
            </motion.button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
