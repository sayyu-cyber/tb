"use client";

import { useState, useEffect } from "react";
import { LeaderboardEntry } from "@/types";

// Mock data for demo - replace with Firestore query
const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, username: "DhivehiKing", trophies: 2847, avatar: "" },
  { rank: 2, username: "CardMaster99", trophies: 2653, avatar: "" },
  { rank: 3, username: "MindiPro", trophies: 2512, avatar: "" },
  { rank: 4, username: "RummyAce", trophies: 2341, avatar: "" },
  { rank: 5, username: "IslandPlayer", trophies: 2198, avatar: "" },
  { rank: 6, username: "ThaasChampion", trophies: 2087, avatar: "" },
  { rank: 7, username: "GoldenHand", trophies: 1956, avatar: "" },
  { rank: 8, username: "MaldivesPro", trophies: 1843, avatar: "" },
  { rank: 9, username: "CardShark", trophies: 1721, avatar: "" },
  { rank: 10, username: "SeaBreeze", trophies: 1654, avatar: "" },
];

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call - replace with Firestore query
    const fetchLeaderboard = async () => {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setEntries(mockLeaderboard);
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  return { entries, loading };
}
