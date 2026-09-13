import React from "react";
const w = window as typeof window & { roomCall?: unknown; destination?: string; toast?: string };
export function useRouter() { return { push: (value: string) => { w.destination = value; } }; }
export function useAuth() { return { user: { uid: "room-test", displayName: "Sayyu" }, isGuest: location.search.includes("guest") }; }
export function useEconomy() { return { getActiveRoomCards: () => location.search.includes("no-card") ? [] : [{}] }; }
export function useToast() { return { showToast: (text: string) => { w.toast = text; } }; }
export async function createRoom(...args: unknown[]) { w.roomCall = args; return "NEW234"; }
export async function getRoom(code: string) {
  if (code === "BAD234") return null;
  return { code, gameType: "gin_rummy", mode: "casual", status: "waiting", players: code === "FULL23" ? ["a","b"] : ["a"], playerNames: {a:"Aishath"}, maxPlayers:2, password:code === "LOCK23" ? "secret" : null };
}
export async function joinRoom(code: string, uid: string, name: string, password: string) {
  if (code === "LOCK23" && password !== "secret") throw new Error("Incorrect room password");
  w.roomCall = [code,uid,name,password];
}
export function watchRoom(code: string, callback: (value: unknown) => void) { getRoom(code).then(callback); return () => {}; }
export default function Link({href, children, ...props}: React.AnchorHTMLAttributes<HTMLAnchorElement>) { return <a href={href} {...props}>{children}</a>; }
