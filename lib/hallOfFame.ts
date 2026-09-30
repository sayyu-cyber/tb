import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { realtimeChannelName, subscribe, toMillis, type Unsubscribe } from "@/lib/supabase/data";

export interface HallOfFameEntry {
  uid: string;
  displayName: string;
  peakTrophies: number;
  highestRank: string;
  wins: number;
  totalMatches: number;
  favoriteGame: string | null;
  isManual?: boolean;
}

const HALL_OF_FAME_SIZE = 50;

export interface ManualHallOfFameEntry {
  id: string;
  displayName: string;
  peakTrophies: number;
  note: string;
  addedAt: number;
}

export async function addManualHallOfFameEntry(displayName: string, peakTrophies: number, note: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("hall_of_fame_manual").insert({
    display_name: displayName.trim().slice(0, 40),
    peak_trophies: peakTrophies,
    note: note.trim().slice(0, 100),
  });
  if (error) throw error;
}

export async function removeManualHallOfFameEntry(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("hall_of_fame_manual").delete().eq("id", id);
  if (error) throw error;
}

async function loadManual(): Promise<ManualHallOfFameEntry[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("hall_of_fame_manual").select("id,display_name,peak_trophies,note,added_at");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    peakTrophies: row.peak_trophies,
    note: row.note,
    addedAt: toMillis(row.added_at),
  }));
}

export function watchManualHallOfFameEntries(onUpdate: (entries: ManualHallOfFameEntry[]) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => onUpdate(await loadManual());
  void load().catch(console.error);
  return subscribe(supabase.channel(realtimeChannelName("hall-of-fame-manual")).on("postgres_changes", { event: "*", schema: "public", table: "hall_of_fame_manual" }, load));
}

export async function resetManualHallOfFame(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("hall_of_fame_manual").select("id");
  if (error) throw error;
  await Promise.all((data ?? []).map((row) => removeManualHallOfFameEntry(row.id)));
}

export async function getHallOfFame(limitCount = HALL_OF_FAME_SIZE): Promise<HallOfFameEntry[]> {
  const supabase = getSupabaseBrowserClient();
  const [{ data: profiles, error: profilesError }, manual] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,display_name,player_stats(peak_trophies,highest_rank,wins,total_matches,favorite_game),ranked_progress(trophies)")
      .order("player_stats(peak_trophies)", { ascending: false })
      .limit(limitCount),
    loadManual(),
  ]);
  if (profilesError) throw profilesError;

  const computed: HallOfFameEntry[] = ((profiles ?? []) as any[])
    .map((row) => ({
      uid: row.id,
      displayName: row.display_name || "Player",
      peakTrophies: row.player_stats?.peak_trophies ?? row.ranked_progress?.trophies ?? 0,
      highestRank: row.player_stats?.highest_rank ?? "Bronze",
      wins: row.player_stats?.wins ?? 0,
      totalMatches: row.player_stats?.total_matches ?? 0,
      favoriteGame: row.player_stats?.favorite_game ?? null,
    }))
    .filter((entry) => entry.peakTrophies > 0 || entry.totalMatches > 0);

  const manualEntries: HallOfFameEntry[] = manual.map((entry) => ({
    uid: `manual_${entry.id}`,
    displayName: entry.displayName,
    peakTrophies: entry.peakTrophies,
    highestRank: "-",
    wins: 0,
    totalMatches: 0,
    favoriteGame: null,
    isManual: true,
  }));

  return [...computed, ...manualEntries].sort((a, b) => b.peakTrophies - a.peakTrophies).slice(0, limitCount);
}

