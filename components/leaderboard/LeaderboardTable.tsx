"use client";

import { LeaderboardRow } from "./LeaderboardRow";
import { useTranslation } from "@/hooks/useTranslation";
import type { LeaderboardEntry } from "@/types";

/**
 * The ranking table.
 *
 * Semantic <table> markup with a real <thead>, so screen readers announce
 * "Trophies, column 6" rather than a wall of divs. The narrower columns are
 * dropped by CSS at small widths (.lb-hide-sm / .lb-hide-md) instead of being
 * conditionally unmounted, which keeps the header and body in lockstep and
 * avoids a layout jump on resize.
 *
 * Rank order is exactly as returned by the hook. No column is sortable by
 * design: re-ordering the table would imply a different official ranking,
 * which the brief explicitly warns against.
 */
export function LeaderboardTable({
  entries,
  currentUid,
}: {
  entries: LeaderboardEntry[];
  currentUid?: string;
}) {
  const t = useTranslation();

  return (
    <div className="lb-table-wrap">
      <table className="lb-table">
        <caption className="sr-only">{t("leaderboard_tableCaption")}</caption>
        <thead>
          <tr>
            <th scope="col" className="lb-cell-rank">
              #
            </th>
            <th scope="col">{t("leaderboard_player")}</th>
            <th scope="col" className="lb-cell-num lb-hide-sm">
              {t("leaderboard_matches")}
            </th>
            <th scope="col" className="lb-cell-num lb-hide-sm">
              {t("leaderboard_wins")}
            </th>
            <th scope="col" className="lb-cell-num lb-hide-md">
              {t("leaderboard_winRate")}
            </th>
            <th scope="col" className="lb-cell-trophies">
              {t("leaderboard_trophies")}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <LeaderboardRow key={entry.uid} entry={entry} isCurrentUser={entry.uid === currentUid} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
