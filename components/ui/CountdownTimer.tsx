"use client";

import { motion } from "framer-motion";
import { useCountdown } from "@/hooks/useCountdown";

interface CountdownTimerProps {
  targetDate: Date;
  label?: string;
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        key={value}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-14 h-14 bg-[rgb(var(--c2))] rounded-xl border border-[rgb(var(--gold)/20%)] flex items-center justify-center"
      >
        <span className="text-2xl font-bold text-[rgb(var(--gold))]">
          {value.toString().padStart(2, "0")}
        </span>
      </motion.div>
      <span className="text-[10px] text-[rgb(var(--c4))] uppercase tracking-wider mt-1">{label}</span>
    </div>
  );
}

export function CountdownTimer({ targetDate, label }: CountdownTimerProps) {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(targetDate);

  if (isExpired) {
    return (
      <div className="text-center py-4">
        <p className="text-[rgb(var(--gold))] font-semibold">Event has started!</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {label && (
        <p className="text-xs text-[rgb(var(--c4))] uppercase tracking-wider mb-3 text-center">{label}</p>
      )}
      <div className="flex items-center justify-center gap-3">
        <TimeUnit value={days} label="Days" />
        <span className="text-[rgb(var(--gold))] text-2xl font-light -mt-4">:</span>
        <TimeUnit value={hours} label="Hours" />
        <span className="text-[rgb(var(--gold))] text-2xl font-light -mt-4">:</span>
        <TimeUnit value={minutes} label="Mins" />
        <span className="text-[rgb(var(--gold))] text-2xl font-light -mt-4">:</span>
        <TimeUnit value={seconds} label="Secs" />
      </div>
    </div>
  );
}
