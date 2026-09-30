import { loadProfileBundle } from "@/lib/supabase/data";

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
  const profile = await loadProfileBundle(uid);
  if (!profile) return null;
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
    cardBack: profile.equipped_cosmetics?.card_back,
    tableTheme: profile.equipped_cosmetics?.table_theme,
  };
}
