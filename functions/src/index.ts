import * as functions from 'firebase-functions/v1';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp();

const db = getFirestore();

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

export const dailyMissionReset = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('Indian/Maldives')
  .onRun(async (context: functions.EventContext) => {
    const snapshot = await db.collection('playerEconomy').get();
    const batch = db.batch();
    snapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const ref = db.collection('playerEconomy').doc(doc.id);
      batch.update(ref, {
        'missions.daily': generateDailyMissions(),
        'missions.lastDailyReset': Date.now(),
      });
    });
    await batch.commit();
    console.log(`Reset daily missions for ${snapshot.size} players`);
  });

export const weeklyMissionReset = functions.pubsub
  .schedule('0 0 * * 0')
  .timeZone('Indian/Maldives')
  .onRun(async (context: functions.EventContext) => {
    const snapshot = await db.collection('playerEconomy').get();
    const batch = db.batch();
    snapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const ref = db.collection('playerEconomy').doc(doc.id);
      batch.update(ref, {
        'missions.weekly': generateWeeklyMissions(),
        'missions.lastWeeklyReset': Date.now(),
      });
    });
    await batch.commit();
    console.log(`Reset weekly missions for ${snapshot.size} players`);
  });

export const weeklyRankRewards = functions.pubsub
  .schedule('59 23 * * 4')
  .timeZone('Indian/Maldives')
  .onRun(async (context: functions.EventContext) => {
    const snapshot = await db.collection('playerEconomy').get();
    const rankRewards: Record<string, number> = {
      Bronze: 50,
      Silver: 150,
      Gold: 350,
      Platinum: 700,
    };
    const batch = db.batch();
    snapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      const rank = data.profile?.rank || 'Bronze';
      const coins = rankRewards[rank] || 50;
      const ref = db.collection('playerEconomy').doc(doc.id);
      batch.update(ref, {
        'profile.coins': FieldValue.increment(coins),
        'economy.totalEarned': FieldValue.increment(coins),
        'weeklyRankReward.lastClaimed': Date.now(),
        'weeklyRankReward.pending': true,
      });
    });
    await batch.commit();
    console.log(`Distributed rank rewards to ${snapshot.size} players`);
  });
