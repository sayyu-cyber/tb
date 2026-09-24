"use client";
import { useEffect, useState } from "react";

/**
 * Countdown for a turn, driven by an absolute deadline rather than a local
 * countdown number.
 *
 * The deadline matters: in an online match it comes from the match document,
 * so both players see the same clock. A local "seconds remaining" counter
 * would drift apart between clients, and would also jump whenever a tab is
 * backgrounded and its timers are throttled.
 *
 * Display only - whoever owns the turn is responsible for acting on a
 * timeout. This component never fires the auto-play itself, so two mounted
 * copies can never double-fire it.
 */
export function TurnClock({ deadline, seconds, active }: { deadline: number | null; seconds: number; active: boolean }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [deadline]);

  if (!deadline) return null;
  const remaining = Math.max(0, deadline - now);
  const left = Math.ceil(remaining / 1000);
  const fraction = Math.max(0, Math.min(1, remaining / (seconds * 1000)));

  return (
    <p
      className="turn-clock"
      data-urgent={active && left <= 5 ? "true" : undefined}
      data-active={active ? "true" : undefined}
      style={{ "--remaining": fraction } as React.CSSProperties}
    >
      {/* Only the player on the clock gets a live announcement; announcing the
          opponent's countdown every second would flood a screen reader. */}
      <span aria-live={active && left <= 5 ? "assertive" : "off"}>{left}s</span>
      <i aria-hidden="true" />
    </p>
  );
}
