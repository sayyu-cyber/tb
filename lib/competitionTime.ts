// Wallet/trophy/cap periods use UTC, matching date_trunc('week', ... at time zone 'UTC').
// The product's league schedule is Maldives time (UTC+05:00, with no DST).
export const LEAGUE_TIME_ZONE = "Indian/Maldives";
const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;
const MALDIVES_OFFSET_MS = 5 * 60 * 60 * 1000;

export function getDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getWeekStartKey(date: Date = new Date()): string {
  const monday = new Date(date);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  return getDayKey(monday);
}

export function nextUtcMidnight(date: Date = new Date()): number {
  return Date.parse(`${getDayKey(date)}T00:00:00Z`) + DAY_MS;
}

export function nextWeekResetAt(date: Date = new Date()): number {
  return Date.parse(`${getWeekStartKey(date)}T00:00:00Z`) + WEEK_MS;
}

export function getLeagueDay(date: Date = new Date()): number {
  return new Date(date.getTime() + MALDIVES_OFFSET_MS).getUTCDay();
}

export interface LeagueWindow {
  live: boolean;
  boundary: Date;
  msRemaining: number;
}

export function getLeagueWindow(now: Date = new Date()): LeagueWindow {
  const local = new Date(now.getTime() + MALDIVES_OFFSET_MS);
  const sunday = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - local.getUTCDay());
  const position = local.getTime() - sunday;
  const open = 4 * DAY_MS + (23 * 60 + 59) * 60_000;
  const close = 5 * 60_000;
  const live = position < close || position >= open;
  const boundaryLocal = position < close ? sunday + close
    : position >= open ? sunday + WEEK_MS + close : sunday + open;
  const boundary = new Date(boundaryLocal - MALDIVES_OFFSET_MS);
  return { live, boundary, msRemaining: boundary.getTime() - now.getTime() };
}

export function formatLeagueBoundary(date: Date): string {
  return date.toLocaleString("en-US", {
    timeZone: LEAGUE_TIME_ZONE, weekday: "long", hour: "2-digit", minute: "2-digit",
  });
}
