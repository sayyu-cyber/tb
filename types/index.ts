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
}

export interface LeaderboardEntry {
  rank: number;
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

export interface AppSettings {
  notifications: boolean;
  sound: boolean;
  music: boolean;
  darkTheme: boolean;
}
