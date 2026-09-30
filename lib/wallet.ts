import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { realtimeChannelName } from "@/lib/supabase/data";
export interface WalletSnapshot {
  wallet: { coins: number; total_earned: number; total_spent: number; version: number };
  daily: { available: boolean; claimedThrough: number; nextDay: number; lastClaimed: string | null; nextClaimAt: string | null; serverNow: string };
  roomCardId?: string;
}
export const formatCoins = (coins: number) => Math.trunc(coins).toLocaleString("en-US");
export async function loadWallet(): Promise<WalletSnapshot> {
  const { data, error } = await getSupabaseBrowserClient().rpc("get_economy_snapshot");
  if (error) throw new Error(error.message);
  return data as WalletSnapshot;
}
export async function mutateWallet(action: string, payload: unknown): Promise<WalletSnapshot> {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  const requestId = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  const { data, error } = await getSupabaseBrowserClient().rpc("apply_economy_action", { p_action: action, p_payload: payload, p_request_id: requestId });
  if (error) throw new Error(error.message);
  return data as WalletSnapshot;
}
export function watchWallet(uid: string, onUpdate: (wallet: WalletSnapshot['wallet']) => void): () => void {
  const supabase = getSupabaseBrowserClient();
  let stopped = false, version = -1;
  const load = async () => {
    const { data, error } = await supabase.from('wallets').select('coins,total_earned,total_spent,version').eq('user_id', uid).single();
    if (!stopped && !error && data && data.version >= version) { version = data.version; onUpdate(data); }
  };
  const refresh = () => { void load(); };
  const channel = supabase.channel(realtimeChannelName(`wallet-admin:${uid}`))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${uid}` }, refresh)
    .subscribe(status => { if (status === 'SUBSCRIBED') refresh(); });
  refresh(); window.addEventListener('focus', refresh);
  return () => { stopped = true; void supabase.removeChannel(channel); window.removeEventListener('focus', refresh); };
}
