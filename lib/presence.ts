import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { nowIso, realtimeChannelName, subscribe, toMillis, type Unsubscribe } from "@/lib/supabase/data";

export const HEARTBEAT_MS = 45_000;
export const ONLINE_WINDOW_MS = 90_000;

export async function heartbeat(uid: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("profiles").update({ last_seen: nowIso() }).eq("id", uid);
  if (error) throw error;
}

export function watchLastSeen(uid: string, onUpdate: (lastSeen: number | null) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => {
    const { data, error } = await supabase.from("profiles").select("last_seen").eq("id", uid).maybeSingle();
    if (!error) onUpdate(toMillis(data?.last_seen) || null);
  };
  void load();
  return subscribe(
    supabase
      .channel(realtimeChannelName(`presence:${uid}`))
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${uid}` }, load)
  );
}

export function isOnline(lastSeen: number | null): boolean {
  return lastSeen != null && Date.now() - lastSeen < ONLINE_WINDOW_MS;
}

