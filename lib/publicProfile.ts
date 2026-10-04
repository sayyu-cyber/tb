import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ProfileBundle } from "@/lib/supabase/data";

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
  avatarPreset?: string;
  bannerPreset?: string;
  cardBack?: string;
  tableTheme?: string;
}

export async function getPublicProfile(uid: string): Promise<PublicProfile | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("profiles").select(`
    id, display_name, avatar_preset, banner_preset,
    player_stats(total_matches,wins,losses,win_percentage,favorite_game,peak_trophies,highest_rank),
    ranked_progress(trophies,current_rank,highest_rank)
  `).eq("id", uid).maybeSingle();
  if (error) throw error;
  const profile = data as ProfileBundle | null;
  if (!profile) return null;
  const { data: appearance, error: appearanceError } = await supabase.rpc("get_public_appearance", { p_user_id: uid });
  if (appearanceError) throw appearanceError;
  return {
    uid,
    displayName: profile.display_name || "Player",
    trophies: profile.ranked_progress?.trophies ?? 0,
    currentRank: profile.ranked_progress?.current_rank ?? "Bronze",
    highestRank: profile.ranked_progress?.highest_rank ?? profile.player_stats?.highest_rank ?? "Bronze",
    peakTrophies: profile.player_stats?.peak_trophies ?? profile.ranked_progress?.trophies ?? 0,
    wins: profile.player_stats?.wins ?? 0,
    losses: profile.player_stats?.losses ?? 0,
    totalMatches: profile.player_stats?.total_matches ?? 0,
    winPercentage: profile.player_stats?.win_percentage ?? 0,
    favoriteGame: profile.player_stats?.favorite_game ?? null,
    avatarPreset: profile.avatar_preset ?? undefined,
    bannerPreset: profile.banner_preset ?? undefined,
    cardBack: appearance?.card_back ?? undefined,
    tableTheme: appearance?.table_theme ?? undefined,
  };
}
