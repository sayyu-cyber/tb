"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  /**
   * Show a transient message. Replaces the blocking window.alert() calls
   * the Shop used to make - those froze the page, ignored the app's theme
   * and language, and looked like a browser popup rather than part of the
   * app.
   */
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** How long a toast stays on screen before auto-dismissing. */
const DURATION_MS = 4000;

const STYLES: Record<ToastKind, { ring: string; icon: React.ReactNode }> = {
  success: {
    ring: "border-green-500/30 bg-green-500/10",
    icon: <CheckCircle2 size={16} className="text-green-400 shrink-0" />,
  },
  error: {
    ring: "border-red-500/30 bg-red-500/10",
    icon: <AlertTriangle size={16} className="text-red-400 shrink-0" />,
  },
  info: {
    ring: "border-[#D4AF37]/30 bg-[#D4AF37]/10",
    icon: <Info size={16} className="text-[#D4AF37] shrink-0" />,
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      // Date.now() alone can collide when two toasts fire in the same
      // millisecond (e.g. a failed action that also reports a reason), so
      // mix in a random suffix for a stable React key.
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Sits above the bottom nav (z-[60] there) and clears the safe area
          on notched phones. pointer-events-none on the stack so a toast
          never blocks a tap on the UI underneath; the dismiss button
          re-enables them for itself. */}
      <div
        className="fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 pointer-events-none"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: "spring", damping: 24, stiffness: 320 }}
              className={`glass-card pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 flex items-start gap-3 ${STYLES[toast.kind].ring}`}
            >
              {STYLES[toast.kind].icon}
              <p className="flex-1 text-[rgb(var(--text-primary))] text-sm leading-snug">{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                className="text-[rgb(var(--c4))] hover:text-[rgb(var(--text-primary))] transition-colors shrink-0"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside a ToastProvider");
  return ctx;
}
