"use client";

import { useEffect, useState } from "react";

/**
 * The gate's countdown ring — design/arena/boards/MRotate.dc.html (`.tring`).
 *
 * Two circles at r=12 in a 30x30 box: a faint track and a lime arc whose
 * `stroke-dasharray` is the board's 75.4 - the circumference - with the
 * offset eating into it as the turn runs out, and a 1s linear transition so
 * it sweeps rather than steps. `.tring svg` is already rotated -90deg in the
 * generated CSS, so it empties from the top.
 *
 * Driven by an absolute deadline, like components/game/TurnClock: a local
 * countdown would drift from the opponent's and would jump whenever the tab
 * was backgrounded and its timers throttled.
 *
 * Returns null without a deadline, which is not a placeholder - Mindi has no
 * turn clock in this app, so on a Mindi table there is genuinely nothing to
 * count down and the row shows the turn without a ring.
 */
const CIRCUMFERENCE = 75.4;

export function TurnRing({ deadline, seconds }: { deadline: number; seconds: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [deadline]);

  const remaining = Math.max(0, deadline - now);
  const left = Math.ceil(remaining / 1000);
  const fraction = Math.max(0, Math.min(1, remaining / (seconds * 1000)));

  return (
    <span className="tring">
      <svg viewBox="0 0 30 30" aria-hidden="true">
        <circle cx="15" cy="15" r="12" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="3" />
        <circle
          cx="15" cy="15" r="12" fill="none" stroke="#C6FF33" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <b>{left}</b>
    </span>
  );
}

/** Seconds left on a deadline, for the copy beside the ring. */
export function useSecondsLeft(deadline: number | null | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [deadline]);
  if (!deadline) return null;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
