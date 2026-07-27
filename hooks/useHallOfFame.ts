"use client";

import { useCallback, useEffect, useState } from "react";
import { getHallOfFame, HallOfFameEntry } from "@/lib/hallOfFame";

export function useHallOfFame() {
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHallOfFame = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await getHallOfFame();
      setEntries(results);
    } catch (err) {
      console.error("Failed to load Hall of Fame:", err);
      setError("Couldn't load the Hall of Fame. Please try again.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHallOfFame();
  }, [fetchHallOfFame]);

  return { entries, loading, error, refresh: fetchHallOfFame };
}
