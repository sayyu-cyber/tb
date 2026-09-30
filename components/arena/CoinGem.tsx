import { formatCoins } from "@/lib/wallet";
/**
 * The coin, as a lime gem: a rounded square turned 45 degrees with a soft
 * glow. `.gem` on the boards, `.gem.sm` at the smaller size.
 *
 * It replaces the gold circular "T" coin the app used before. Purely
 * decorative - the figure beside it carries the meaning - so it is hidden
 * from screen readers.
 */
export function CoinGem({ small = false, className = "" }: { small?: boolean; className?: string }) {
  return <i className={`gem ${small ? "sm" : ""} ${className}`.trim()} aria-hidden="true" />;
}

/**
 * The gem with a figure beside it, in the top bar's tray. `.coins` on the
 * boards; the optional "+" button is the board's `.add`.
 */
export function CoinCount({
  coins,
  onAdd,
  addLabel = "Buy coins",
  className = "",
}: {
  coins: number;
  onAdd?: () => void;
  addLabel?: string;
  className?: string;
}) {
  return (
    <div className={`coins ${className}`.trim()}>
      <CoinGem />
      <span className="tnum">{formatCoins(coins)}</span>
      {onAdd ? (
        <button type="button" className="add" onClick={onAdd} aria-label={addLabel} title={addLabel}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
