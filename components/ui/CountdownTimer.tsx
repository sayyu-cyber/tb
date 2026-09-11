"use client";

import { motion } from "framer-motion";
import { useCountdown } from "@/hooks/useCountdown";

interface CountdownTimerProps {
  targetDate: Date;
  label?: string;
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    // flex-1 + min-w-0 (capped by the parent's max-width) instead of a
    // fixed box, so a 4-unit row shrinks to fit a narrow card instead of
    // overflowing it - it was clipping past the Weekend League card's
    // right edge at md/lg widths.
    <div className="flex flex-1 min-w-0 flex-col items-center">
      <motion.div
        key={value}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[3.5rem] aspect-square bg-[rgb(var(--c2))] rounded-xl border border-[rgb(var(--gold)/20%)] flex items-center justify-center"
      >
        <span className="text-lg sm:text-2xl font-bold text-[rgb(var(--gold-ink))]">
          {value.toString().padStart(2, "0")}
        </span>
      </motion.div>
      <span className="text-[9px] sm:text-[10px] text-white/70 uppercase tracking-wider mt-1 truncate">{label}</span>
    </div>
  );
}

export function CountdownTimer({ targetDate, label }: CountdownTimerProps) {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(targetDate);

  if (isExpired) {
    return (
      <div className="text-center py-4">
        <p className="text-white font-semibold">Event has started!</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {label && (
        <p className="text-xs text-white/70 uppercase tracking-wider mb-3 text-center">{label}</p>
      )}
      <div className="flex items-start justify-center gap-1 sm:gap-3">
        <TimeUnit value={days} label="Days" />
        <span className="shrink-0 text-white/70 text-base sm:text-2xl font-light pt-2.5 sm:pt-3.5">:</span>
        <TimeUnit value={hours} label="Hours" />
        <span className="shrink-0 text-white/70 text-base sm:text-2xl font-light pt-2.5 sm:pt-3.5">:</span>
        <TimeUnit value={minutes} label="Mins" />
        <span className="shrink-0 text-white/70 text-base sm:text-2xl font-light pt-2.5 sm:pt-3.5">:</span>
        <TimeUnit value={seconds} label="Secs" />
      </div>
    </div>
  );
}
