"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface LeaveMatchButtonProps {
  /** Where to navigate once the player confirms leaving. */
  exitHref: string;
  /** True for Ranked/Room matches with a real opponent - leaving forfeits. False for AI/Pass & Play. */
  isOnlineMatch: boolean;
  /** Called (and awaited) right before navigating away, e.g. to record the forfeit and take the loss. */
  onConfirmLeave?: () => Promise<void> | void;
}

/**
 * Replaces a plain "back to /play" link on active match screens with a
 * confirm-before-leaving flow (GDD: "if a player tries to go back, notify
 * warning message; if left, end match and result as forfeit awarding
 * other players a win"). Used on all four gameplay screens: Mindi/Gin
 * Rummy x AI-or-Pass&Play/Ranked-or-Room.
 */
export function LeaveMatchButton({ exitHref, isOnlineMatch, onConfirmLeave }: LeaveMatchButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const t = useTranslation();

  async function handleConfirm() {
    setLeaving(true);
    try {
      await onConfirmLeave?.();
    } finally {
      router.push(exitHref);
    }
  }

  return (
    <>
      <motion.button
        aria-label={t("a11y_leaveMatch")}
        whileTap={{ scale: 0.9 }}
        onClick={() => setConfirming(true)}
        className="p-2 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]"
      >
        <ArrowLeft size={20} className="text-[rgb(var(--gold))]" />
      </motion.button>

      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center px-6"
            onClick={() => !leaving && setConfirming(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card rounded-2xl p-6 w-full max-w-xs text-center space-y-4 border border-red-500/20"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                <AlertTriangle size={22} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-[rgb(var(--text-primary))] font-bold text-base">{t("leave_title")}</h3>
                <p className="text-[rgb(var(--c4))] text-xs mt-1">
                  {isOnlineMatch ? t("leave_onlineDesc") : t("leave_casualDesc")}
                </p>
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setConfirming(false)}
                  disabled={leaving}
                  className="flex-1 py-2.5 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--text-primary))] text-sm font-medium disabled:opacity-50"
                >
                  {t("leave_continuePlaying")}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleConfirm}
                  disabled={leaving}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold disabled:opacity-50"
                >
                  {leaving ? t("leave_leaving") : t("leave_confirm")}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
