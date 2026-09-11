// lib/playerCode.ts
//
// Every player gets a short, human-shareable unique code (shown on their
// profile) used for two things: an admin can look a player up by it to
// credit coins directly (see lib/coinTopups.ts's adminTopUp/findPlayerByCode),
// and any player can use it to find a specific friend by exact code instead
// of guessing their display name (see lib/friends.ts's searchPlayers).
//
// Generated client-side the first time a player's doc is created or backfilled
// (see contexts/AuthContext.tsx) - there's no backend here to guarantee global
// uniqueness, so this leans on a large character space (31^7 ≈ 27 billion
// combinations) rather than a reservation scheme. Excludes visually
// ambiguous characters (0/O, 1/I/L) so it's easy to read aloud or retype.

const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 7;

export function generatePlayerCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

/** Loose validity check - used to decide whether a search string should also
 *  be tried as an exact player-code lookup (in addition to the normal
 *  display-name prefix search), since codes and names live in the same
 *  search box. */
export function looksLikePlayerCode(value: string): boolean {
  return /^[A-Z0-9]{5,10}$/i.test(value.trim());
}

/** Codes are stored/matched upper-case regardless of how the player typed
 *  or was shown it. */
export function normalizePlayerCode(value: string): string {
  return value.trim().toUpperCase();
}
