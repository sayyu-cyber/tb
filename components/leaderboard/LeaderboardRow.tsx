"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import { LeaderboardAvatar } from "./LeaderboardAvatar";
import { useTranslation } from "@/hooks/useTranslation";
import type { LeaderboardEntry } from "@/types";

/**
 * One ranking row, rendered as a real <tr> so the table stays semantic for
 * assistive tech (the brief asked for this explicitly).
 *
 * The current player is marked three ways, not just colour: a gold outline,
 * a visible "YOU" chip, and aria-current. Colour alone would fail the
 * accessibility requirement in §37.
 *
 * Stat cells fall back to an em dash rather than a fabricated zero when a
 * player has never played - "0%" reads as a real measured win rate, "—"
 * correctly reads as "no data".
 */
export function LeaderboardRow({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}) {
  const t = useTranslation();
  const played = entry.totalMatches ?? 0;
  const hasPlayed = played > 0;

  return (
    <tr
      className="lb-row"
      data-you={isCurrentUser ? "true" : undefined}
      data-top={entry.rank <= 3 ? entry.rank : undefined}
      aria-current={isCurrentUser ? "true" : undefined}
      id={isCurrentUser ? "lb-current-user" : undefined}
    >
      <td className="lb-cell-rank">
        <span className="lb-rank-number">{entry.rank}</span>
      </td>

      <td className="lb-cell-player">
        <Link href={`/player?uid=${encodeURIComponent(entry.uid)}`} className="lb-player-link">
          <LeaderboardAvatar
            name={entry.username}
            photoURL={entry.avatar}
            presetId={entry.avatarPreset}
            size={36}
          />
          <span className="lb-player-text">
            <span className="lb-player-name">{entry.username}</span>
            {entry.currentRank && <span className="lb-player-tier">{entry.currentRank}</span>}
          </span>
          {isCurrentUser && <span className="lb-you-chip">{t("leaderboard_you")}</span>}
        </Link>
      </td>

      <td className="lb-cell-num lb-hide-sm">{hasPlayed ? played.toLocaleString() : "—"}</td>
      <td className="lb-cell-num lb-hide-sm">{hasPlayed ? (entry.wins ?? 0).toLocaleString() : "—"}</td>
      <td className="lb-cell-num lb-hide-md">{hasPlayed ? `${entry.winPercentage ?? 0}%` : "—"}</td>

      <td className="lb-cell-trophies">
        <Trophy size={14} aria-hidden="true" />
        {entry.trophies.toLocaleString()}
      </td>
    </tr>
  );
}
