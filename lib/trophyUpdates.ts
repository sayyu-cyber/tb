import { doc, updateDoc, increment, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { TROPHY_WIN, TROPHY_LOSS, getRankFromTrophies } from "@/constants/ranks";

export async function updateMatchResult(
  userId: string,
  isWin: boolean,
  gameType: "mindi" | "gin-rummy"
) {
  const playerRef = doc(db, "players", userId);
  const trophyChange = isWin ? TROPHY_WIN : TROPHY_LOSS;

  try {
    const snap = await getDoc(playerRef);

    if (!snap.exists()) {
      // Initialize if new
      await setDoc(playerRef, {
        trophies: Math.max(0, trophyChange),
        wins: isWin ? 1 : 0,
        losses: isWin ? 0 : 1,
        totalMatches: 1,
        currentRank: getRankFromTrophies(Math.max(0, trophyChange)),
        highestRank: getRankFromTrophies(Math.max(0, trophyChange)),
        favoriteGame: gameType,
        updatedAt: serverTimestamp(),
      });
      return { newTrophies: Math.max(0, trophyChange), rankChanged: true };
    }

    const data = snap.data();
    const currentTrophies = (data.trophies || 0) + trophyChange;
    const newTrophies = Math.max(0, currentTrophies);
    const oldRank = data.currentRank || "Bronze";
    const newRank = getRankFromTrophies(newTrophies);
    const rankChanged = oldRank !== newRank;
    const highestRank = data.highestRank || oldRank;
    const newHighestRank = [oldRank, newRank, highestRank].sort(
      (a, b) => {
        const order = ["Bronze", "Silver", "Gold", "Platinum"];
        return order.indexOf(b) - order.indexOf(a);
      }
    )[0];

    await updateDoc(playerRef, {
      trophies: increment(trophyChange),
      wins: increment(isWin ? 1 : 0),
      losses: increment(isWin ? 0 : 1),
      totalMatches: increment(1),
      currentRank: newRank,
      highestRank: newHighestRank,
      winPercentage: Math.round(
        (((data.wins || 0) + (isWin ? 1 : 0)) / ((data.totalMatches || 0) + 1)) * 100
      ),
      updatedAt: serverTimestamp(),
    });

    return { newTrophies, rankChanged, newRank, oldRank };
  } catch (error) {
    console.error("Failed to update match result:", error);
    throw error;
  }
}

export async function checkWeeklyReset(userId: string) {
  const playerRef = doc(db, "players", userId);
  const snap = await getDoc(playerRef);

  if (!snap.exists()) return;

  const data = snap.data();
  const lastReset = data.lastWeeklyReset?.toDate?.() || new Date(0);
  const now = new Date();
  const daysSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24);

  // Reset every Monday at 00:00
  if (daysSinceReset >= 7 && now.getDay() === 1) {
    await updateDoc(playerRef, {
      weeklyMatches: 0,
      lastWeeklyReset: serverTimestamp(),
    });
  }
}
