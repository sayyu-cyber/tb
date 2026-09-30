import React, { useState } from 'react';
import { DAILY_LOGIN_REWARDS } from '@/data/cosmetics';
export const fixture: any = { uid: 'viewer', coins: 71760, version: 1, lastClaimed: null, claimedThrough: 0, nextDay: 1, toasts: [], path: '/home', pendingDaily: false, channels: [], calls: [], walletUploads: 0, inventoryDelay: location.search.includes('slow') ? 5500 : 0 };
(window as any).bugsFixture = fixture;
const iso = () => new Date().toISOString();
const wallet = () => ({ coins: fixture.coins, total_earned: 80000, total_spent: 8240, version: fixture.version });
function snapshot() { return { wallet: wallet(), daily: { available: !fixture.lastClaimed, claimedThrough: fixture.claimedThrough, nextDay: fixture.nextDay, lastClaimed: fixture.lastClaimed, nextClaimAt: fixture.lastClaimed ? new Date(new Date(fixture.lastClaimed).getTime() + 86400000).toISOString() : null, serverNow: iso() } }; }
const user = { uid: 'viewer', id: 'viewer', email: 'sayyu9898@gmail.com', displayName: 'Sayyu', photoURL: null, createdAt: new Date('2026-07-04'), isGuest: false };
export function useAuth() { return { user, isGuest: false, loading: false, playerStats: { playerCode: 'YWD54FH', trophies: 58, currentRank: 'Gold' }, profileLoading: false, profileError: false, retryProfile() {} }; }
export function useToast() { return { showToast: (text: string) => fixture.toasts.push(text) }; }
export function usePathname() { const [path, setPath] = useState('/home'); fixture.navigate = setPath; return path; }
export const useTranslation = () => (key: string) => ({ rankedq_matchFound: 'Match found', rewards_dayClaimed: 'Day {n} Claimed!', page_profile: 'Profile' }[key] || key);
export function useRouter() { return { push: (url: string) => fixture.destination = url, replace: (url: string) => fixture.destination = url }; }
export function useSearchParams() { return new URLSearchParams(location.search); }
export default function Link({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) { return <a href={href} {...props}>{children}</a>; }

class Query {
  op = 'select'; singleResult = false;
  constructor(public table: string) {}
  select() { return this; } eq() { return this; } is() { return this; } in() { return this; } order() { return this; } limit() { return this; }
  maybeSingle() { this.singleResult = true; return this; } single() { this.singleResult = true; return this; }
  upsert() { this.op = 'upsert'; if (this.table === 'wallets') fixture.walletUploads++; return this; }
  update() { this.op = 'update'; return this; }
  async then(resolve: (result: any) => any) {
    if (this.table === 'inventory_items' && fixture.inventoryDelay) await new Promise(resolve => setTimeout(resolve, fixture.inventoryDelay));
    fixture.calls.push(this.table + ':' + this.op);
    const row: any = this.table === 'wallets' ? wallet() : this.table === 'profiles' ? { id: 'viewer', display_name: 'Sayyu', wallets: wallet() } : this.table === 'equipped_cosmetics' ? {} : null;
    return resolve({ data: this.singleResult ? row : [], error: null });
  }
}
const client: any = {
  auth: { getUser: async () => ({ data: { user: { ...user, app_metadata: { admin: true } } } }) },
  from: (table: string) => new Query(table),
  channel: () => {
    const callbacks: any[] = [];
    const channel = { callbacks, on(_event: string, filter: any, fn: any) { callbacks.push({ filter, fn }); return channel; }, subscribe(fn?: any) { fixture.channels.push(channel); fn?.('SUBSCRIBED'); return channel; } };
    return channel;
  },
  removeChannel: async (channel: any) => { fixture.channels = fixture.channels.filter((entry: any) => entry !== channel); },
  rpc: async (name: string, args: any) => {
    fixture.calls.push(name);
    if (name === 'get_economy_snapshot') return { data: snapshot(), error: null };
    if (name === 'admin_top_up') { fixture.coins += args.p_coins; fixture.version++; return { data: wallet(), error: null }; }
    if (name === 'apply_economy_action') {
      if (args.p_action === 'CLAIM_DAILY_REWARD') {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (fixture.lastClaimed) return { data: null, error: { message: 'Daily reward already claimed' } };
        fixture.coins += DAILY_LOGIN_REWARDS[args.p_payload.day - 1].coins;
        fixture.claimedThrough = args.p_payload.day; fixture.lastClaimed = iso(); fixture.nextDay = args.p_payload.day % 7 + 1;
      } else if (args.p_action === 'ADD_COINS') fixture.coins += 10;
      else if (args.p_action === 'SPEND_COINS') fixture.coins -= args.p_payload.amount;
      fixture.version++;
      return { data: snapshot(), error: null };
    }
    throw new Error('Unexpected RPC ' + name);
  },
};
fixture.reconnect = () => { for (const channel of fixture.channels) for (const { filter, fn } of channel.callbacks) if (filter.table === 'wallets') fn(); };
export function getSupabaseBrowserClient() { return client; }
export function getProfileHistory() { return Promise.resolve([]); }
