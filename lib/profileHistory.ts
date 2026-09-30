import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toMillis } from "@/lib/supabase/data";

export interface ProfileMatch {
  id: string;
  game: "Mindi" | "Gin Rummy";
  mode: string;
  result: "Win" | "Loss" | "Draw" | "Unavailable";
  date: number;
  score: string;
}

export async function getProfileHistory(uid: string): Promise<ProfileMatch[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("match_players")
    .select("match_id,result,created_at,matches(game_type,pool,status,created_at,public_state,match_results(result,winner_user_id,winner_team))")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  return ((data ?? []) as any[]).flatMap((row) => {
    const match = row.matches;
    if (!match || match.status !== "completed") return [];
    const mindi = match.game_type === "mindi";
    const result = row.result === "win" ? "Win" : row.result === "loss" ? "Loss" : row.result === "draw" ? "Draw" : "Unavailable";
    const outcome = match.public_state?.outcome ?? match.public_state?.result ?? match.match_results?.[0]?.result;
    const score = mindi && outcome?.tricksWon
      ? `${Object.values(outcome.tricksWon).join(" : ")} tricks`
      : typeof outcome?.score === "number"
        ? `${outcome.score} points`
        : "--";
    return [{
      id: row.match_id,
      game: mindi ? "Mindi" : "Gin Rummy",
      mode: match.pool === "casual" ? "Casual" : match.pool === "weekend" ? "Weekend League" : "Ranked",
      result,
      date: toMillis(match.created_at),
      score,
    } as ProfileMatch];
  });
}
