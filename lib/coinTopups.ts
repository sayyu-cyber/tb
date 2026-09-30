import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { realtimeChannelName, subscribe, toMillis, type Unsubscribe } from "@/lib/supabase/data";
import { normalizePlayerCode } from "@/lib/playerCode";

export interface CoinTopupRequest {
  id: string;
  uid: string;
  playerName: string;
  coins: number;
  priceMVR: number;
  packName: string;
  status: "pending" | "approved" | "rejected" | "credited";
  createdAt: number;
  decidedAt?: number;
}

function toTopup(row: any): CoinTopupRequest {
  return {
    id: row.id,
    uid: row.user_id,
    playerName: row.player_name,
    coins: row.coins,
    priceMVR: row.price_mvr,
    packName: row.pack_name,
    status: row.status,
    createdAt: toMillis(row.created_at),
    decidedAt: toMillis(row.decided_at) || undefined,
  };
}

export async function requestCoinTopup(uid: string, playerName: string, coins: number, priceMVR: number, packName: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("coin_topup_requests").insert({
    user_id: uid,
    player_name: playerName,
    coins,
    price_mvr: priceMVR,
    pack_name: packName,
  });
  if (error) throw error;
}

async function loadTopups(uid?: string): Promise<CoinTopupRequest[]> {
  const supabase = getSupabaseBrowserClient();
  let query = supabase.from("coin_topup_requests").select("*").order("created_at", { ascending: false }).limit(uid ? 50 : 200);
  if (uid) query = query.eq("user_id", uid);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toTopup);
}

export function watchMyTopups(uid: string, onUpdate: (requests: CoinTopupRequest[]) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => onUpdate(await loadTopups(uid));
  void load().catch(console.error);
  return subscribe(supabase.channel(realtimeChannelName(`topups:${uid}`)).on("postgres_changes", { event: "*", schema: "public", table: "coin_topup_requests", filter: `user_id=eq.${uid}` }, load));
}

export function watchAllTopups(onUpdate: (requests: CoinTopupRequest[]) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => onUpdate(await loadTopups());
  void load().catch(console.error);
  return subscribe(supabase.channel(realtimeChannelName("topups:all")).on("postgres_changes", { event: "*", schema: "public", table: "coin_topup_requests" }, load));
}

export async function decideTopup(id: string, approve: boolean): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("coin_topup_requests")
    .update({ status: approve ? "approved" : "rejected", decided_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function markTopupCredited(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("coin_topup_requests").update({ status: "credited", credited_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export interface AdminPlayerLookup {
  uid: string;
  displayName: string;
  coins: number;
  version?: number;
}

export async function findPlayerByCode(code: string): Promise<AdminPlayerLookup | null> {
  const trimmed = normalizePlayerCode(code);
  if (!trimmed) return null;
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,display_name,wallets(coins,version)")
    .eq("player_code", trimmed)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const wallet = Array.isArray((data as any).wallets) ? (data as any).wallets[0] : (data as any).wallets;
  return { uid: data.id, displayName: data.display_name || "Player", coins: wallet?.coins ?? 0, version: wallet?.version ?? 0 };
}

export async function adminTopUp(uid: string, playerName: string, coins: number): Promise<{ coins: number; version: number }> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("admin_top_up", { p_user_id: uid, p_coins: coins });
  if (error) throw new Error(error.message);
  window.dispatchEvent(new CustomEvent("thaasbai-wallet", { detail: { uid, wallet: data } }));
  return { coins: data.coins, version: data.version };
}
