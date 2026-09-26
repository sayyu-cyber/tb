"use client";

import { Trophy } from "lucide-react";
import type { LeaderboardEntry } from "@/types";
import { Avatar, RankLabel } from "@/components/arena";
import { getRankFromTrophies } from "@/constants/ranks";

/**
 * One row of the table — the Leaderboard board's `.lrow`
 * (design/arena/screens/app/app-07-leaderboard.jpg).
 *
 * Your own row is ringed lime and carries a "You" pill, and keeps the id
 * the page scrolls to.
 */
export function LeaderboardRow({ entry, isCurrent }: { entry: LeaderboardEntry; isCurrent: boolean }) {
  const tier = entry.currentRank || getRankFromTrophies(entry.trophies);
  const matches = entry.totalMatches;
  const wins = entry.wins;
  const rate = entry.winPercentage;
  return (
    <div className={`lrow ${isCurrent ? "me" : ""}`.trim()} id={isCurrent ? "lb-current-user" : undefined}>
      <span className="pos">{entry.rank}</span>
      <span className="pl2">
        <Avatar name={entry.username} src={entry.avatar} seed={entry.uid} size={36} radius={9} />
        <span style={{ display: "flex", flexDirection: "column", gap: "5px", minWidth: 0 }}>
          <b style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {entry.username}
            {isCurrent && <span className="pill lime lrow-you">You</span>}
          </b>
          <RankLabel tier={tier} />
        </span>
      </span>
      {/* A figure the board does not have yet reads as a dash, never a zero. */}
      <span className="n">{matches ?? "--"}</span>
      <span className="n">{wins ?? "--"}</span>
      <span className="n">{rate === undefined ? "--" : `${rate}%`}</span>
      <span className="t"><Trophy aria-hidden="true" />{entry.trophies}</span>
    </div>
  );
}
