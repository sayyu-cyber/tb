/**
 * The Arena tab strip: a rounded tray of real <button>s, the active one a
 * lime tile with black text. `.tabs` on the boards.
 *
 * Buttons, not links or divs, and the selected one carries
 * `aria-pressed="true"` - which is also what the CSS keys off, so the
 * visual state cannot drift from the accessible one.
 */
import type { ReactNode } from "react";

export type TabItem<T extends string = string> = {
  id: T;
  label: ReactNode;
  /** A small count badge, e.g. 2 pending friend requests. */
  count?: number;
  /** Leading icon. */
  icon?: ReactNode;
  /** Renders a "SOON" chip and disables the tab. */
  soon?: boolean;
  disabled?: boolean;
};

export type TabsProps<T extends string = string> = {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Names the group for screen readers, e.g. "Shop categories". */
  label: string;
  className?: string;
};

export function Tabs<T extends string = string>({ items, value, onChange, label, className = "" }: TabsProps<T>) {
  return (
    <div className={`tabs ${className}`.trim()} role="group" aria-label={label}>
      {items.map((item) => {
        const selected = item.id === value;
        const disabled = item.disabled || item.soon;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => !disabled && onChange(item.id)}
            data-flat
          >
            {item.icon}
            <span>{item.label}</span>
            {item.count !== undefined && item.count > 0 ? <span className="n">{item.count}</span> : null}
            {item.soon ? <span className="soon">SOON</span> : null}
          </button>
        );
      })}
    </div>
  );
}
