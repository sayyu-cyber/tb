"use client";
import { cn } from "@/lib/utils";

/**
 * A segmented control; the active option is white with black text
 * (design/arena/README.md "Components").
 *
 * Built from real buttons with `aria-pressed` rather than radio inputs,
 * because these switch a view immediately rather than staging a choice for
 * submission — a radio group would promise a form that never arrives.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers, e.g. "Sort hand". */
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("ar-seg", className)} role="group" aria-label={label}>
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
