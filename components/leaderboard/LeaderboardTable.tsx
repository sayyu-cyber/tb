"use client";

import type { LeaderboardEntry } from "@/types";
import { LeaderboardRow } from "./LeaderboardRow";

/** The board's table: a header row of labels, then one `.lrow` per player. */
export function LeaderboardTable({ entries, currentUid }: { entries: LeaderboardEntry[]; currentUid?: string }) {
  return (
    <div className="lb-table" role="table" aria-label="Leaderboard">
      <div className="lrow head lbl" role="row">
        <span role="columnheader">#</span>
        <span role="columnheader">Player</span>
        <span role="columnheader">Matches</span>
        <span role="columnheader">Wins</span>
        <span role="columnheader">Win Rate</span>
        <span role="columnheader" style={{ textAlign: "right" }}>Trophies</span>
      </div>
      {entries.map((entry) => (
        <LeaderboardRow key={entry.uid} entry={entry} isCurrent={entry.uid === currentUid} />
      ))}
    </div>
  );
}
