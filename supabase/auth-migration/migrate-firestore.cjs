#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

const root = path.resolve(__dirname, "../..");
const toolRequire = createRequire(path.join(__dirname, "tools/firebase-to-supabase/package.json"));
const admin = toolRequire("firebase-admin");
const { Client } = toolRequire("pg");

const paths = {
  firebaseService: path.join(__dirname, "secrets/firebase-service.json"),
  supabaseService: path.join(__dirname, "secrets/supabase-service.json"),
};

const tableOrder = [
  "profiles",
  "player_stats",
  "ranked_progress",
  "wallets",
  "equipped_cosmetics",
  "vip_entitlements",
  "inventory_items",
  "coin_transactions",
  "room_cards",
  "user_missions",
  "user_achievements",
  "daily_rewards",
  "friend_requests",
  "room_invites",
  "blocks",
  "chat_rooms",
  "chat_participants",
  "messages",
  "clubs",
  "club_members",
  "club_messages",
  "matches",
  "match_players",
  "match_results",
  "game_rooms",
  "room_players",
  "room_bans",
  "matchmaking_queue",
  "coin_topup_requests",
  "app_config",
  "hall_of_fame_manual",
  "reports",
];

function ensureFile(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${path.relative(root, file)}`);
  }
}

function readJson(file) {
  ensureFile(file);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function connectFirebase() {
  const serviceAccount = readJson(paths.firebaseService);
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
    });
  }
  return admin.firestore();
}

function pgConfig() {
  const config = readJson(paths.supabaseService);
  return { ...config, ssl: { rejectUnauthorized: false } };
}

function asDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value._seconds === "number") {
    return new Date(value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1000000));
  }
  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1000000));
  }
  return null;
}

function iso(value, fallback = null) {
  const date = asDate(value);
  return date ? date.toISOString() : fallback;
}

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nonnegativeInt(value, fallback = 0) {
  return Math.max(0, Math.round(num(value, fallback)));
}

function text(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  const str = String(value).trim();
  return str ? str : fallback;
}

function limitedText(value, fallback, maxLength) {
  return text(value, fallback).slice(0, maxLength);
}

function bool(value) {
  return Boolean(value);
}

function json(value) {
  return value === undefined ? null : value;
}

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function gameType(value) {
  if (value === "gin-rummy" || value === "ginRummy" || value === "gin_rummy") return "gin_rummy";
  return "mindi";
}

function roomCardType(value) {
  return enumValue(value, ["1h", "3h", "6h", "24h", "1w", "1m"], null);
}

function mappedUid(mapping, firebaseUid, problems, context) {
  if (!firebaseUid) return null;
  const mapped = mapping.get(String(firebaseUid));
  if (!mapped) problems.push(`${context}: missing auth mapping for Firebase uid ${firebaseUid}`);
  return mapped || null;
}

async function loadMapping(client) {
  const result = await client.query("select firebase_uid, supabase_user_id from public.auth_migration_map");
  return new Map(result.rows.map((row) => [row.firebase_uid, row.supabase_user_id]));
}

async function readCollection(db, name) {
  const snapshot = await db.collection(name).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() || {} }));
}

async function readSubcollection(db, collection, docId, subcollection) {
  const snapshot = await db.collection(collection).doc(docId).collection(subcollection).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() || {} }));
}

async function loadSnapshot(db) {
  const names = [
    "players",
    "playerEconomy",
    "friendRequests",
    "roomInvites",
    "userBlocks",
    "dmConversations",
    "clubs",
    "rooms",
    "matches",
    "matchmakingQueue",
    "coinTopupRequests",
    "appConfig",
    "hallOfFameManual",
    "reports",
  ];
  const snapshot = {};
  for (const name of names) snapshot[name] = await readCollection(db, name);

  snapshot.dmMessages = new Map();
  for (const doc of snapshot.dmConversations) {
    snapshot.dmMessages.set(doc.id, await readSubcollection(db, "dmConversations", doc.id, "messages"));
  }

  snapshot.clubMessages = new Map();
  for (const doc of snapshot.clubs) {
    snapshot.clubMessages.set(doc.id, await readSubcollection(db, "clubs", doc.id, "messages"));
  }

  return snapshot;
}

function blankCounts() {
  return Object.fromEntries(tableOrder.map((name) => [name, 0]));
}

function inc(counts, name, amount = 1) {
  counts[name] = (counts[name] || 0) + amount;
}

function mapCollectionItem(category, item) {
  if (!item) return null;
  if (typeof item === "string") return { item_id: item, category };
  if (typeof item === "object") return { item_id: text(item.id || item.itemId || item.key || item.name), category: text(item.category, category) };
  return null;
}

function economyDocRows(doc, userId, counts, problems) {
  const data = doc.data;
  const profile = data.profile || {};
  const economy = data.economy || {};
  const equipped = profile.equipped || {};
  const vip = profile.vip || data.vip || {};
  const collection = profile.collection || {};
  const rows = {
    wallet: {
      user_id: userId,
      coins: nonnegativeInt(economy.coins ?? data.coins, 0),
      total_earned: nonnegativeInt(economy.totalEarned ?? data.totalEarned, 0),
      total_spent: nonnegativeInt(economy.totalSpent ?? data.totalSpent, 0),
      updated_at: iso(data.updatedAt, new Date().toISOString()),
    },
    equipped: {
      user_id: userId,
      card_back: text(equipped.cardBack, "cb_default"),
      table_theme: text(equipped.tableTheme, "tt_default"),
      profile_frame: text(equipped.profileFrame, "pf_default"),
      title: text(equipped.title, "Novice"),
      victory_animation: text(equipped.victoryAnimation, "va_default"),
      banner: text(equipped.banner, "bn_default"),
      updated_at: iso(data.updatedAt, new Date().toISOString()),
    },
    vip: null,
    inventory: [],
    transactions: [],
    roomCards: [],
    missions: [],
    achievements: [],
    dailyRewards: [],
  };
  inc(counts, "wallets");
  inc(counts, "equipped_cosmetics");

  if (vip.active || vip.expiresAt) {
    rows.vip = {
      user_id: userId,
      active: bool(vip.active),
      expires_at: iso(vip.expiresAt),
      activated_at: iso(vip.activatedAt),
    };
    inc(counts, "vip_entitlements");
  }

  const categories = {
    cardBacks: "cardBack",
    tableThemes: "tableTheme",
    profileFrames: "profileFrame",
    emotes: "emote",
    victoryAnimations: "victoryAnimation",
    stickers: "sticker",
    banners: "banner",
  };
  for (const [key, category] of Object.entries(categories)) {
    for (const raw of Array.isArray(collection[key]) ? collection[key] : []) {
      const item = mapCollectionItem(category, raw);
      if (!item?.item_id) continue;
      rows.inventory.push({
        user_id: userId,
        item_id: item.item_id,
        category: item.category,
        acquired_at: iso(raw.acquiredAt || raw.createdAt, new Date().toISOString()),
        source: text(raw.source, "firebase"),
      });
      inc(counts, "inventory_items");
    }
  }

  for (const tx of Array.isArray(economy.transactions) ? economy.transactions : []) {
    const rawAmount = Math.round(num(tx.amount, 0));
    const amount = Math.abs(rawAmount);
    if (!amount) continue;
    rows.transactions.push({
      user_id: userId,
      amount,
      type: rawAmount < 0 ? "spend" : "earn",
      source: text(tx.source, "firebase"),
      description: text(tx.description || tx.label, "Firebase migration"),
      created_at: iso(tx.createdAt || tx.date, new Date().toISOString()),
      metadata: json({ firebase_id: tx.id || null, raw: tx }),
    });
    inc(counts, "coin_transactions");
  }

  for (const card of Array.isArray(profile.roomCards) ? profile.roomCards : []) {
    const type = roomCardType(card.type || card.id);
    if (!type) {
      problems.push(`playerEconomy/${doc.id}: skipped invalid room card type ${card.type || card.id}`);
      continue;
    }
    rows.roomCards.push({
      user_id: userId,
      type,
      purchased_at: iso(card.purchasedAt || card.createdAt, new Date().toISOString()),
      activated_at: iso(card.activatedAt),
      expires_at: iso(card.expiresAt),
      source: text(card.source, "firebase"),
    });
    inc(counts, "room_cards");
  }

  const missionGroups = [
    ["daily", data.missions?.daily],
    ["weekly", data.missions?.weekly],
  ];
  for (const [period, missions] of missionGroups) {
    for (const mission of Array.isArray(missions) ? missions : []) {
      const templateId = text(mission.templateId || mission.id);
      if (!templateId) continue;
      rows.missions.push({
        user_id: userId,
        cadence: period,
        template_id: templateId,
        title: text(mission.title, templateId),
        description: text(mission.description, ""),
        target: Math.max(1, Math.round(num(mission.target, 1))),
        progress: nonnegativeInt(mission.progress, 0),
        completed: bool(mission.completed),
        reward: nonnegativeInt(mission.rewardCoins ?? mission.reward, 0),
        reward_cosmetic_id: text(mission.rewardCosmeticId),
        generated_at: iso(mission.generatedAt || data.missions?.lastDailyReset || data.missions?.lastWeeklyReset, new Date().toISOString()),
        completed_at: iso(mission.completedAt),
      });
      inc(counts, "user_missions");
    }
  }

  const achievements = Array.isArray(data.achievements) ? data.achievements : Array.isArray(profile.achievements) ? profile.achievements : [];
  for (const achievement of achievements) {
    const item = typeof achievement === "string" ? { id: achievement, unlocked: true } : achievement;
    const achievementId = text(item.id || item.achievementId);
    if (!achievementId) continue;
    rows.achievements.push({
      user_id: userId,
      achievement_id: achievementId,
      progress: Math.round(num(item.progress, item.unlocked ? 1 : 0)),
      target: Math.max(1, Math.round(num(item.target, 1))),
      unlocked_at: iso(item.unlockedAt || (item.unlocked ? item.createdAt : null)),
    });
    inc(counts, "user_achievements");
  }

  const login = data.dailyLogin || {};
  const rewards = Array.isArray(login.rewards) ? login.rewards : [];
  rewards.forEach((reward, index) => {
    rows.dailyRewards.push({
      user_id: userId,
      reward_day: Math.min(7, Math.max(1, Math.round(num(reward.day, index + 1)))),
      claimed_at: iso(reward.claimedAt || login.lastClaimed),
      cycle_started_at: iso(login.cycleStartedAt || login.lastClaimed || reward.claimedAt, new Date().toISOString()),
    });
    inc(counts, "daily_rewards");
  });
  if (!rewards.length && login.lastClaimed) {
    rows.dailyRewards.push({
      user_id: userId,
      reward_day: Math.min(7, Math.max(1, Math.round(num(login.streak, 1)))),
      claimed_at: iso(login.lastClaimed),
      cycle_started_at: iso(login.cycleStartedAt || login.lastClaimed, new Date().toISOString()),
    });
    inc(counts, "daily_rewards");
  }

  return rows;
}

function buildPlan(snapshot, mapping) {
  const counts = blankCounts();
  const problems = [];
  const plan = {
    profiles: [],
    playerStats: [],
    rankedProgress: [],
    wallets: [],
    equipped: [],
    vip: [],
    inventory: [],
    transactions: [],
    roomCards: [],
    missions: [],
    achievements: [],
    dailyRewards: [],
    friendRequests: [],
    roomInvites: [],
    blocks: [],
    dmConversations: [],
    clubs: [],
    matches: [],
    rooms: [],
    matchmakingQueue: [],
    coinTopups: [],
    appConfig: [],
    hallOfFame: [],
    reports: [],
  };

  for (const doc of snapshot.players) {
    const userId = mappedUid(mapping, doc.id, problems, `players/${doc.id}`);
    if (!userId) continue;
    const data = doc.data;
    plan.profiles.push({
      id: userId,
      display_name: text(data.displayName, "Player"),
      photo_url: text(data.photoURL),
      avatar_preset: text(data.avatarPreset),
      banner_preset: text(data.bannerPreset),
      player_code: text(data.playerCode),
      last_seen: iso(data.lastSeen),
      created_at: iso(data.createdAt, new Date().toISOString()),
      updated_at: iso(data.updatedAt, new Date().toISOString()),
    });
    plan.playerStats.push({
      user_id: userId,
      total_matches: nonnegativeInt(data.totalMatches, 0),
      wins: nonnegativeInt(data.wins, 0),
      losses: nonnegativeInt(data.losses, 0),
      win_percentage: Math.round(num(data.winPercentage, 0)),
      favorite_game: text(data.favoriteGame),
      peak_trophies: nonnegativeInt(data.peakTrophies ?? data.trophies, 0),
      highest_rank: text(data.highestRank, "Unranked"),
      updated_at: iso(data.updatedAt, new Date().toISOString()),
    });
    plan.rankedProgress.push({
      user_id: userId,
      trophies: nonnegativeInt(data.trophies, 0),
      weekly_trophies: nonnegativeInt(data.weeklyTrophies, 0),
      week_start: iso(data.weekStart, new Date().toISOString()).slice(0, 10),
      current_rank: text(data.currentRank, "Bronze"),
      highest_rank: text(data.highestRank, "Bronze"),
      updated_at: iso(data.updatedAt, new Date().toISOString()),
    });
    inc(counts, "profiles");
    inc(counts, "player_stats");
    inc(counts, "ranked_progress");
  }

  for (const doc of snapshot.playerEconomy) {
    const userId = mappedUid(mapping, doc.id, problems, `playerEconomy/${doc.id}`);
    if (!userId) continue;
    const rows = economyDocRows(doc, userId, counts, problems);
    plan.wallets.push(rows.wallet);
    plan.equipped.push(rows.equipped);
    if (rows.vip) plan.vip.push(rows.vip);
    plan.inventory.push(...rows.inventory);
    plan.transactions.push(...rows.transactions);
    plan.roomCards.push(...rows.roomCards);
    plan.missions.push(...rows.missions);
    plan.achievements.push(...rows.achievements);
    plan.dailyRewards.push(...rows.dailyRewards);
  }

  for (const doc of snapshot.friendRequests) {
    const from = mappedUid(mapping, doc.data.from, problems, `friendRequests/${doc.id}.from`);
    const to = mappedUid(mapping, doc.data.to, problems, `friendRequests/${doc.id}.to`);
    if (!from || !to) continue;
    plan.friendRequests.push({
      from_user_id: from,
      to_user_id: to,
      status: enumValue(doc.data.status, ["pending", "accepted", "declined"], "pending"),
      created_at: iso(doc.data.createdAt, new Date().toISOString()),
      updated_at: iso(doc.data.updatedAt || doc.data.createdAt, new Date().toISOString()),
    });
    inc(counts, "friend_requests");
  }

  for (const doc of snapshot.roomInvites) {
    const from = mappedUid(mapping, doc.data.from, problems, `roomInvites/${doc.id}.from`);
    const to = mappedUid(mapping, doc.data.to, problems, `roomInvites/${doc.id}.to`);
    if (!from || !to) continue;
    plan.roomInvites.push({
      from_user_id: from,
      to_user_id: to,
      room_code: text(doc.data.code || doc.data.roomCode, ""),
      game_type: gameType(doc.data.gameType),
      created_at: iso(doc.data.createdAt, new Date().toISOString()),
    });
    inc(counts, "room_invites");
  }

  for (const doc of snapshot.userBlocks) {
    const blocker = mappedUid(mapping, doc.id, problems, `userBlocks/${doc.id}`);
    if (!blocker) continue;
    for (const blockedUid of Array.isArray(doc.data.blocked) ? doc.data.blocked : []) {
      const blocked = mappedUid(mapping, blockedUid, problems, `userBlocks/${doc.id}.blocked`);
      if (!blocked || blocked === blocker) continue;
      plan.blocks.push({ blocker_id: blocker, blocked_id: blocked });
      inc(counts, "blocks");
    }
  }

  for (const doc of snapshot.dmConversations) {
    const participants = (Array.isArray(doc.data.participants) ? doc.data.participants : []).map((uid) =>
      mappedUid(mapping, uid, problems, `dmConversations/${doc.id}.participants`),
    ).filter(Boolean);
    if (participants.length < 2) continue;
    plan.dmConversations.push({
      firebaseId: doc.id,
      room: {
        type: "dm",
        last_message: text(doc.data.lastMessage),
        last_message_at: iso(doc.data.lastMessageAt),
        last_sender_id: mappedUid(mapping, doc.data.lastSenderUid, [], `dmConversations/${doc.id}.lastSenderUid`),
        metadata: { firebase_id: doc.id },
      },
      participants: participants.map((userId, index) => ({
        user_id: userId,
        display_name: Array.isArray(doc.data.participantNames) ? text(doc.data.participantNames[index], "Player") : "Player",
        last_read_at: doc.data.lastReadAt?.[userId] ? iso(doc.data.lastReadAt[userId]) : null,
      })),
      messages: (snapshot.dmMessages.get(doc.id) || []).map((message) => ({
        sender_id: mappedUid(mapping, message.data.senderUid, problems, `dmConversations/${doc.id}/messages/${message.id}`),
        text: limitedText(message.data.text, " ", 1000),
        created_at: iso(message.data.createdAt, new Date().toISOString()),
        metadata: { firebase_id: message.id },
      })).filter((message) => message.sender_id),
    });
    inc(counts, "chat_rooms");
    inc(counts, "chat_participants", participants.length);
    inc(counts, "messages", plan.dmConversations.at(-1).messages.length);
  }

  for (const doc of snapshot.clubs) {
    const owner = mappedUid(mapping, doc.data.ownerUid, problems, `clubs/${doc.id}.ownerUid`);
    if (!owner) continue;
    const memberUids = Array.isArray(doc.data.members) ? doc.data.members : [];
    const members = memberUids.map((uid, index) => {
      const userId = mappedUid(mapping, uid, problems, `clubs/${doc.id}.members`);
      if (!userId) return null;
      return {
        user_id: userId,
        display_name: Array.isArray(doc.data.memberNames) ? text(doc.data.memberNames[index], "Player") : "Player",
        trophies: Array.isArray(doc.data.memberTrophies) ? nonnegativeInt(doc.data.memberTrophies[index], 0) : 0,
        role: uid === doc.data.ownerUid ? "owner" : "member",
        joined_at: iso(doc.data.createdAt, new Date().toISOString()),
      };
    }).filter(Boolean);
    const clubMessages = (snapshot.clubMessages.get(doc.id) || []).map((message) => ({
      sender_id: mappedUid(mapping, message.data.senderUid || message.data.uid, problems, `clubs/${doc.id}/messages/${message.id}`),
      sender_name: text(message.data.senderName || message.data.displayName, "Player"),
      text: limitedText(message.data.text, " ", 1000),
      created_at: iso(message.data.createdAt, new Date().toISOString()),
      metadata: { firebase_id: message.id },
    })).filter((message) => message.sender_id);
    plan.clubs.push({
      firebaseId: doc.id,
      club: {
        name: limitedText(doc.data.name, "Club", 30),
        tag: limitedText(doc.data.tag, "CLUB", 5).padEnd(2, "X"),
        description: limitedText(doc.data.description, "", 200),
        owner_id: owner,
        created_at: iso(doc.data.createdAt, new Date().toISOString()),
      },
      members,
      messages: clubMessages,
    });
    inc(counts, "clubs");
    inc(counts, "club_members", members.length);
    inc(counts, "club_messages", clubMessages.length);
  }

  for (const doc of snapshot.matches) {
    const players = (Array.isArray(doc.data.players) ? doc.data.players : []).map((uid) =>
      mappedUid(mapping, uid, problems, `matches/${doc.id}.players`),
    ).filter(Boolean);
    const state = doc.data.state || {};
    const winnerUid = state.result?.winnerUid || doc.data.winnerUid || null;
    const winner = mappedUid(mapping, winnerUid, [], `matches/${doc.id}.winnerUid`);
    plan.matches.push({
      firebaseId: doc.id,
      match: {
        game_type: gameType(doc.data.gameType),
        pool: enumValue(doc.data.pool, ["ranked", "weekend", "casual"], "ranked"),
        status: enumValue(doc.data.status, ["active", "completed", "abandoned"], "active"),
        public_state: { ...state, _firebase_id: doc.id },
        created_at: iso(doc.data.createdAt, new Date().toISOString()),
        completed_at: iso(doc.data.completedAt || state.completedAt),
      },
      players: players.map((userId, index) => ({
        user_id: userId,
        seat_index: index,
        team: index % 2 === 0 ? "A" : "B",
        result: winner ? (winner === userId ? "win" : "loss") : null,
        created_at: iso(doc.data.createdAt, new Date().toISOString()),
      })),
      result: winner
        ? {
            winner_user_id: winner,
            winner_team: null,
            result: { firebase_id: doc.id, raw: state.result || null },
            created_at: iso(doc.data.completedAt || state.completedAt || doc.data.createdAt, new Date().toISOString()),
          }
        : null,
    });
    inc(counts, "matches");
    inc(counts, "match_players", players.length);
    if (winner) inc(counts, "match_results");
  }

  for (const doc of snapshot.rooms) {
    const owner = mappedUid(mapping, doc.data.ownerUid, problems, `rooms/${doc.id}.ownerUid`);
    if (!owner) continue;
    const playerUids = Array.isArray(doc.data.players) ? doc.data.players : [];
    const seatOrder = Array.isArray(doc.data.seatOrder) ? doc.data.seatOrder : playerUids;
    const roomPlayers = playerUids.map((uid, index) => {
      const userId = mappedUid(mapping, uid, problems, `rooms/${doc.id}.players`);
      if (!userId) return null;
      return {
        user_id: userId,
        display_name: Array.isArray(doc.data.playerNames) ? text(doc.data.playerNames[index], "Player") : "Player",
        seat_index: Math.max(0, seatOrder.indexOf(uid) >= 0 ? seatOrder.indexOf(uid) : index),
        joined_at: iso(doc.data.createdAt, new Date().toISOString()),
      };
    }).filter(Boolean);
    const bans = (Array.isArray(doc.data.bannedUids) ? doc.data.bannedUids : []).map((uid) =>
      mappedUid(mapping, uid, problems, `rooms/${doc.id}.bannedUids`),
    ).filter(Boolean);
    plan.rooms.push({
      room: {
        code: text(doc.data.code || doc.id, doc.id),
        game_type: gameType(doc.data.gameType),
        owner_id: owner,
        password_hash: text(doc.data.password),
        max_players: Math.min(4, Math.max(2, Math.round(num(doc.data.maxPlayers, 4)))),
        status: enumValue(doc.data.status, ["waiting", "started", "closed"], "waiting"),
        match_id: null,
        mode: enumValue(doc.data.mode, ["casual", "rankedDuo"], "casual"),
        mindi_mode: enumValue(doc.data.mindiMode, ["team2v2", "ffa1v1"], "team2v2"),
        created_at: iso(doc.data.createdAt, new Date().toISOString()),
      },
      matchFirebaseId: text(doc.data.matchId),
      players: roomPlayers,
      bans,
    });
    inc(counts, "game_rooms");
    inc(counts, "room_players", roomPlayers.length);
    inc(counts, "room_bans", bans.length);
  }

  for (const doc of snapshot.matchmakingQueue) {
    const userId = mappedUid(mapping, doc.data.uid || doc.id, problems, `matchmakingQueue/${doc.id}`);
    if (!userId) continue;
    plan.matchmakingQueue.push({
      user_id: userId,
      game_type: gameType(doc.data.gameType),
      pool: enumValue(doc.data.pool, ["ranked", "weekend", "casual"], "ranked"),
      party_id: text(doc.data.partyId),
      queued_at: iso(doc.data.queuedAt, new Date().toISOString()),
    });
    inc(counts, "matchmaking_queue");
  }

  for (const doc of snapshot.coinTopupRequests) {
    const userId = mappedUid(mapping, doc.data.uid || doc.data.userId, problems, `coinTopupRequests/${doc.id}`);
    if (!userId) continue;
    plan.coinTopups.push({
      user_id: userId,
      player_name: text(doc.data.playerName, "Player"),
      coins: Math.max(1, Math.round(num(doc.data.coins, 1))),
      price_mvr: num(doc.data.priceMVR ?? doc.data.price_mvr, 0),
      pack_name: text(doc.data.packName, "Coins"),
      status: enumValue(doc.data.status, ["pending", "approved", "rejected", "credited"], "pending"),
      created_at: iso(doc.data.createdAt, new Date().toISOString()),
      decided_at: iso(doc.data.decidedAt),
      credited_at: iso(doc.data.creditedAt),
    });
    inc(counts, "coin_topup_requests");
  }

  for (const doc of snapshot.appConfig) {
    plan.appConfig.push({ id: doc.id, value: doc.data, updated_at: iso(doc.data.updatedAt, new Date().toISOString()) });
    inc(counts, "app_config");
  }

  for (const doc of snapshot.hallOfFameManual) {
    plan.hallOfFame.push({
      display_name: limitedText(doc.data.displayName, "Player", 40),
      peak_trophies: nonnegativeInt(doc.data.peakTrophies, 0),
      note: limitedText(doc.data.note, "", 100),
      added_at: iso(doc.data.addedAt || doc.data.createdAt, new Date().toISOString()),
      added_by: null,
    });
    inc(counts, "hall_of_fame_manual");
  }

  for (const doc of snapshot.reports) {
    const reporter = mappedUid(mapping, doc.data.reporterUid, problems, `reports/${doc.id}.reporterUid`);
    const target = mappedUid(mapping, doc.data.targetUid, problems, `reports/${doc.id}.targetUid`);
    if (!reporter || !target) continue;
    plan.reports.push({
      reporter_id: reporter,
      target_id: target,
      reason: enumValue(doc.data.reason, ["harassment", "hate", "sexual", "spam", "cheating", "impersonation", "other"], "other"),
      context: enumValue(doc.data.context, ["message", "club", "profile", "match"], "profile"),
      evidence: doc.data.evidence ? limitedText(typeof doc.data.evidence === "string" ? doc.data.evidence : JSON.stringify(doc.data.evidence), "", 500) : null,
      details: limitedText(doc.data.details, "", 500),
      status: enumValue(doc.data.status, ["open", "actioned", "dismissed"], "open"),
      created_at: iso(doc.data.createdAt, new Date().toISOString()),
      resolved_at: iso(doc.data.resolvedAt),
      resolved_by: mappedUid(mapping, doc.data.resolvedBy, [], `reports/${doc.id}.resolvedBy`),
    });
    inc(counts, "reports");
  }

  return { counts, problems, plan };
}

async function one(client, sql, params) {
  const result = await client.query(sql, params);
  return result.rows[0];
}

async function importPlan(client, plan) {
  const matchIds = new Map();

  for (const row of plan.profiles) {
    await client.query(
      `insert into public.profiles (id, display_name, photo_url, avatar_preset, banner_preset, player_code, last_seen, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (id) do update set display_name = excluded.display_name, photo_url = excluded.photo_url,
       avatar_preset = excluded.avatar_preset, banner_preset = excluded.banner_preset, player_code = excluded.player_code,
       last_seen = excluded.last_seen, updated_at = excluded.updated_at`,
      [row.id, row.display_name, row.photo_url, row.avatar_preset, row.banner_preset, row.player_code, row.last_seen, row.created_at, row.updated_at],
    );
  }

  for (const row of plan.playerStats) {
    await client.query(
      `insert into public.player_stats (user_id,total_matches,wins,losses,win_percentage,favorite_game,peak_trophies,highest_rank,updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (user_id) do update set total_matches=$2,wins=$3,losses=$4,win_percentage=$5,favorite_game=$6,peak_trophies=$7,highest_rank=$8,updated_at=$9`,
      [row.user_id, row.total_matches, row.wins, row.losses, row.win_percentage, row.favorite_game, row.peak_trophies, row.highest_rank, row.updated_at],
    );
  }

  for (const row of plan.rankedProgress) {
    await client.query(
      `insert into public.ranked_progress (user_id,trophies,weekly_trophies,week_start,current_rank,highest_rank,updated_at)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (user_id) do update set trophies=$2,weekly_trophies=$3,week_start=$4,current_rank=$5,highest_rank=$6,updated_at=$7`,
      [row.user_id, row.trophies, row.weekly_trophies, row.week_start, row.current_rank, row.highest_rank, row.updated_at],
    );
  }

  for (const row of plan.wallets) {
    await client.query(
      `insert into public.wallets (user_id,coins,total_earned,total_spent,updated_at)
       values ($1,$2,$3,$4,$5)
       on conflict (user_id) do update set coins=$2,total_earned=$3,total_spent=$4,updated_at=$5`,
      [row.user_id, row.coins, row.total_earned, row.total_spent, row.updated_at],
    );
  }

  for (const row of plan.equipped) {
    await client.query(
      `insert into public.equipped_cosmetics (user_id,card_back,table_theme,profile_frame,title,victory_animation,banner,updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (user_id) do update set card_back=$2,table_theme=$3,profile_frame=$4,title=$5,victory_animation=$6,banner=$7,updated_at=$8`,
      [row.user_id, row.card_back, row.table_theme, row.profile_frame, row.title, row.victory_animation, row.banner, row.updated_at],
    );
  }

  for (const row of plan.vip) {
    await client.query(
      `insert into public.vip_entitlements (user_id,active,expires_at,activated_at)
       values ($1,$2,$3,$4)
       on conflict (user_id) do update set active=$2,expires_at=$3,activated_at=$4`,
      [row.user_id, row.active, row.expires_at, row.activated_at],
    );
  }

  for (const row of plan.inventory) {
    await client.query(
      `insert into public.inventory_items (user_id,item_id,category,acquired_at,source)
       values ($1,$2,$3,$4,$5)
       on conflict (user_id,item_id) do update set category=$3,acquired_at=$4,source=$5`,
      [row.user_id, row.item_id, row.category, row.acquired_at, row.source],
    );
  }

  for (const row of plan.transactions) {
    await client.query(
      `insert into public.coin_transactions (user_id,amount,type,source,description,created_at,metadata)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [row.user_id, row.amount, row.type, row.source, row.description, row.created_at, row.metadata],
    );
  }

  for (const row of plan.roomCards) {
    await client.query(
      `insert into public.room_cards (user_id,type,purchased_at,activated_at,expires_at,source)
       values ($1,$2,$3,$4,$5,$6)`,
      [row.user_id, row.type, row.purchased_at, row.activated_at, row.expires_at, row.source],
    );
  }

  for (const row of plan.missions) {
    await client.query(
      `insert into public.user_missions (user_id,cadence,template_id,title,description,target,progress,completed,reward,reward_cosmetic_id,generated_at,completed_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [row.user_id, row.cadence, row.template_id, row.title, row.description, row.target, row.progress, row.completed, row.reward, row.reward_cosmetic_id, row.generated_at, row.completed_at],
    );
  }

  for (const row of plan.achievements) {
    await client.query(
      `insert into public.user_achievements (user_id,achievement_id,progress,target,unlocked_at)
       values ($1,$2,$3,$4,$5)
       on conflict (user_id,achievement_id) do update set progress=$3,target=$4,unlocked_at=$5`,
      [row.user_id, row.achievement_id, row.progress, row.target, row.unlocked_at],
    );
  }

  for (const row of plan.dailyRewards) {
    await client.query(
      `insert into public.daily_rewards (user_id,reward_day,claimed_at,cycle_started_at)
       values ($1,$2,$3,$4)
       on conflict (user_id,reward_day,cycle_started_at) do update set claimed_at=$3`,
      [row.user_id, row.reward_day, row.claimed_at, row.cycle_started_at],
    );
  }

  for (const row of plan.friendRequests) {
    await client.query(
      `insert into public.friend_requests (from_user_id,to_user_id,status,created_at,updated_at)
       values ($1,$2,$3,$4,$5) on conflict do nothing`,
      [row.from_user_id, row.to_user_id, row.status, row.created_at, row.updated_at],
    );
  }

  for (const row of plan.roomInvites) {
    await client.query(
      `insert into public.room_invites (from_user_id,to_user_id,room_code,game_type,created_at)
       values ($1,$2,$3,$4,$5) on conflict do nothing`,
      [row.from_user_id, row.to_user_id, row.room_code, row.game_type, row.created_at],
    );
  }

  for (const row of plan.blocks) {
    await client.query(
      `insert into public.blocks (blocker_id,blocked_id) values ($1,$2) on conflict do nothing`,
      [row.blocker_id, row.blocked_id],
    );
  }

  for (const convo of plan.dmConversations) {
    const room = await one(
      client,
      `insert into public.chat_rooms (type,last_message,last_message_at,last_sender_id,metadata)
       values ($1,$2,$3,$4,$5) returning id`,
      [convo.room.type, convo.room.last_message, convo.room.last_message_at, convo.room.last_sender_id, convo.room.metadata],
    );
    for (const participant of convo.participants) {
      await client.query(
        `insert into public.chat_participants (room_id,user_id,display_name,last_read_at)
         values ($1,$2,$3,$4) on conflict do nothing`,
        [room.id, participant.user_id, participant.display_name, participant.last_read_at],
      );
    }
    for (const message of convo.messages) {
      await client.query(
        `insert into public.messages (room_id,sender_id,text,created_at)
         values ($1,$2,$3,$4)`,
        [room.id, message.sender_id, message.text, message.created_at],
      );
    }
  }

  for (const item of plan.clubs) {
    const club = await one(
      client,
      `insert into public.clubs (name,tag,description,owner_id,created_at)
       values ($1,$2,$3,$4,$5) returning id`,
      [item.club.name, item.club.tag, item.club.description, item.club.owner_id, item.club.created_at],
    );
    for (const member of item.members) {
      await client.query(
        `insert into public.club_members (club_id,user_id,display_name,trophies,role,joined_at)
         values ($1,$2,$3,$4,$5,$6) on conflict do nothing`,
        [club.id, member.user_id, member.display_name, member.trophies, member.role, member.joined_at],
      );
    }
    for (const message of item.messages) {
      await client.query(
        `insert into public.club_messages (club_id,sender_id,sender_name,text,created_at)
         values ($1,$2,$3,$4,$5)`,
        [club.id, message.sender_id, message.sender_name, message.text, message.created_at],
      );
    }
  }

  for (const item of plan.matches) {
    const match = await one(
      client,
      `insert into public.matches (game_type,pool,status,public_state,created_at,completed_at)
       values ($1,$2,$3,$4,$5,$6) returning id`,
      [item.match.game_type, item.match.pool, item.match.status, item.match.public_state, item.match.created_at, item.match.completed_at],
    );
    matchIds.set(item.firebaseId, match.id);
    for (const player of item.players) {
      await client.query(
        `insert into public.match_players (match_id,user_id,seat_index,team,result,created_at)
         values ($1,$2,$3,$4,$5,$6) on conflict do nothing`,
        [match.id, player.user_id, player.seat_index, player.team, player.result, player.created_at],
      );
    }
    if (item.result) {
      await client.query(
        `insert into public.match_results (match_id,winner_user_id,winner_team,result,created_at)
         values ($1,$2,$3,$4,$5) on conflict do nothing`,
        [match.id, item.result.winner_user_id, item.result.winner_team, item.result.result, item.result.created_at],
      );
    }
  }

  for (const item of plan.rooms) {
    const row = item.room;
    const matchId = item.matchFirebaseId ? matchIds.get(item.matchFirebaseId) || null : null;
    await client.query(
      `insert into public.game_rooms (code,game_type,owner_id,password_hash,max_players,status,match_id,mode,mindi_mode,created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict (code) do update set game_type=$2,owner_id=$3,password_hash=$4,max_players=$5,status=$6,match_id=$7,mode=$8,mindi_mode=$9`,
      [row.code, row.game_type, row.owner_id, row.password_hash, row.max_players, row.status, matchId, row.mode, row.mindi_mode, row.created_at],
    );
    for (const player of item.players) {
      await client.query(
        `insert into public.room_players (room_code,user_id,display_name,seat_index,joined_at)
         values ($1,$2,$3,$4,$5) on conflict do nothing`,
        [row.code, player.user_id, player.display_name, player.seat_index, player.joined_at],
      );
    }
    for (const userId of item.bans) {
      await client.query(
        `insert into public.room_bans (room_code,user_id) values ($1,$2) on conflict do nothing`,
        [row.code, userId],
      );
    }
  }

  for (const row of plan.matchmakingQueue) {
    await client.query(
      `insert into public.matchmaking_queue (user_id,game_type,pool,party_id,queued_at)
       values ($1,$2,$3,$4,$5)
       on conflict (user_id,game_type,pool) do update set party_id=$4,queued_at=$5`,
      [row.user_id, row.game_type, row.pool, row.party_id, row.queued_at],
    );
  }

  for (const row of plan.coinTopups) {
    await client.query(
      `insert into public.coin_topup_requests (user_id,player_name,coins,price_mvr,pack_name,status,created_at,decided_at,credited_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [row.user_id, row.player_name, row.coins, row.price_mvr, row.pack_name, row.status, row.created_at, row.decided_at, row.credited_at],
    );
  }

  for (const row of plan.appConfig) {
    await client.query(
      `insert into public.app_config (id,value,updated_at)
       values ($1,$2,$3)
       on conflict (id) do update set value=$2,updated_at=$3`,
      [row.id, row.value, row.updated_at],
    );
  }

  for (const row of plan.hallOfFame) {
    await client.query(
      `insert into public.hall_of_fame_manual (display_name,peak_trophies,note,added_at,added_by)
       values ($1,$2,$3,$4,$5)`,
      [row.display_name, row.peak_trophies, row.note, row.added_at, row.added_by],
    );
  }

  for (const row of plan.reports) {
    await client.query(
      `insert into public.reports (reporter_id,target_id,reason,context,evidence,details,status,created_at,resolved_at,resolved_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [row.reporter_id, row.target_id, row.reason, row.context, row.evidence, row.details, row.status, row.created_at, row.resolved_at, row.resolved_by],
    );
  }
}

async function verify(client) {
  const counts = {};
  for (const table of tableOrder) {
    const result = await client.query(`select count(*)::int as count from public.${table}`);
    counts[table] = result.rows[0].count;
  }
  const auth = await client.query("select count(*)::int as users from auth.users");
  const mapped = await client.query("select count(*)::int as mapped from public.auth_migration_map");
  console.log(JSON.stringify({ auth_users: auth.rows[0].users, auth_migration_map: mapped.rows[0].mapped, public_tables: counts }, null, 2));
}

async function main() {
  const command = process.argv[2] || "summary";
  if (!["summary", "dry-run", "import", "verify"].includes(command)) {
    throw new Error("Usage: node supabase/auth-migration/migrate-firestore.cjs [summary|dry-run|import|verify]");
  }

  const client = new Client(pgConfig());
  await client.connect();
  try {
    if (command === "verify") {
      await verify(client);
      return;
    }

    const db = connectFirebase();
    const mapping = await loadMapping(client);
    const snapshot = await loadSnapshot(db);
    const { counts, problems, plan } = buildPlan(snapshot, mapping);
    const sourceCounts = Object.fromEntries(
      Object.entries(snapshot)
        .filter(([, value]) => Array.isArray(value))
        .map(([key, value]) => [key, value.length]),
    );
    console.log(JSON.stringify({ source_counts: sourceCounts, planned_rows: counts, problems }, null, 2));

    if (command === "summary" || command === "dry-run") {
      if (problems.length) process.exitCode = 1;
      return;
    }
    if (problems.length) {
      throw new Error(`Refusing import with ${problems.length} problem(s). Run summary for details.`);
    }

    await client.query("begin");
    try {
      await importPlan(client, plan);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
    await verify(client);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
