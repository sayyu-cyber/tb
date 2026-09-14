import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './admin';

/**
 * Scheduled maintenance jobs.
 *
 * Nothing in this file has ever run in production: the project was on the
 * Spark plan, which cannot deploy Cloud Functions at all, and the runtime was
 * pinned to Node 18, which Google decommissioned on 2025-10-30. Both are
 * fixed now (see package.json), so the next deploy is the first time this
 * code executes against real data. It has been rewritten accordingly rather
 * than merely ported - see the notes on each job.
 */

// Server-authoritative economy callables, re-exported so they deploy as part
// of this codebase. Admin init lives in ./admin (imported above), which is
// what makes the order safe regardless of how CommonJS hoists these requires.
export { purchaseCosmetic, purchaseRoomCard, creditTopup } from './economy';

/** Firestore caps a WriteBatch at 500 operations. The original versions of
 *  these jobs put every player in one batch, so they would have thrown the
 *  moment the game passed 500 players - a failure that would only have shown
 *  up in production, at the worst possible time. */
const BATCH_LIMIT = 450;

async function commitInChunks(
  refs: FirebaseFirestore.DocumentReference[],
  update: (ref: FirebaseFirestore.DocumentReference) => Record<string, unknown>
): Promise<number> {
  let written = 0;
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const ref of refs.slice(i, i + BATCH_LIMIT)) {
      batch.update(ref, update(ref));
    }
    await batch.commit();
    written += Math.min(BATCH_LIMIT, refs.length - i);
  }
  return written;
}

function generateDailyMissions() {
  const templates = [
    { id: 'dm_play_1', title: 'Play 1 Match', description: 'Play any match', target: 1, reward: 15, type: 'play_match' },
    { id: 'dm_win_1', title: 'Win 1 Match', description: 'Win any match', target: 1, reward: 30, type: 'win_match' },
    { id: 'dm_play_mindi', title: 'Play Mindi', description: 'Play a Mindi match', target: 1, reward: 20, type: 'play_game', gameType: 'mindi' },
    { id: 'dm_play_gin', title: 'Play Gin Rummy', description: 'Play a Gin Rummy match', target: 1, reward: 20, type: 'play_game', gameType: 'gin_rummy' },
    { id: 'dm_win_2', title: 'Win 2 Matches', description: 'Win 2 matches today', target: 2, reward: 50, type: 'win_matches' },
    { id: 'dm_play_3', title: 'Play 3 Matches', description: 'Play 3 matches today', target: 3, reward: 40, type: 'play_matches' },
  ];
  const shuffled = [...templates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map((template, index) => ({
    ...template,
    progress: 0,
    completed: false,
    id: `${template.id}_${Date.now()}_${index}`,
  }));
}

function generateWeeklyMissions() {
  const templates = [
    { id: 'wm_win_10', title: 'Win 10 Matches', description: 'Win 10 matches this week', target: 10, reward: 200 },
    { id: 'wm_play_20', title: 'Play 20 Matches', description: 'Play 20 matches this week', target: 20, reward: 150 },
    { id: 'wm_reach_silver', title: 'Reach Silver', description: 'Achieve Silver rank', target: 1, reward: 300 },
    { id: 'wm_reach_gold', title: 'Reach Gold', description: 'Achieve Gold rank', target: 1, reward: 500 },
    { id: 'wm_reach_platinum', title: 'Reach Platinum', description: 'Achieve Platinum rank', target: 1, reward: 1000 },
    { id: 'wm_weekend_champ', title: 'Weekend Champion', description: 'Become Weekend Champion', target: 1, reward: 2000 },
  ];
  const shuffled = [...templates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map((template, index) => ({
    ...template,
    progress: 0,
    completed: false,
    id: `${template.id}_${Date.now()}_${index}`,
  }));
}

export const dailyMissionReset = onSchedule(
  { schedule: '0 0 * * *', timeZone: 'Indian/Maldives' },
  async () => {
    const snapshot = await db.collection('playerEconomy').get();
    const written = await commitInChunks(
      snapshot.docs.map((d) => d.ref),
      () => ({
        'missions.daily': generateDailyMissions(),
        'missions.lastDailyReset': Date.now(),
      })
    );
    logger.info(`Reset daily missions for ${written} players`);
  }
);

export const weeklyMissionReset = onSchedule(
  { schedule: '0 0 * * 0', timeZone: 'Indian/Maldives' },
  async () => {
    const snapshot = await db.collection('playerEconomy').get();
    const written = await commitInChunks(
      snapshot.docs.map((d) => d.ref),
      () => ({
        'missions.weekly': generateWeeklyMissions(),
        'missions.lastWeeklyReset': Date.now(),
      })
    );
    logger.info(`Reset weekly missions for ${written} players`);
  }
);

/** ISO-ish week stamp ("2026-W37"), used to make the payout idempotent. */
function weekKey(date: Date): string {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Thursday of the current week decides the ISO year.
  target.setUTCDate(target.getUTCDate() + 3 - ((target.getUTCDay() + 6) % 7));
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 3 - ((firstThursday.getUTCDay() + 6) % 7));
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const RANK_REWARDS: Record<string, number> = {
  Bronze: 50,
  Silver: 150,
  Gold: 350,
  Platinum: 700,
};

/**
 * Weekly rank payout.
 *
 * ⚠️ DO NOT DEPLOY THIS FUNCTION UNTIL THE CLIENT PATH IS REMOVED.
 * `EconomyContext`'s `checkAndClaimWeeklyRank` still grants this reward from
 * the browser. With both live, every player is paid twice. Deleting the
 * client path is part of the "rewire the client onto Cloud Functions" task;
 * until then, deploy the two mission-reset jobs only:
 *
 *     firebase deploy --only functions:dailyMissionReset,functions:weeklyMissionReset
 *
 * Two bugs fixed here versus the original:
 *
 * 1. It read the rank from `playerEconomy/{uid}.profile.rank`, which is set
 *    to 'Bronze' at account creation and then NEVER written again. Every
 *    player - Platinum included - would have been paid the Bronze rate. The
 *    authoritative rank is `players/{uid}.currentRank`, written by
 *    lib/trophyUpdates.ts, so that is what this reads now.
 * 2. It had no idempotency guard, so a retry (or a manual re-run) paid
 *    everyone again. A week stamp is now recorded and re-checked.
 */
export const weeklyRankRewards = onSchedule(
  { schedule: '59 23 * * 4', timeZone: 'Indian/Maldives' },
  async () => {
    const stamp = weekKey(new Date());

    // Two collection reads rather than one-per-player: ranks live in
    // `players`, balances in `playerEconomy`.
    const [economySnap, playersSnap] = await Promise.all([
      db.collection('playerEconomy').get(),
      db.collection('players').get(),
    ]);

    const rankByUid = new Map<string, string>();
    playersSnap.docs.forEach((d) => rankByUid.set(d.id, d.data().currentRank || 'Bronze'));

    let paid = 0;
    let skipped = 0;
    const pending = economySnap.docs.filter((d) => {
      if (d.data().weeklyRankReward?.lastPaidWeek === stamp) {
        skipped++;
        return false;
      }
      return true;
    });

    for (let i = 0; i < pending.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      for (const d of pending.slice(i, i + BATCH_LIMIT)) {
        const rank = rankByUid.get(d.id) || 'Bronze';
        const coins = RANK_REWARDS[rank] ?? RANK_REWARDS.Bronze;
        batch.update(d.ref, {
          // economy.coins is the single canonical balance (see the
          // single-balance migration in contexts/EconomyContext.tsx).
          'economy.coins': FieldValue.increment(coins),
          'economy.totalEarned': FieldValue.increment(coins),
          'weeklyRankReward.lastPaidWeek': stamp,
          'weeklyRankReward.lastClaimed': Date.now(),
          'weeklyRankReward.pending': true,
        });
        paid++;
      }
      await batch.commit();
    }

    logger.info(`Weekly rank rewards ${stamp}: paid ${paid}, already-paid ${skipped}`);
  }
);
