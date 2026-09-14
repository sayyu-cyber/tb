import { useState } from "react";
import { ACHIEVEMENTS } from "@/data/cosmetics";
export const auth = { currentUser: { uid: "test", getIdTokenResult: async () => ({ claims: location.search.includes("admin") ? {admin:true} : {} }) } };
export function useAuth() {
  const [name, setName] = useState("Test Player");
  return { user: { uid: "test", displayName: name, email: "player@example.com", photoURL: null, createdAt: new Date("2024-12-12") }, playerStats: location.search.includes("error") ? null : { totalMatches: 20, wins: 12, losses: 8, trophies: 30, currentRank: "Silver", highestRank: "Gold", favoriteGame: "Mindi", playerCode: "TEST123" }, profileLoading: location.search.includes("loading"), profileError: location.search.includes("error"), retryProfile: () => {}, isGuest: false,
    updatePlayerProfile: async (value: {displayName:string}) => { if (location.search.includes("savefail")) throw Error("Offline"); setName(value.displayName); document.body.dataset.saved = value.displayName; } };
}
export const useEconomy = () => ({ state: { achievements: ACHIEVEMENTS, profile: { stats: { matchesWon: 12, highestRank: "Gold" }, collection: { cardBacks: [], tableThemes: [], profileFrames: [], emotes: [], victoryAnimations: [], stickers: [], banners: [] } } } });
export const useToast = () => ({ showToast: (message:string) => { document.body.dataset.toast = message; } });
export const useTranslation = () => (key:string) => ({ editprofile_title:"Edit Profile", editprofile_save:"Save Changes", editprofile_usernamePlaceholder:"Display Name", a11y_close:"Close" }[key] || key);
export async function getProfileHistory() {
  if(location.search.includes("error")) throw Error("Offline");
  if(location.search.includes("empty")) return [];
  return [{ id:"one", game:"Mindi", mode:"Casual", result:"Win", score:"8 : 5 tricks", date:Date.now() }, { id:"two", game:"Gin Rummy", mode:"Ranked", result:"Loss", score:"20 points", date:Date.now() }];
}
