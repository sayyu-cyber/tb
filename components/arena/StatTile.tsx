/**
 * One figure in a run of them - 58 GOLD, 96 MATCHES, 54 WINS - with an
 * icon in a soft square. `.stat` from the Home board (styles/arena-shell.css).
 *
 * The divider is the tile's own left border, so a row is just tiles side by
 * side and the first one drops its rule.
 */
import type { ReactNode } from "react";

export function StatTile({
  icon,
  value,
  label,
  className = "",
}: {
  icon?: ReactNode;
  value: ReactNode;
  label: ReactNode;
  className?: string;
}) {
  return (
    <div className={`stat ${className}`.trim()}>
      {icon ? <span className="si" aria-hidden="true">{icon}</span> : null}
      <div>
        <b>{value}</b>
        <span>{label}</span>
      </div>
    </div>
  );
}

/** A row of StatTiles. Wraps rather than overflowing on a narrow window. */
export function StatRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-wrap items-center ${className}`.trim()}>{children}</div>;
}
