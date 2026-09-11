"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, AlertTriangle, Play, LogOut } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/Button";

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
 * pause-menu-style confirm flow (GDD: "if a player tries to go back, notify
 * warning message; if left, end match and result as forfeit awarding other
 * players a win"). Styled as an in-game pause card - Resume as the primary
 * action, Leave Match as the destructive one below it, with an explicit
 * forfeit/loss warning - rather than a generic system alert, so it reads as
 * part of the game rather than a browser-style popup. Used on all four
 * gameplay screens: Mindi/Gin Rummy x AI-or-Pass&Play/Ranked-or-Room.
 */
export function LeaveMatchButton({ exitHref, isOnlineMatch, onConfirmLeave }: LeaveMatchButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const t = useTranslation();

  // The game table uses transform/filter/blur effects for its neon look
  // (ArenaFelt/ArenaTable), and any of those on an ancestor redefines the
  // containing block for a `position: fixed` child - so without a portal
  // this dialog was sizing/positioning itself relative to the table, not
  // the real viewport. Rendering it into document.body via a portal
  // escapes that entirely. Guarded by `mounted` since document.body isn't
  // available during the static export's server render.
  useEffect(() => setMounted(true), []);

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
        <ArrowLeft size={20} className="text-[rgb(var(--gold-ink))]" />
      </motion.button>

      {mounted && createPortal(
        <AnimatePresence>
          {confirming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center px-6"
              onClick={() => !leaving && setConfirming(false)}
            >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card premium-border relative overflow-hidden rounded-2xl p-6 w-full max-w-xs text-center space-y-5"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 h-32 w-32 rounded-full bg-[rgb(var(--gold)/10%)] blur-2xl"
              />

              {/* Pause-menu header, not an alert - this is the game itself
                  offering to pause, not the browser interrupting it. */}
              <div className="relative">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[rgb(var(--c4))]">
                  {t("leave_pausedLabel")}
                </p>
                <h3 className="text-[rgb(var(--text-primary))] font-black text-lg mt-1">{t("leave_title")}</h3>
              </div>

              {/* Forfeit/loss warning - the one thing this dialog exists to
                  make unmissable before the player commits to leaving. */}
              <div className="relative flex items-start gap-2.5 rounded-xl bg-[rgb(var(--coral)/10%)] border border-[rgb(var(--coral)/30%)] p-3 text-left">
                <AlertTriangle size={16} className="text-[rgb(var(--coral-ink))] shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-[rgb(var(--coral-ink))] text-xs leading-snug">
                  {isOnlineMatch ? t("leave_onlineDesc") : t("leave_casualDesc")}
                </p>
              </div>

              <div className="relative flex flex-col gap-2.5">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => setConfirming(false)}
                  disabled={leaving}
                >
                  <Play size={16} aria-hidden="true" />
                  {t("leave_continuePlaying")}
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={handleConfirm}
                  loading={leaving}
                >
                  <LogOut size={16} aria-hidden="true" />
                  {t("leave_confirm")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
