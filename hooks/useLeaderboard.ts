"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LeaderboardEntry } from "@/types";

const LEADERBOARD_SIZE = 50;

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, "players"),
        orderBy("trophies", "desc"),
        limit(LEADERBOARD_SIZE)
      );
      const snap = await getDocs(q);
      const results: LeaderboardEntry[] = snap.docs.map((doc, index) => {
        const data = doc.data();
        return {
          rank: index + 1,
          uid: doc.id,
          username: data.displayName || "Player",
          trophies: typeof data.trophies === "number" ? data.trophies : 0,
          avatar: data.photoURL || "",
        };
      });
      setEntries(results);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
      setError("Couldn't load the leaderboard. Please try again.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { entries, loading, error, refresh: fetchLeaderboard };
}
