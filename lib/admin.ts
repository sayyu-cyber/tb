import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { realtimeChannelName, subscribe, type Unsubscribe } from "@/lib/supabase/data";

export const ADMIN_EMAILS = ["sayyu9898@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export interface SeasonOverride {
  seasonNumber: number;
  startedAt: number;
}

export interface ShopOverrides {
  priceOverrides: Record<string, number>;
  hiddenItemIds: string[];
}

export interface MissionRewardOverrides {
  dailyRewards: Record<string, number>;
  weeklyRewards: Record<string, number>;
}

export interface RankRewardOverrides {
  weeklyRewards: Record<string, number>;
}

async function getConfigDoc<T>(id: string): Promise<T | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("app_config").select("value").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data?.value as T | undefined) ?? null;
}

function watchConfigDoc<T>(id: string, onUpdate: (data: T | null) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => {
    try {
      onUpdate(await getConfigDoc<T>(id));
    } catch (error) {
      console.error(`Failed to load app config ${id}:`, error);
      onUpdate(null);
    }
  };
  void load();
  return subscribe(
    supabase
      .channel(realtimeChannelName(`app-config:${id}`))
      .on("postgres_changes", { event: "*", schema: "public", table: "app_config", filter: `id=eq.${id}` }, load)
  );
}

async function setConfigDoc<T>(id: string, value: T): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("app_config").upsert({
    id,
    value: value as any,
    updated_by: userData.user?.id ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export const getSeasonOverride = () => getConfigDoc<SeasonOverride>("season");
export const watchSeasonOverride = (cb: (d: SeasonOverride | null) => void) => watchConfigDoc<SeasonOverride>("season", cb);
export const setSeasonOverride = (data: SeasonOverride) => setConfigDoc("season", data);

export const getShopOverrides = () => getConfigDoc<ShopOverrides>("shopOverrides");
export const watchShopOverrides = (cb: (d: ShopOverrides | null) => void) => watchConfigDoc<ShopOverrides>("shopOverrides", cb);
export const setShopOverrides = (data: ShopOverrides) => setConfigDoc("shopOverrides", data);

export const getMissionRewardOverrides = () => getConfigDoc<MissionRewardOverrides>("missionRewards");
export const watchMissionRewardOverrides = (cb: (d: MissionRewardOverrides | null) => void) =>
  watchConfigDoc<MissionRewardOverrides>("missionRewards", cb);
export const setMissionRewardOverrides = (data: MissionRewardOverrides) => setConfigDoc("missionRewards", data);

export const getRankRewardOverrides = () => getConfigDoc<RankRewardOverrides>("rankRewards");
export const watchRankRewardOverrides = (cb: (d: RankRewardOverrides | null) => void) =>
  watchConfigDoc<RankRewardOverrides>("rankRewards", cb);
export const setRankRewardOverrides = (data: RankRewardOverrides) => setConfigDoc("rankRewards", data);

