import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ProfileMatch {
  id: string;
  game: "Mindi" | "Gin Rummy";
  mode: string;
  result: "Win" | "Loss" | "Draw" | "Unavailable";
  date: number;
  score: string;
}

/** Recent online records only; never presented as an all-time aggregate. */
export async function getProfileHistory(uid: string): Promise<ProfileMatch[]> {
  const snapshot = await getDocs(query(collection(db, "matches"), where("players", "array-contains", uid), orderBy("createdAt", "desc"), limit(50)));
  return snapshot.docs.flatMap(doc => {
    const match = doc.data();
    if (match.status !== "completed" || !Array.isArray(match.players) || !["mindi", "gin_rummy"].includes(match.gameType)) return [];
    const seat = match.players.indexOf(uid);
    if (seat < 0) return [];
    const mindi = match.gameType === "mindi";
    const outcome = mindi ? match.state?.outcome : match.state?.result;
    const winner = mindi ? outcome?.winner : outcome?.winnerUid;
    const own = mindi ? (seat % 2 === 0 ? "A" : "B") : uid;
    const known = mindi ? ["A", "B"].includes(winner) : match.players.includes(winner);
    const result = winner === "draw" ? "Draw" : !known ? "Unavailable" : winner === own ? "Win" : "Loss";
    const score = mindi && outcome?.tricksWon ? `${outcome.tricksWon[own]} : ${outcome.tricksWon[own === "A" ? "B" : "A"]} tricks` : typeof outcome?.score === "number" ? `${outcome.score} points` : "--";
    return [{ id: doc.id, game: mindi ? "Mindi" : "Gin Rummy", mode: match.pool === "casual" ? "Casual" : match.pool === "weekend" ? "Weekend League" : "Ranked", result, date: match.createdAt, score } as ProfileMatch];
  });
}
