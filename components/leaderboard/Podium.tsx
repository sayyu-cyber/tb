"use client";

import { Crown, Trophy } from "lucide-react";
import type { LeaderboardEntry } from "@/types";
import { RankLabel } from "@/components/arena";
import { getRankFromTrophies } from "@/constants/ranks";

/**
 * The top three — the Leaderboard board's `.podium`
 * (design/arena/screens/app/app-07-leaderboard.jpg).
 *
 * A lit stage with three plinths: gold in the middle and tallest, silver
 * left, bronze right. Each player's avatar takes the metal of their plinth,
 * and the winner gets the crown above theirs.
 *
 * With fewer than three players it draws only the places that exist, rather
 * than padding with blanks - a new board with one player should show one
 * player, not two empty boxes.
 */

/** Board order: 2nd on the left, 1st centre, 3rd on the right. */
const PLACES = [
  { place: 2, offset: -330, plinth: "p2", size: 62, metal: "linear-gradient(135deg, #FFFFFF, #B9C2C9)" },
  { place: 1, offset: -110, plinth: "p1", size: 76, metal: "linear-gradient(135deg, #FFE58A, #E0B52E)" },
  { place: 3, offset: 110, plinth: "p3", size: 62, metal: "linear-gradient(135deg, #F0B587, #B0703A)" },
];

export function Podium({ topThree, currentUid }: { topThree: LeaderboardEntry[]; currentUid?: string }) {
  return (
    <section className="podium" aria-label="Top three">
      <div className="spot" aria-hidden="true" style={{ left: "50%", marginLeft: "-110px" }} />
      {PLACES.map(({ place, offset, plinth, size, metal }) => {
        const entry = topThree[place - 1];
        if (!entry) return null;
        const tier = entry.currentRank || getRankFromTrophies(entry.trophies);
        const matches = entry.totalMatches ?? 0;
        const rate = entry.winPercentage;
        return (
          <div className="pl" key={place} style={{ left: "50%", marginLeft: `${offset}px` }}>
            <div className="who">
              {place === 1 && <Crown aria-hidden="true" className="podium-crown" />}
              <span
                className="bigava"
                aria-hidden="true"
                style={{
                  width: size, height: size, fontSize: Math.round(size * 0.42), background: metal,
                  ...(place === 1
                    ? { boxShadow: "0 0 0 3px #0B0B0F, 0 0 0 5px #FFC940, 0 0 30px rgba(255,201,64,.45)" }
                    : {}),
                }}
              >
                {entry.username.charAt(0).toUpperCase()}
              </span>
              <b>
                {entry.username}
                {entry.uid === currentUid && <span className="sr-only"> (you)</span>}
              </b>
              <RankLabel tier={tier} />
              <span className="tro"><Trophy aria-hidden="true" />{entry.trophies}</span>
              <span className="muted2">
                {matches} {matches === 1 ? "Match" : "Matches"}
                {rate !== undefined ? ` · ${rate}% Win Rate` : ""}
              </span>
            </div>
            <div className={`plinth ${plinth}`} aria-hidden="true">{place}</div>
          </div>
        );
      })}
    </section>
  );
}
