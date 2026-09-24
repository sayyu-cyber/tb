import React, { useSyncExternalStore } from "react";
export const db = {};
const player = { uid: "shell-test", displayName: "Test Player", email: "player@example.com" };
export const useAuth = () => ({ user: player, isGuest: location.search.includes("guest"), loading: false, playerStats: { trophies: 30, wins: 12, totalMatches: 20, currentRank: "Silver" }, logout: async () => { throw Error("test failure"); } });
export const useEconomy = () => ({ state: { economy: { coins: 71741 }, profile: { vip: {active:false}, equipped: { cardBack:"cb_neon", tableTheme:"tt_default" } } } });
export const useSettings = () => ({ settings: {language:"en",music:false} });
export const useToast = () => ({ showToast: (text:string) => { document.body.dataset.toast = text; } });
export const useRankLock = () => ({ isLocked:false, isWeekendLeague:false, nextUnlockTime:"Sunday" });
export const useSeasonInfo = () => ({ name:"Season 9", endDate:new Date(2026,9,1) });
let pathname="/home"; const listeners = new Set<()=>void>();
function navigate(href:string) { pathname=href;document.body.dataset.destination=href;listeners.forEach(callback=>callback()); }
export const usePathname = () => useSyncExternalStore(callback=>{listeners.add(callback);return()=>{listeners.delete(callback);};},()=>pathname,()=>pathname);
export const useRouter = () => ({push:navigate});
export default function Link({href,children,onClick,prefetch,...props}:any) { return <a href={href} {...props} onClick={event=>{event.preventDefault();onClick?.(event);navigate(href);}}>{children}</a>; }
function watch(name:string, callback:(data:any)=>void, data:any) {
  const key=`watch${name}`;
  document.body.dataset[key]=String(Number(document.body.dataset[key]||0)+1);
  callback(data);
  return()=>{document.body.dataset[key]=String(Number(document.body.dataset[key]||0)-1);};
}
export const watchFriends = (_:string, callback:any) => watch('Friends',callback,[]);
export const watchSocialProfiles = (_:string[], callback:any) => watch('Profiles',callback,{});
export const watchConversations = (_:string, callback:any) => watch('Chats',callback,[{id:'chat',participants:['shell-test','friend'],participantNames:{friend:'Friend'},lastMessage:'Play?',lastMessageAt:100,lastSenderUid:'friend',lastReadAt:{}}]);
export const watchIncomingRequests = (_:string, callback:any) => watch('Requests',callback,[]);
export const ProtectedRoute = ({children}:any) => children;
export const BackgroundMusicPlayer=()=>null;
export const CoinTopupWatcher=()=>null;
export const PresenceHeartbeat=()=>null;
