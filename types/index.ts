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

/**
 * Which ranking the board is showing. Only periods backed by a real stored
 * field exist here - there is deliberately no 'monthly', because nothing in
 * `players/{uid}` tracks a monthly figure and inventing one from weekly or
 * lifetime data would be a fabricated ranking.
 */
export type LeaderboardPeriod = "weekly" | "allTime" | "friends";

export interface LeaderboardEntry {
  rank: number;
  uid: string;
  username: string;
  /** The figure this board is ordered by: `weeklyTrophies` on the weekly
   *  board, lifetime `trophies` on the all-time and friends boards. */
  trophies: number;
  avatar?: string;
  /** Preset id for the app's own avatar system (constants/profileCustomization). */
  avatarPreset?: string;
  /** Bronze | Silver | Gold | Platinum, from `players/{uid}.currentRank`. */
  currentRank?: string;
  totalMatches?: number;
  wins?: number;
  /** Whole percent, already rounded by lib/trophyUpdates.ts. */
  winPercentage?: number;
}

export interface LeaderboardMeta {
  period: LeaderboardPeriod;
  /** Monday key the weekly board is scoped to (lib/trophyUpdates.ts). */
  weekStartKey: string;
  /** Local-time instant the week key next rolls over. Note the reset itself
   *  is lazy and per-player - a player's weekly count only clears the next
   *  time they play after this moment. */
  nextResetAt: number;
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
