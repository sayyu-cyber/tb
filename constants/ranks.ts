export const RANKS = {
  BRONZE: { name: "Bronze", min: 0, max: 24, color: "#CD7F32" },
  SILVER: { name: "Silver", min: 25, max: 49, color: "#C0C0C0" },
  GOLD: { name: "Gold", min: 50, max: 74, color: "#D4AF37" },
  PLATINUM: { name: "Platinum", min: 75, max: Infinity, color: "#E5E4E2" },
} as const;

export const TROPHY_WIN = 5;
export const TROPHY_LOSS = -2;

export const FREE_DAILY_MATCHES = 3;
export const FREE_WEEKLY_MAX = 15;
export const VIP_DAILY_MATCHES = 4; // placeholder

export const RANKED_DAYS = [0, 1, 2, 3, 4]; // Sun-Thu (0=Sun, 4=Thu)
export const WEEKEND_LEAGUE_DAYS = [5, 6]; // Fri-Sat

export const BOT_NAMES = [
  "Ahmed", "Ali", "Hussain", "Ibrahim", "Ismail",
  "Mariyam", "Fathimath", "Aishath", "Shifa", "Rasheed"
];

export const getRankFromTrophies = (trophies: number): string => {
  if (trophies >= RANKS.PLATINUM.min) return RANKS.PLATINUM.name;
  if (trophies >= RANKS.GOLD.min) return RANKS.GOLD.name;
  if (trophies >= RANKS.SILVER.min) return RANKS.SILVER.name;
  return RANKS.BRONZE.name;
};
