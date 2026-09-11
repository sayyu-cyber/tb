export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isGuest: boolean;
  createdAt: Date;
}

export interface PlayerStats {
  totalMatches: number;
  wins: number;
  losses: number;
  winPercentage: number;
  favoriteGame: "Mindi" | "Gin Rummy" | null;
  highestRank: string;
  trophies: number;
  currentRank: string;
  weeklyTrophies?: number;
  peakTrophies?: number;
  avatarPreset?: string;
  bannerPreset?: string;
  /** Short human-shareable code (lib/playerCode.ts) - shown on the profile
   *  page, used to find a specific player for friend requests and for the
   *  admin panel's direct coin top-up. */
  playerCode?: string;
}

export interface LeaderboardEntry {
  rank: number;
  uid: string;
  username: string;
  trophies: number;
  avatar?: string;
}

export interface GameMode {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface SeasonInfo {
  seasonNumber: number;
  endDate: Date;
  name: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: Date;
  type: "announcement" | "update" | "event";
}

export type LanguageCode = "en" | "dv" | "hi" | "bn";

export interface AppSettings {
  notifications: boolean;
  sound: boolean;
  music: boolean;
  language: LanguageCode;
}
