/**
 * Turning the phone for the player — design/arena/MOBILE.md "Android turns
 * the table for you".
 *
 * The tables are landscape compositions. Rather than only asking, the app
 * turns the screen itself where the platform allows it: Chrome on Android
 * and the installed app let a page lock the orientation, but only from
 * fullscreen, and only inside a user gesture. So the Play tap does both
 * calls, in that order, and the rotate sheet is the fallback for everywhere
 * else - iPhone, desktop, or a refusal.
 *
 * Nothing here reports failure to the player. A phone that cannot turn
 * itself is not an error state; it just means the sheet stays up and they
 * turn it by hand, which is the same thing the sheet was already asking for.
 */

/**
 * The `screen.orientation` API, which TypeScript's lib.dom only half has: it
 * declares `unlock` but not `lock`, and neither exists on iOS Safari, so both
 * are optional here and every call site checks.
 */
interface LockableOrientation extends Omit<ScreenOrientation, "unlock"> {
  lock?: (orientation: "landscape" | "portrait" | "any" | "natural") => Promise<void>;
  unlock?: () => void;
}

function orientation(): LockableOrientation | null {
  if (typeof screen === "undefined") return null;
  return (screen.orientation as LockableOrientation | undefined) ?? null;
}

/**
 * Whether this browser can turn the screen itself. Drives the "Go landscape"
 * button, which MOBILE.md says appears only where the lock exists - offering
 * it on an iPhone would be a button that does nothing.
 */
export function canLockOrientation(): boolean {
  return typeof orientation()?.lock === "function";
}

/**
 * Set only when this app put the document into fullscreen. Without it,
 * leaving a match would drop a player out of a fullscreen they had chosen
 * themselves from the browser's own menu.
 */
let weEnteredFullscreen = false;

/**
 * Fullscreen, then landscape. Must be called synchronously from a real tap:
 * both calls are gesture-gated, and a lock outside fullscreen is rejected.
 *
 * Returns true only when the screen is actually turning, so the caller can
 * tell "the phone is handling it" from "ask the player to turn it".
 */
export async function lockLandscape(): Promise<boolean> {
  const screenOrientation = orientation();
  if (typeof screenOrientation?.lock !== "function") return false;

  try {
    if (typeof document !== "undefined" && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      weEnteredFullscreen = true;
    }
  } catch {
    // Some browsers lock without fullscreen; the attempt below decides.
  }

  try {
    await screenOrientation.lock("landscape");
    return true;
  } catch {
    // Refused. Undo the fullscreen we opened for it - a fullscreen portrait
    // page with no way back is worse than the sheet.
    await releaseLandscape();
    return false;
  }
}

/**
 * Give the orientation back and leave fullscreen, when the player leaves the
 * match or stops looking for a table. Safe to call when nothing was locked;
 * both calls are no-ops then.
 */
export async function releaseLandscape(): Promise<void> {
  try { orientation()?.unlock?.(); } catch { /* nothing was locked */ }
  if (!weEnteredFullscreen) return;
  weEnteredFullscreen = false;
  try {
    if (typeof document !== "undefined" && document.fullscreenElement) await document.exitFullscreen();
  } catch { /* already out */ }
}
