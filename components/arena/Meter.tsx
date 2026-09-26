/**
 * The progress bar: lime by default, blue for anything that isn't the
 * player's own progress. `.meter` on the boards, with `.b` (blue), `.seg`
 * (notched into segments) and `.thin` as modifiers.
 *
 * It renders a real `role="progressbar"` with its values, because the
 * boards draw progress as pure colour and a screen reader would otherwise
 * get nothing at all.
 */
export type MeterProps = {
  /** 0-1. Clamped, so a stale value can't overflow the track. */
  value: number;
  tone?: "lime" | "blue";
  /** Notch the fill into segments, as the rank meter does. */
  segmented?: boolean;
  /** 6px instead of 10px. */
  thin?: boolean;
  /** Describes what is progressing, e.g. "Trophies to Platinum". */
  label: string;
  /** Spoken instead of a bare percentage, e.g. "58 of 75 trophies". */
  valueText?: string;
  className?: string;
};

export function Meter({ value, tone = "lime", segmented = false, thin = false, label, valueText, className = "" }: MeterProps) {
  const pct = Math.round(Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)) * 100);
  const classes = ["meter", tone === "blue" && "b", segmented && "seg", thin && "thin", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      className={classes}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      aria-valuetext={valueText}
    >
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}
