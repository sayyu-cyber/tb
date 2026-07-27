// lib/hallOfFame.ts
//
// Hall of Fame (GDD Version 1.5): a permanent record of the best players,
// distinct from the regular Leaderboard (hooks/useLeaderboard.ts), which
// ranks players by their *current* trophies - a number that goes down
// after a loss. The Hall of Fame instead ranks by `peakTrophies`
// (lib/trophyUpdates.ts), the highest trophy count a player has ever
// reached, which only ever increases. That makes it a fair "best ever"
// record without needing a season-end snapshot job.
//
// Query uses a single Firestore-side orderBy (no composite index needed),
// same pattern used everywhere else in this project.

import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface HallOfFameEntry {
  uid: string;
  displayName: string;
  peakTrophies: number;
  highestRank: string;
  wins: number;
  totalMatches: number;
  favoriteGame: string | null;
}

const HALL_OF_FAME_SIZE = 50;

export async function getHallOfFame(limitCount = HALL_OF_FAME_SIZE): Promise<HallOfFameEntry[]> {
  const q = query(collection(db, "players"), orderBy("peakTrophies", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        displayName: data.displayName || "Player",
        peakTrophies: typeof data.peakTrophies === "number" ? data.peakTrophies : data.trophies || 0,
        highestRank: data.highestRank || "Bronze",
        wins: data.wins || 0,
        totalMatches: data.totalMatches || 0,
        favoriteGame: data.favoriteGame || null,
      };
    })
    // Players who last played before this field existed have peakTrophies
    // === 0 even if they have trophies - filter those out rather than show
    // a misleading zero at the top of an empty section.
    .filter((entry) => entry.peakTrophies > 0 || entry.totalMatches > 0);
}
