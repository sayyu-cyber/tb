import { doc, updateDoc, increment, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { TROPHY_WIN, TROPHY_LOSS, getRankFromTrophies } from "@/constants/ranks";

export interface MatchResult {
  newTrophies: number;
  rankChanged: boolean;
  newRank: string;
  oldRank: string;
}

/**
 * ISO-ish week key (Monday date, YYYY-MM-DD) used to lazily reset each
 * player's weekly Weekend League standing the next time THEY play, rather
 * than needing a scheduled Cloud Function to reset everyone in lockstep at
 * a fixed instant. A small trade-off (a player's "week" only resets when
 * they next play) for a Firestore-only backend.
 */
export function getWeekStartKey(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = (day + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export async function updateMatchResult(
  userId: string,
  isWin: boolean,
  gameType: "mindi" | "gin-rummy",
  trophyMultiplier = 1
): Promise<MatchResult> {
  const playerRef = doc(db, "players", userId);
  const trophyChange = (isWin ? TROPHY_WIN : TROPHY_LOSS) * trophyMultiplier;

  try {
    const snap = await getDoc(playerRef);

    const thisWeek = getWeekStartKey();

    if (!snap.exists()) {
      const initialTrophies = Math.max(0, trophyChange);
      const initialRank = getRankFromTrophies(initialTrophies);

      await setDoc(playerRef, {
        trophies: initialTrophies,
        wins: isWin ? 1 : 0,
        losses: isWin ? 0 : 1,
        totalMatches: 1,
        currentRank: initialRank,
        highestRank: initialRank,
        favoriteGame: gameType,
        weeklyTrophies: Math.max(0, trophyChange),
        weekStart: thisWeek,
        updatedAt: serverTimestamp(),
      });

      return {
        newTrophies: initialTrophies,
        rankChanged: true,
        newRank: initialRank,
        oldRank: "Unranked",
      };
    }

    const data = snap.data();
    const currentTrophies = (data.trophies || 0) + trophyChange;
    const newTrophies = Math.max(0, currentTrophies);
    const oldRank = data.currentRank || "Bronze";
    const newRank = getRankFromTrophies(newTrophies);
    const rankChanged = oldRank !== newRank;

    const highestRank = data.highestRank || oldRank;
    const rankOrder = ["Bronze", "Silver", "Gold", "Platinum"];
    const newHighestRank = rankOrder.indexOf(newRank) > rankOrder.indexOf(highestRank)
      ? newRank
      : highestRank;

    const totalMatches = (data.totalMatches || 0) + 1;
    const wins = (data.wins || 0) + (isWin ? 1 : 0);

    // Lazy weekly reset: if this player's last recorded week differs from
    // the current one, their weekly count starts fresh from this match.
    const isNewWeek = data.weekStart !== thisWeek;
    const newWeeklyTrophies = Math.max(0, (isNewWeek ? 0 : data.weeklyTrophies || 0) + trophyChange);

    await updateDoc(playerRef, {
      trophies: increment(trophyChange),
      wins: increment(isWin ? 1 : 0),
      losses: increment(isWin ? 0 : 1),
      totalMatches: increment(1),
      currentRank: newRank,
      highestRank: newHighestRank,
      winPercentage: Math.round((wins / totalMatches) * 100),
      weeklyTrophies: newWeeklyTrophies,
      weekStart: thisWeek,
      updatedAt: serverTimestamp(),
    });

    return { 
      newTrophies, 
      rankChanged, 
      newRank,
      oldRank,
    };
  } catch (error) {
    console.error("Failed to update match result:", error);
    throw error;
  }
}
