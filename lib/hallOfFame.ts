// lib/hallOfFame.ts
//
// Hall of Fame (GDD Version 1.5): a permanent record of the best players,
// distinct from the regular Leaderboard (hooks/useLeaderboard.ts), which
// ranks players by their *current* trophies - a number that goes down
// after a loss. The Hall of Fame instead ranks by `peakTrophies`
// (lib/trophyUpdates.ts), the highest trophy count a player has ever
// reached, which only ever increases. That makes it a fair "best ever"
// record without needing a season-end snapshot job.
//
// Query uses a single Firestore-side orderBy (no composite index needed),
// same pattern used everywhere else in this project.

import { collection, getDocs, addDoc, deleteDoc, doc, limit, orderBy, query, onSnapshot, Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface HallOfFameEntry {
  uid: string;
  displayName: string;
  peakTrophies: number;
  highestRank: string;
  wins: number;
  totalMatches: number;
  favoriteGame: string | null;
  /** True for entries the admin panel added by hand (a team, a legacy
   *  player from before this system existed, etc) rather than a real
   *  account's computed peakTrophies. See hallOfFameManual collection. */
  isManual?: boolean;
}

const HALL_OF_FAME_SIZE = 50;
const MANUAL_COLLECTION = "hallOfFameManual";

export interface ManualHallOfFameEntry {
  id: string;
  displayName: string;
  peakTrophies: number;
  note: string;
  addedAt: number;
}

/**
 * Admin panel: manually add a player or team to the Hall of Fame - "ability
 * to ... add players, teams to hall of fame." These are additive entries
 * layered on top of the real computed ranking below, not a replacement for
 * it - real player data is never rewritten this way.
 */
export async function addManualHallOfFameEntry(displayName: string, peakTrophies: number, note: string): Promise<void> {
  await addDoc(collection(db, MANUAL_COLLECTION), {
    displayName: displayName.trim().slice(0, 40),
    peakTrophies,
    note: note.trim().slice(0, 100),
    addedAt: Date.now(),
  });
}

export async function removeManualHallOfFameEntry(id: string): Promise<void> {
  await deleteDoc(doc(db, MANUAL_COLLECTION, id));
}

export function watchManualHallOfFameEntries(onUpdate: (entries: ManualHallOfFameEntry[]) => void): Unsubscribe {
  return onSnapshot(collection(db, MANUAL_COLLECTION), (snap) => {
    onUpdate(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ManualHallOfFameEntry, "id">) })));
  });
}

/**
 * "Reset Hall of Fame" is scoped to clearing these manual entries - wiping
 * every real player's peakTrophies at scale isn't something this
 * client-only app can safely do (that's a Cloud Function job: thousands of
 * individual writes with no way to guarantee it finishes if the admin
 * closes the tab). See lib/admin.ts's file-level comment for the same
 * caveat applied elsewhere.
 */
export async function resetManualHallOfFame(): Promise<void> {
  const snap = await getDocs(collection(db, MANUAL_COLLECTION));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

export async function getHallOfFame(limitCount = HALL_OF_FAME_SIZE): Promise<HallOfFameEntry[]> {
  const q = query(collection(db, "players"), orderBy("peakTrophies", "desc"), limit(limitCount));
  const [snap, manualSnap] = await Promise.all([getDocs(q), getDocs(collection(db, MANUAL_COLLECTION))]);

  const computed: HallOfFameEntry[] = snap.docs
    .map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        displayName: data.displayName || "Player",
        peakTrophies: typeof data.peakTrophies === "number" ? data.peakTrophies : data.trophies || 0,
        highestRank: data.highestRank || "Bronze",
        wins: data.wins || 0,
        totalMatches: data.totalMatches || 0,
        favoriteGame: data.favoriteGame || null,
      };
    })
    // Players who last played before this field existed have peakTrophies
    // === 0 even if they have trophies - filter those out rather than show
    // a misleading zero at the top of an empty section.
    .filter((entry) => entry.peakTrophies > 0 || entry.totalMatches > 0);

  const manual: HallOfFameEntry[] = manualSnap.docs.map((d) => {
    const data = d.data() as Omit<ManualHallOfFameEntry, "id">;
    return {
      uid: `manual_${d.id}`,
      displayName: data.displayName,
      peakTrophies: data.peakTrophies,
      highestRank: "—",
      wins: 0,
      totalMatches: 0,
      favoriteGame: null,
      isManual: true,
    };
  });

  return [...computed, ...manual].sort((a, b) => b.peakTrophies - a.peakTrophies).slice(0, limitCount);
}
