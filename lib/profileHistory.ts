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
    .select("match_id,result,created_at,matches!inner(game_type,pool,status,created_at,public_state,match_results(result,winner_user_id,winner_team))")
    .eq("user_id", uid)
    .eq("matches.status", "completed")
    .order("created_at", { ascending: false })
    .order("match_id", { ascending: true })
    .limit(50);
  if (error) throw error;

  return ((data ?? []) as any[]).flatMap((row) => {
    const match = Array.isArray(row.matches) ? row.matches[0] : row.matches;
    if (!match || match.status !== "completed") return [];
    const mindi = match.game_type === "mindi";
    const result = row.result === "win" ? "Win" : row.result === "loss" ? "Loss" : row.result === "draw" ? "Draw" : "Unavailable";
    const canonical = Array.isArray(match.match_results) ? match.match_results[0] : match.match_results;
    const canonicalOutcome = canonical?.result?.outcome ?? canonical?.result;
    const outcome = match.public_state?.outcome ?? match.public_state?.result;
    const tricks = canonicalOutcome?.tricksWon ?? match.public_state?.tricksWon ?? outcome?.tricksWon;
    const points = canonicalOutcome?.score ?? outcome?.score;
    const score = mindi && typeof tricks?.A === "number" && typeof tricks?.B === "number"
      ? `${tricks.A} : ${tricks.B} tricks`
      : typeof points === "number"
        ? `${points} points`
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
