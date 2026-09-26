/**
 * The header every Arena screen opens with: a big uppercase title, an
 * optional line of supporting copy, and a right-hand slot for tabs, a
 * filter or a button.
 *
 * `.phead`, `.phead h1` and `.sub` are the board's classes. The title uses
 * `.ar-h1` for the display face and tracking; `.phead h1` supplies the
 * board's 56px size, so the two together match the artboard.
 *
 * There is already a components/layout/PageHeader.tsx from the previous
 * design. This one is the Arena replacement and lives beside the other
 * shared pieces; screens import it from "@/components/arena".
 */
import type { ReactNode } from "react";

export type PageHeaderProps = {
  title: ReactNode;
  /** One line under the title. Omit it and nothing is rendered. */
  sub?: ReactNode;
  /** Right-hand slot: tabs, a select, a primary action. */
  children?: ReactNode;
  /** Small label above the title, e.g. "THE HOME OF MALDIVIAN CARD GAMES". */
  eyebrow?: ReactNode;
  className?: string;
};

export function PageHeader({ title, sub, children, eyebrow, className = "" }: PageHeaderProps) {
  return (
    <header className={`phead ${className}`.trim()}>
      <div className="min-w-0">
        {eyebrow ? <div className="lbl dash">{eyebrow}</div> : null}
        <h1 className="ar-h1">{title}</h1>
        {sub ? <p className="sub">{sub}</p> : null}
      </div>
      {children}
    </header>
  );
}
