import { useState } from "react";
import { ACHIEVEMENTS } from "@/data/cosmetics";

/**
 * Stand-ins for what Profile reads, so the screen renders without Firebase.
 *
 * The figures are the Profile board's own sample data
 * (design/arena/boards/Profile.dc.html): Sayyu, Gold, 58 trophies, 96
 * matches, 54 wins, 42 losses, player code K7M4QRT, member since Jul 2026,
 * and a history that works out to Mindi 61/36 and Gin Rummy 35/18 - the
 * 59% and 51% rings the board draws. Feeding the board's numbers in is what
 * makes a screenshot comparable with the reference.
 *
 * Query flags: ?admin, ?loading, ?error, ?empty, ?savefail.
 */

const flag = (name: string) => typeof location !== "undefined" && location.search.includes(name);

export const auth = {
  currentUser: {
    uid: "test",
    getIdTokenResult: async () => ({ claims: flag("admin") ? { admin: true } : {} }),
  },
};

export function useAuth() {
  const [name, setName] = useState("Sayyu");
  return {
    user: {
      uid: "test",
      displayName: name,
      email: "sayyu@gmail.com",
      photoURL: null,
      createdAt: new Date("2026-07-04"),
    },
    playerStats: flag("error") ? null : {
      totalMatches: 96, wins: 54, losses: 42, winPercentage: 56,
      trophies: 58, currentRank: "Gold", highestRank: "Gold",
      favoriteGame: "Mindi", playerCode: "K7M4QRT",
    },
    profileLoading: flag("loading"),
    profileError: flag("error"),
    retryProfile: () => {},
    isGuest: false,
    updatePlayerProfile: async (value: { displayName: string }) => {
      if (flag("savefail")) throw Error("Offline");
      setName(value.displayName);
      document.body.dataset.saved = value.displayName;
    },
  };
}

export const useEconomy = () => ({
  state: {
    achievements: ACHIEVEMENTS,
    economy: { coins: 1240 },
    profile: {
      stats: { matchesWon: 54, highestRank: "Gold", weekendChampion: false },
      collection: { cardBacks: [], tableThemes: [], profileFrames: [], emotes: [], victoryAnimations: [], stickers: [], banners: [] },
    },
  },
});

export const useToast = () => ({ showToast: (message: string) => { document.body.dataset.toast = message; } });

export const useTranslation = () => (key: string) => ({
  editprofile_title: "Edit Profile",
  editprofile_save: "Save Changes",
  editprofile_usernamePlaceholder: "Display Name",
  a11y_close: "Close",
}[key] || key);

/**
 * The board's history: 61 Mindi matches of which 36 are wins (59%), and 35
 * Gin Rummy of which 18 are wins (51%). The first five rows carry the
 * board's own modes, scores and dates so the top of the table matches the
 * reference; the rest make the counts and the rings come out right.
 */
const day = 86_400_000;
const base = new Date(2026, 8, 26).getTime();

const shown = [
  { id: "m1", game: "Mindi", mode: "Weekend League", result: "Win", score: "8 : 5 tricks", date: base },
  { id: "g1", game: "Gin Rummy", mode: "Weekend League", result: "Win", score: "47 points", date: base },
  { id: "m2", game: "Mindi", mode: "Weekend League", result: "Loss", score: "4 : 9 tricks", date: base - day },
  { id: "m3", game: "Mindi", mode: "Ranked", result: "Win", score: "7 : 6 tricks", date: base - 2 * day },
  { id: "g2", game: "Gin Rummy", mode: "Casual", result: "Loss", score: "31 points", date: base - 3 * day },
];

function fill(game: string, matches: number, wins: number, offset: number) {
  const already = shown.filter(record => record.game === game);
  const need = matches - already.length;
  const winsNeeded = wins - already.filter(record => record.result === "Win").length;
  return Array.from({ length: Math.max(0, need) }, (_, index) => ({
    id: `${game}-${index}`,
    game,
    mode: index % 3 === 0 ? "Ranked" : "Casual",
    result: index < winsNeeded ? "Win" : "Loss",
    score: game === "Mindi" ? "7 : 6 tricks" : "24 points",
    date: base - (offset + index + 4) * day,
  }));
}

export async function getProfileHistory() {
  if (flag("error")) throw Error("Offline");
  if (flag("empty")) return [];
  return [...shown, ...fill("Mindi", 61, 36, 0), ...fill("Gin Rummy", 35, 18, 70)];
}
