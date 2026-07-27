// lib/publicProfile.ts
//
// Read-only public view of another player's stats - closes the gap noted
// when Friends shipped: tapping a friend (or a Leaderboard/Hall of Fame
// row) didn't open anything. Reuses the existing `players/{uid}` document
// and its open "any signed-in user can read" rule - no new Firestore
// rules needed.

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface PublicProfile {
  uid: string;
  displayName: string;
  trophies: number;
  currentRank: string;
  highestRank: string;
  peakTrophies: number;
  wins: number;
  losses: number;
  totalMatches: number;
  winPercentage: number;
  favoriteGame: string | null;
}

export async function getPublicProfile(uid: string): Promise<PublicProfile | null> {
  const snap = await getDoc(doc(db, "players", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    displayName: data.displayName || "Player",
    trophies: data.trophies || 0,
    currentRank: data.currentRank || "Bronze",
    highestRank: data.highestRank || "Bronze",
    peakTrophies: data.peakTrophies || data.trophies || 0,
    wins: data.wins || 0,
    losses: data.losses || 0,
    totalMatches: data.totalMatches || 0,
    winPercentage: data.winPercentage || 0,
    favoriteGame: data.favoriteGame || null,
  };
}
