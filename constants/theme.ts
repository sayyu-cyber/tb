/**
 * Semantic colour assignments.
 *
 * The app was previously one colour (gold) repeated everywhere, so a Mindi
 * screen, a Gin Rummy screen, a casual queue and a Weekend League banner
 * were visually indistinguishable. Each domain now owns a hue from the
 * lagoon palette defined in styles/globals.css.
 *
 * Values are CSS `var(...)` references rather than hex, so they follow the
 * light/dark theme and can be retuned in one place. Use them with
 * Tailwind's arbitrary syntax:
 *
 *   <div className="text-[rgb(var(--lagoon))]" />
 *   <div style={{ "--accent": ACCENT.mindi } as CSSProperties} className="surface-accent" />
 */

/** Raw palette tokens, for `rgb(var(...))` interpolation. */
export const TOKEN = {
  gold: "var(--gold)",
  goldBright: "var(--gold-bright)",
  goldDeep: "var(--gold-deep)",
  lagoon: "var(--lagoon)",
  lagoonDeep: "var(--lagoon-deep)",
  coral: "var(--coral)",
  coralDeep: "var(--coral-deep)",
  deep: "var(--deep)",
  orchid: "var(--orchid)",
} as const;

/** Which hue represents each game. */
export const GAME_ACCENT = {
  mindi: TOKEN.lagoon,
  "gin-rummy": TOKEN.deep,
  gin_rummy: TOKEN.deep,
} as const;

/** Which hue represents each play mode / pool. */
export const MODE_ACCENT = {
  ranked: TOKEN.gold,
  casual: TOKEN.lagoon,
  weekend: TOKEN.coral,
  room: TOKEN.orchid,
  vip: TOKEN.orchid,
} as const;

/** Feedback states. */
export const STATE_ACCENT = {
  success: TOKEN.lagoon,
  danger: TOKEN.coralDeep,
  warning: TOKEN.gold,
  info: TOKEN.deep,
  live: TOKEN.coral,
} as const;

/**
 * Accent for a game id, tolerating both spellings used across the codebase
 * ("gin-rummy" in routes, "gin_rummy" in Firestore documents).
 */
export function accentForGame(gameId: string): string {
  return (GAME_ACCENT as Record<string, string>)[gameId] ?? TOKEN.gold;
}

/** Accent for a matchmaking pool value. */
export function accentForPool(pool?: string): string {
  return (MODE_ACCENT as Record<string, string>)[pool ?? "ranked"] ?? TOKEN.gold;
}
