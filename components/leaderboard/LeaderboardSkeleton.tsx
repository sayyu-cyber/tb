"use client";

/**
 * Loading placeholders that hold the real layout - podium, side cards and
 * rows all occupy the same space they will once data arrives, so the page
 * does not jump when it loads. The brief explicitly rules out a single
 * centred spinner for this reason.
 */
export function PodiumSkeleton() {
  return (
    <div className="lb-podium" aria-hidden="true">
      {[1, 0, 2].map((place) => (
        <div key={place} className="lb-podium-slot lb-skeleton-slot" data-place={place + 1}>
          <div className="lb-skeleton lb-skeleton-card" />
          <div className="lb-podium-plinth" />
        </div>
      ))}
    </div>
  );
}

export function SideCardSkeleton() {
  return <div className="lb-skeleton lb-skeleton-side" aria-hidden="true" />;
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="lb-table-wrap" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="lb-skeleton lb-skeleton-row" />
      ))}
    </div>
  );
}
