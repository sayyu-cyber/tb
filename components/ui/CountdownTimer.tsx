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
        className="w-14 h-14 bg-[#1A1A1A] rounded-xl border border-[#D4AF37]/20 flex items-center justify-center"
      >
        <span className="text-2xl font-bold text-[#D4AF37]">
          {value.toString().padStart(2, "0")}
        </span>
      </motion.div>
      <span className="text-[10px] text-[#3A3A3A] uppercase tracking-wider mt-1">{label}</span>
    </div>
  );
}

export function CountdownTimer({ targetDate, label }: CountdownTimerProps) {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(targetDate);

  if (isExpired) {
    return (
      <div className="text-center py-4">
        <p className="text-[#D4AF37] font-semibold">Event has started!</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {label && (
        <p className="text-xs text-[#3A3A3A] uppercase tracking-wider mb-3 text-center">{label}</p>
      )}
      <div className="flex items-center justify-center gap-3">
        <TimeUnit value={days} label="Days" />
        <span className="text-[#D4AF37] text-2xl font-light -mt-4">:</span>
        <TimeUnit value={hours} label="Hours" />
        <span className="text-[#D4AF37] text-2xl font-light -mt-4">:</span>
        <TimeUnit value={minutes} label="Mins" />
        <span className="text-[#D4AF37] text-2xl font-light -mt-4">:</span>
        <TimeUnit value={seconds} label="Secs" />
      </div>
    </div>
  );
}
