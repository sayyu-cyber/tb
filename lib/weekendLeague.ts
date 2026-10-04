import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getWeekStartKey } from "@/lib/competitionTime";

export { getLeagueWindow, formatLeagueBoundary } from "@/lib/competitionTime";
export type { LeagueWindow } from "@/lib/competitionTime";

export const QUALIFYING_RANKS = ["Silver", "Gold", "Platinum"];

export interface WeeklyStanding {
  uid: string;
  displayName: string;
  weeklyTrophies: number;
  currentRank: string;
}

export function isQualified(rank: string): boolean {
  return QUALIFYING_RANKS.includes(rank);
}

/** Live UTC-week standings, not a finalized snapshot of the Maldives league window. */
export async function getWeeklyStandings(limitCount = 50): Promise<WeeklyStanding[]> {
  if (!Number.isFinite(limitCount) || limitCount < 1) return [];
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("ranked_progress")
    .select("user_id,weekly_trophies,current_rank,profiles!inner(display_name)")
    .eq("week_start", getWeekStartKey())
    .in("current_rank", QUALIFYING_RANKS)
    .order("weekly_trophies", { ascending: false })
    .order("user_id", { ascending: true })
    .limit(Math.floor(limitCount));
  if (error) throw error;
  return ((data ?? []) as {
    user_id: string;
    weekly_trophies: number;
    current_rank: string;
    profiles: { display_name: string | null } | { display_name: string | null }[];
  }[]).map((row) => ({
    uid: row.user_id,
    displayName: (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles)?.display_name || "Player",
    weeklyTrophies: row.weekly_trophies,
    currentRank: row.current_rank,
  }));
}
