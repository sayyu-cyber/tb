import React from "react";
import type { RoomDoc } from "@/lib/rooms";
const params = new URLSearchParams(location.search);
const w = window as typeof window & { roomCall?: unknown; destination?: string; toast?: string; emitRoom?: (room: RoomDoc | null) => void; failRoom?: () => void; calls?: unknown[]; startedState?: unknown };
let liveRoom: RoomDoc | null = null, roomWatches = 0;
const uid = "sayyu";
const router = { push: (value: string) => { w.destination = value; }, replace: (value: string) => { w.destination = value; } };
export function useRouter() { return router; }
export function useSearchParams() { return params; }
export function usePathname() { return "/play/mindi/room"; }
export function useAuth() { return { user: { uid, displayName: uid === "sayyu" ? "Sayyu" : "Mariyam" }, isGuest: params.has("guest"), loading: false, playerStats: { trophies: 58, currentRank: "Gold" } }; }
export function useEconomy() { return { state: { economy: { coins: 1240 }, profile: { vip: { active: false }, equipped: { cardBack: "cb_neon" } } }, getActiveRoomCards: () => params.has("no-card") ? [] : [{ id: "card", type: "1hour", duration: 1, activated: true, remainingTime: 42 * 60000 }] }; }
export function useSettings() { return { settings: { language: params.get("lang") || "en", music: false } }; }
export function useToast() { return { showToast: (text: string) => { w.toast = text; } }; }
export const ProtectedRoute = ({children}: {children: React.ReactNode}) => children;
export const BackgroundMusicPlayer = () => null, CoinTopupWatcher = () => null, PresenceHeartbeat = () => null, ConnectionNotice = () => null;
export const HomeSocialProvider = ({children}: {children: React.ReactNode}) => children;
const friends = ["mariyam", "ibrahim", "aishath", "hussain", "fathimath", "shifa"].map(uid => ({uid, requestId: uid, name: uid[0].toUpperCase() + uid.slice(1)}));
export function useHomeSocial() { return { friends, profiles: Object.fromEntries(friends.map(friend => [friend.uid, { uid: friend.uid, displayName: friend.name, trophies: 31, lastSeen: Date.now() - (friend.uid === "shifa" ? 300000 : 0) }])), online: friends.filter(friend => friend.uid !== "shifa"), chats: [], loading: false, error: false, retry: () => {} }; }
export function watchIncomingRequests(_: string, cb: (items: unknown[]) => void) { cb([]); return () => {}; }
export function watchRoomInvites(_: string, cb: (items: unknown[]) => void) { cb([
  { id: "iv1", from: "mariyam", fromName: "Mariyam", to: uid, code: "K7Q2MX", gameType: "mindi", createdAt: Date.now() - 120000 },
  { id: "iv2", from: "hussain", fromName: "Hussain", to: uid, code: "P4W8ZN", gameType: "gin_rummy", createdAt: Date.now() - 840000 },
  { id: "iv3", from: "aishath", fromName: "Aishath", to: uid, code: "D3LK9V", gameType: "mindi", createdAt: Date.now() - 2400000 }
]); return () => {}; }
export async function dismissRoomInvite(id: string) { record("dismiss", id); }
const record = (...args: unknown[]) => { w.roomCall = args; (w.calls ||= []).push(args); };
export async function createRoom(...args: unknown[]) { record(...args); return "NEW234"; }
export function sampleRoom(code = "TF2GRQ"): RoomDoc {
  const full = params.has("full") || code === "FULL23" || code === "D3LK9V" || code === "76MTJX";
  const gin = code === "X9FDGC" || code === "P4W8ZN" || code === "LOCK23" || params.has("gin");
  if(params.has("code") && (params.has("gin") || params.has("duel"))) return {code,ownerUid:"sayyu",playerNames:{sayyu:"Sayyu",hussain:"Hussain",ibrahim:"Ibrahim"},players:gin?["sayyu","hussain"]:["sayyu","ibrahim"],seatOrder:gin?["sayyu","hussain"]:["sayyu","ibrahim"],maxPlayers:2,gameType:gin?"gin_rummy":"mindi",mindiMode:"ffa1v1",mode:"casual",status:"waiting",password:null,createdAt:Date.now(),matchId:null};
  return { code, ownerUid: (params.has("guest-lobby") || (!params.has("code") && code === "TF2GRQ")) ? "mariyam" : gin ? "hussain" : "sayyu", playerNames: {sayyu:"Sayyu", mariyam:"Mariyam", ibrahim:"Ibrahim", aishath:"Aishath", hussain:"Hussain"}, players: gin ? ["hussain"] : code === "K7Q2MX" ? ["mariyam","ibrahim"] : full ? ["sayyu","ibrahim","mariyam","aishath"] : ["sayyu","ibrahim","mariyam"], seatOrder: gin ? ["hussain"] : full ? ["sayyu","ibrahim","mariyam","aishath"] : ["sayyu","ibrahim","mariyam"], maxPlayers: gin ? 2 : 4, gameType: gin ? "gin_rummy" : "mindi", mindiMode: "team2v2", mode: "casual", status: code === "76MTJX" || code === "START2" ? "started" : code === "Z4C3EF" || params.has("closed") ? "closed" : "waiting", password: code === "TF2GRQ" || code === "LOCK23" ? "mindi2026" : null, createdAt: Date.now(), matchId: null };
}
export async function getRoom(code: string) {
  if (code === "BAD234" || code === "TF2GRX") return null;
  const room = sampleRoom(code);
  if (!params.has("code") && code === "TF2GRQ") room.players = ["mariyam", "ibrahim"];
  if (code === "START2") room.players = ["mariyam"];
  if (code === "FULL23") room.players = ["a","b","c","d"];
  if (code === "Z4C3EF") room.players = ["mariyam"];
  return room;
}
export async function joinRoom(code: string, user: string, name: string, password: string, token?: string) {
  const room = (await getRoom(code))!;
  if (token === "expired") throw new Error("This invite has expired. Ask the host for a new invite.");
  if (room.status === "closed") throw new Error("This room has closed");
  if (room.status === "started" && !room.players.includes(user)) throw new Error("This room has already started");
  if (room.players.length >= room.maxPlayers && !room.players.includes(user)) throw new Error("This room is full");
  if (!room.players.includes(user) && !token && (code === "LOCK23" || code === "TF2GRQ") && password !== "secret") throw new Error("Incorrect room password");
  if (!room.players.includes(user)) liveRoom = { ...room, players: [...room.players, user], playerNames: { ...room.playerNames, [user]: name } };
  record(code,user,name,password);
}
export async function createRoomInviteLink() { return "fixture-invite"; }
export function watchRoom(code: string, callback: (value: RoomDoc | null) => void, error?: () => void) {
  if (params.has("code") && code === params.get("code") && document.querySelector('.room-waiting-page')) {
    w.emitRoom = room => { liveRoom = room; callback(room); }; w.failRoom = error;
    if (params.has("load-error") && roomWatches++ === 0) error?.();
    else if (!params.has("loading")) w.emitRoom(params.has("not-found") ? null : liveRoom ?? sampleRoom(code));
  } else { void getRoom(code).then(callback); }
  return () => {};
}
export async function getPublicProfile(user: string) { return { uid:user, currentRank: user === "ibrahim" ? "Silver" : user === "aishath" ? "Bronze" : "Gold", trophies: user === "mariyam" ? 52 : user === "ibrahim" ? 31 : 12 }; }
export async function kickPlayer(...args: unknown[]) { record("kick", ...args); }
export async function banPlayer(...args: unknown[]) { record("ban", ...args); }
export async function setSeatOrder(...args: unknown[]) { record("order", ...args); }
export async function leaveRoom(...args: unknown[]) { record("leave", ...args); }
export async function sendRoomInvite(...args: unknown[]) { record("invite", ...args); }
export async function startRoomMatch(code: string, user: string, build: (players: string[]) => unknown) { const room = liveRoom ?? sampleRoom(code); record("start", code,user); const state = build(room.players); w.startedState = state; w.emitRoom?.({...room,status:"started",matchId:"match-test"}); return state; }
export default function Link({href, children, onClick, prefetch, ...props}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) { return <a href={href} {...props} onClick={event => { event.preventDefault(); onClick?.(event); router.push(String(href)); }}>{children}</a>; }
