import { TROPHY_WIN, TROPHY_LOSS, getRankFromTrophies } from "@/constants/ranks";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { nowIso } from "@/lib/supabase/data";

export interface MatchResult {
  newTrophies: number;
  rankChanged: boolean;
  newRank: string;
  oldRank: string;
}

export function getWeekStartKey(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
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
  const supabase = getSupabaseBrowserClient();
  const trophyChange = (isWin ? TROPHY_WIN : TROPHY_LOSS) * trophyMultiplier;
  const thisWeek = getWeekStartKey();

  const [{ data: stats, error: statsError }, { data: ranked, error: rankedError }] = await Promise.all([
    supabase.from("player_stats").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("ranked_progress").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  if (statsError) throw statsError;
  if (rankedError) throw rankedError;

  const oldTrophies = ranked?.trophies ?? 0;
  const newTrophies = Math.max(0, oldTrophies + trophyChange);
  const oldRank = ranked?.current_rank ?? "Bronze";
  const newRank = getRankFromTrophies(newTrophies);
  const rankOrder = ["Bronze", "Silver", "Gold", "Platinum"];
  const highestRank = ranked?.highest_rank ?? stats?.highest_rank ?? oldRank;
  const newHighestRank = rankOrder.indexOf(newRank) > rankOrder.indexOf(highestRank) ? newRank : highestRank;
  const totalMatches = (stats?.total_matches ?? 0) + 1;
  const wins = (stats?.wins ?? 0) + (isWin ? 1 : 0);
  const losses = (stats?.losses ?? 0) + (isWin ? 0 : 1);
  const weeklyBase = ranked?.week_start === thisWeek ? ranked?.weekly_trophies ?? 0 : 0;
  const weeklyTrophies = Math.max(0, weeklyBase + trophyChange);
  const peakTrophies = Math.max(stats?.peak_trophies ?? 0, newTrophies);
  const favoriteGame = gameType === "mindi" ? "Mindi" : "Gin Rummy";

  const [{ error: statsUpsertError }, { error: rankedUpsertError }] = await Promise.all([
    supabase.from("player_stats").upsert({
      user_id: userId,
      total_matches: totalMatches,
      wins,
      losses,
      win_percentage: Math.round((wins / totalMatches) * 100),
      favorite_game: favoriteGame,
      peak_trophies: peakTrophies,
      highest_rank: newHighestRank,
      updated_at: nowIso(),
    }),
    supabase.from("ranked_progress").upsert({
      user_id: userId,
      trophies: newTrophies,
      weekly_trophies: weeklyTrophies,
      week_start: thisWeek,
      current_rank: newRank,
      highest_rank: newHighestRank,
      updated_at: nowIso(),
    }),
  ]);
  if (statsUpsertError) throw statsUpsertError;
  if (rankedUpsertError) throw rankedUpsertError;

  return { newTrophies, rankChanged: oldRank !== newRank, newRank, oldRank };
}
