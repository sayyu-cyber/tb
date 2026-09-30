import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PlayerStats } from "@/types";

export type Unsubscribe = () => void;

export const nowIso = () => new Date().toISOString();

export function realtimeChannelName(base: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `realtime:${base}:${random}`;
}

export function toMillis(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function fromMillis(value: number | null | undefined): string | null {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value).toISOString() : null;
}

export function subscribe(channel: RealtimeChannel, onError?: (error: Error) => void): Unsubscribe {
  channel.subscribe((status, error) => {
    if (status === "CHANNEL_ERROR" && onError) {
      onError(error instanceof Error ? error : new Error("Realtime subscription failed"));
    }
  });
  return () => {
    void getSupabaseBrowserClient().removeChannel(channel);
  };
}

export interface ProfileBundle {
  id: string;
  display_name: string;
  photo_url: string | null;
  avatar_preset: string | null;
  banner_preset: string | null;
  player_code: string | null;
  last_seen?: string | null;
  player_stats?: {
    total_matches: number;
    wins: number;
    losses: number;
    win_percentage: number;
    favorite_game: string | null;
    peak_trophies: number;
    highest_rank: string;
  } | null;
  ranked_progress?: {
    trophies: number;
    weekly_trophies: number;
    week_start: string | null;
    current_rank: string;
    highest_rank: string;
  } | null;
  equipped_cosmetics?: {
    card_back: string;
    table_theme: string;
  } | null;
}

export function profileToPlayerStats(profile: ProfileBundle): PlayerStats {
  const stats = profile.player_stats;
  const ranked = profile.ranked_progress;
  return {
    totalMatches: stats?.total_matches ?? 0,
    wins: stats?.wins ?? 0,
    losses: stats?.losses ?? 0,
    winPercentage: stats?.win_percentage ?? 0,
    favoriteGame: stats?.favorite_game === "Mindi" || stats?.favorite_game === "Gin Rummy" ? stats.favorite_game : null,
    highestRank: ranked?.highest_rank ?? stats?.highest_rank ?? "Unranked",
    trophies: ranked?.trophies ?? 0,
    currentRank: ranked?.current_rank ?? "Unranked",
    weeklyTrophies: ranked?.weekly_trophies ?? 0,
    peakTrophies: stats?.peak_trophies ?? ranked?.trophies ?? 0,
    avatarPreset: profile.avatar_preset ?? undefined,
    bannerPreset: profile.banner_preset ?? undefined,
    playerCode: profile.player_code ?? undefined,
  };
}

export async function loadProfileBundle(uid: string): Promise<ProfileBundle | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      display_name,
      photo_url,
      avatar_preset,
      banner_preset,
      player_code,
      last_seen,
      player_stats(total_matches,wins,losses,win_percentage,favorite_game,peak_trophies,highest_rank),
      ranked_progress(trophies,weekly_trophies,week_start,current_rank,highest_rank),
      equipped_cosmetics(card_back,table_theme)
    `)
    .eq("id", uid)
    .maybeSingle();
  if (error) throw error;
  return data as ProfileBundle | null;
}

export async function ensureProfileCode(uid: string, playerCode: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("profiles")
    .update({ player_code: playerCode, updated_at: nowIso() })
    .eq("id", uid)
    .is("player_code", null);
  if (error) throw error;
}

export async function updateProfileCosmetics(uid: string, cardBack: string, tableTheme: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("equipped_cosmetics")
    .upsert({ user_id: uid, card_back: cardBack, table_theme: tableTheme, updated_at: nowIso() });
  if (error) throw error;
}
