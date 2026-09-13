import { useSyncExternalStore } from "react";
let state = { economy: { coins:location.search.includes("poor") ? 0 : 71741 }, profile: { coins:location.search.includes("poor") ? 0 : 71741, vip:{active:location.search.includes("vip"),remainingDays:7}, collection:{items:["cb_default"]}, equipped:{cardBack:"cb_default",tableTheme:"tt_default",profileFrame:"",victoryAnimation:"",banner:""} }, shopOverrides:{priceOverrides:{},hiddenItemIds:[]} };
const listeners = new Set<() => void>();
function emit() { listeners.forEach(fn=>fn()); }
export function useEconomy() {
  const snapshot = useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn);},()=>state);
  return { state:snapshot, purchaseCosmetic:(id:string)=>{state={...state,profile:{...state.profile,collection:{items:[...state.profile.collection.items,id]}}};emit();return true;}, equipCosmetic:(category:string,id:string)=>{state={...state,profile:{...state.profile,equipped:{...state.profile.equipped,[category]:id}}};emit();},activateVip:()=>{} };
}
export function useAuth() { return { user:{uid:"shop-test",displayName:"Sayyu"},isGuest:false }; }
export function useSettings() { return {settings:{language:"en"}}; }
export function useToast() { return {showToast:()=>{}}; }
export function watchMyTopups(uid:string,callback:(items:unknown[])=>void) { callback([]); return ()=>{}; }
export async function requestCoinTopup() { throw new Error("Test prevents real purchases"); }
