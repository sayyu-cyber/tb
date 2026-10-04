// Offline regressions: no environment files, credentials, network, or database access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
const rpcCalls = [];
let rpcResult;
let rpcHandler;
let hooks;
const React = require('react');
const mocks = {
  react: { ...React,
    useRef: value => hooks.useRef(value),
    useState: value => hooks.useReducer((_, next) => next, value),
    useReducer: (reducer, value) => hooks.useReducer(reducer, value),
    useCallback: (callback, deps) => hooks.useCallback(callback, deps),
    useEffect: (effect, deps) => hooks.useEffect(effect, deps),
  },
  '@/lib/supabase/client': { getSupabaseBrowserClient: () => ({ rpc: async (...args) => {
    rpcCalls.push(args);
    return rpcHandler ? rpcHandler(...args) : rpcResult;
  }, channel: () => {
    const channel = { on: () => channel, subscribe: () => channel };
    return channel;
  }, removeChannel: () => {} }) },
  '@/lib/supabase/data': { realtimeChannelName: value => value },
  './AuthContext': { useAuth: () => ({ user: hooks.user }) },
  './ToastContext': { useToast: () => ({ showToast: hooks.showToast }) },
  '@/components/system/GameLoading': { GameLoading: () => null },
  'next/navigation': { usePathname: () => '/missions' },
  '../lib/admin': Object.fromEntries(['watchMissionRewardOverrides', 'watchRankRewardOverrides', 'watchShopOverrides'].map(name => [name, () => () => {}])),
};
function load(relative, suffix = '') {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  cache.set(file, module.exports);
  const source = fs.readFileSync(file, 'utf8') + suffix;
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
    fileName: file,
  }).outputText;
  const localRequire = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('.') || name.startsWith('@/')) {
      const base = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(file), name);
      const target = ['', '.ts', '.tsx'].map(ext => base + ext).find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (!target) throw new Error('Missing test dependency: ' + name);
      return load(target);
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', 'setInterval', 'clearInterval', compiled)(localRequire, module, module.exports, () => 0, () => {});
  cache.set(file, module.exports);
  return module.exports;
}
const { EconomyProvider, __test: { economyReducer, initialState, applyEconomySnapshot, stateForUser } } = load(
  'contexts/EconomyContext.tsx',
  '\nmodule.exports.__test = { economyReducer, initialState, applyEconomySnapshot, stateForUser };'
);
const catalog = load('data/cosmetics.ts');
const wallet = load('lib/wallet.ts');
const storage = load('lib/safeStorage.ts');
const clone = value => structuredClone(value);
const practice = () => {
  const state = clone(initialState);
  state.missions.daily = catalog.DAILY_MISSION_TEMPLATES.map(t => ({ ...t, templateId: t.id, id: t.id + '_practice', progress: 0, completed: false }));
  state.missions.weekly = catalog.WEEKLY_MISSION_TEMPLATES.map(t => ({ ...t, templateId: t.id, id: t.id + '_practice', progress: 0, completed: false }));
  return state;
};
const snapshot = () => ({
  integrityVersion: 1,
  wallet: { coins: 175, total_earned: 200, total_spent: 25, version: 3 },
  daily: { available: false, claimedThrough: 2, nextDay: 3, lastClaimed: '2026-10-02T00:00:00Z', nextClaimAt: '2026-10-03T00:00:00Z', serverNow: '2026-10-02T01:00:00Z' },
  inventory: [{ item_id: 'cb_ocean', category: 'cardBack' }],
  equipped: { card_back: 'cb_ocean', table_theme: 'tt_default', profile_frame: 'pf_default', title: 'Novice', victory_animation: 'va_default', banner: 'bn_default' },
  vip: { active: true, activated_at: '2026-10-01T00:00:00Z', expires_at: '2026-10-08T00:00:00Z' },
  roomCards: [
    { id: 'unused', type: '1h', activated_at: null, expires_at: null },
    { id: 'active', type: '3h', activated_at: '2026-10-02T00:00:00Z', expires_at: '2026-10-02T03:00:00Z' },
    { id: 'expired', type: '1h', activated_at: '2026-10-01T00:00:00Z', expires_at: '2026-10-01T01:00:00Z' },
  ],
  missions: [{ id: 'server-assignment', template_id: 'dm_play_3', cadence: 'daily', title: 'Play 3 Matches', description: 'Play 3 matches today', target: 3, progress: 2, completed: false, reward: 40, reward_cosmetic_id: null, generated_at: '2026-10-02T00:00:00Z' }],
  achievements: [{ achievement_id: 'ach_first_win', progress: 1, target: 1, unlocked_at: '2026-10-01T22:00:00Z' }],
});
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve: data => resolve({ data, error: null }), fail: message => resolve({ data: null, error: { message } }) };
};

// Deterministic provider hook/effect runner; all I/O and timers stay stubbed.
function providerHarness(uid = 'A') {
  const slots = [];
  let cursor = 0, dirty = true, effects = [], value;
  const same = (a, b) => a && b && a.length === b.length && a.every((entry, i) => Object.is(entry, b[i]));
  const harness = {
    user: uid ? { uid, displayName: uid } : null,
    toasts: [],
    showToast: (...args) => harness.toasts.push(args),
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useReducer(reducer, initial) {
      const i = cursor++;
      const slot = slots[i] ??= { value: initial, dispatch: action => {
        const next = reducer(slot.value, action);
        if (!Object.is(next, slot.value)) { slot.value = next; dirty = true; }
      } };
      return [slot.value, slot.dispatch];
    },
    useCallback(callback, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) slots[i] = { value: callback, deps };
      return slots[i].value;
    },
    useEffect(effect, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) {
        const previous = slots[i];
        slots[i] = { deps, cleanup: previous?.cleanup };
        effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = effect(); });
      }
    },
    flush() {
      hooks = harness;
      for (let renders = 0; dirty; renders++) {
        assert.ok(renders < 30, 'provider render loop');
        dirty = false; cursor = 0; effects = [];
        value = EconomyProvider({ children: null }).props.value;
        for (const effect of effects) effect();
      }
      return value;
    },
    async pump() {
      for (let i = 0; i < 30; i++) { await Promise.resolve(); harness.flush(); }
      return value;
    },
    switchUser(next) { harness.user = next ? { uid: next, displayName: next } : null; dirty = true; return harness.flush(); },
    get value() { return value; },
    dispose() { for (const slot of slots) slot?.cleanup?.(); hooks = undefined; },
  };
  global.window = { addEventListener() {}, removeEventListener() {}, localStorage: { setItem() {} } };
  harness.flush();
  return harness;
}
async function withProvider(handler, run, uid) {
  rpcHandler = handler;
  const harness = providerHarness(uid);
  try { await run(harness); }
  finally { harness.dispose(); rpcHandler = undefined; delete global.window; }
}
let checks = 0;
async function test(name, action) {
  await action();
  checks++;
  console.log('PASS ' + name);
}
async function main() {
  await test('partial practice mission progress is 1/3, 2/3, 3/3 with no claims or credits', () => {
    let state = practice();
    for (let count = 1; count <= 4; count++) {
      state = economyReducer(state, { type: 'PRACTICE_MATCH', payload: { isVictory: false, gameType: 'mindi' } });
      assert.equal(state.missions.daily.find(m => m.templateId === 'dm_play_3').progress, Math.min(3, count));
      assert.equal(state.missions.weekly.find(m => m.templateId === 'wm_play_20').progress, count);
      assert.equal(state.missions.daily.find(m => m.templateId === 'dm_win_2').progress, 0);
      assert.equal(state.missions.daily.find(m => m.templateId === 'dm_play_gin').progress, 0);
      assert.equal(state.economy.coins, 0);
      assert.equal(state.missions.daily.some(m => m.completed), false);
    }
    assert.equal(rpcCalls.length, 0);
  });
  await test('wins increment applicable missions but never unlock achievements or money', () => {
    let state = practice();
    for (let i = 0; i < 10; i++) state = economyReducer(state, { type: 'PRACTICE_MATCH', payload: { isVictory: true, gameType: 'gin_rummy' } });
    assert.equal(state.missions.daily.find(m => m.templateId === 'dm_win_2').progress, 2);
    assert.equal(state.missions.weekly.find(m => m.templateId === 'wm_win_10').progress, 10);
    assert.equal(state.achievements.some(a => a.unlocked), false);
    assert.equal(state.economy.coins, 0);
  });
  await test('direct local reward, VIP, card, purchase and equip actions grant nothing', () => {
    const state = practice();
    for (const action of [
      { type: 'ADD_COINS', payload: { amount: 99999, source: 'match_victory' } },
      { type: 'ADD_COINS', payload: { amount: 2, source: 'match_defeat' } },
      { type: 'ACTIVATE_VIP', payload: { days: 9999 } },
      { type: 'ADD_ROOM_CARD', payload: { type: '1m' } },
      { type: 'GRANT_COSMETIC', payload: { itemId: 'bn_champion' } },
      { type: 'UNLOCK_ACHIEVEMENT', payload: { achievementId: 'ach_first_win' } },
      { type: 'COMPLETE_MISSION', payload: { missionId: state.missions.daily[0].id, isWeekly: false } },
      { type: 'PURCHASE_COSMETIC', payload: { itemId: 'cb_vip_gold' } },
      { type: 'EQUIP_COSMETIC', payload: { category: 'cardBack', itemId: 'cb_dragon' } },
    ]) assert.strictEqual(economyReducer(state, action), state);
  });
  await test('clean-device snapshot restores all server economy domains and replaces local entitlements', () => {
    const polluted = practice();
    polluted.profile.collection.cardBacks.push('cb_dragon');
    polluted.profile.roomCards.push({ id: 'forged', type: '1m', activated: false });
    const restored = applyEconomySnapshot(polluted, snapshot());
    assert.equal(restored.economy.coins, 175);
    assert.equal(restored.profile.collection.cardBacks.includes('cb_dragon'), false);
    assert.equal(restored.profile.collection.cardBacks.includes('cb_ocean'), true);
    assert.equal(restored.profile.equipped.cardBack, 'cb_ocean');
    assert.equal(restored.profile.vip.active, true);
    assert.equal(restored.profile.roomCards.length, 3);
    assert.equal(restored.missions.daily[0].id, 'server-assignment');
    assert.equal(restored.missions.daily[0].progress, 2);
    assert.equal(restored.achievements.find(a => a.id === 'ach_first_win').unlocked, true);
    assert.equal(restored.dailyLogin.rewards[1].claimed, true);
    assert.equal(initialState.profile.collection.cardBacks.includes('cb_ocean'), false);
  });
  await test('expired cards remain consumed through expiry checks, reactivation and reload', () => {
    let state = applyEconomySnapshot(practice(), snapshot());
    state = economyReducer(state, { type: 'CHECK_ROOM_CARDS' });
    const expired = state.profile.roomCards.find(c => c.id === 'expired');
    assert.equal(expired.activated, true);
    assert.equal(expired.remainingTime, 0);
    assert.strictEqual(economyReducer(state, { type: 'ACTIVATE_ROOM_CARD', payload: { cardId: 'expired' } }), state);
    state = applyEconomySnapshot(practice(), snapshot());
    assert.equal(state.profile.roomCards.find(c => c.id === 'expired').activated, true);
    assert.equal(state.profile.roomCards.filter(c => !c.activated && !c.activatedAt && !c.expiresAt).length, 1);
  });
  await test('expired VIP and removed server entitlements are not restored from previous state', () => {
    const response = snapshot();
    response.vip.expires_at = '2026-10-01T23:00:00Z';
    response.roomCards = [];
    response.inventory = [];
    response.achievements = [];
    const state = applyEconomySnapshot(applyEconomySnapshot(practice(), snapshot()), response);
    assert.equal(state.profile.vip.active, false);
    assert.equal(state.profile.vip.remainingDays, 0);
    assert.equal(state.profile.roomCards.length, 0);
    assert.equal(state.profile.achievements.length, 0);
    assert.equal(state.profile.collection.cardBacks.includes('cb_ocean'), false);
  });
  await test('server assignments cannot be rerolled by reset commands', () => {
    const state = applyEconomySnapshot(practice(), snapshot());
    assert.strictEqual(economyReducer(state, { type: 'RESET_DAILY_MISSIONS' }), state);
  });
  await test('missing server assignments stay empty on initial load, refresh and reset', () => {
    assert.deepEqual(initialState.missions.daily, []);
    assert.deepEqual(initialState.missions.weekly, []);
    const response = snapshot();
    response.missions = [];
    for (const previous of [practice(), applyEconomySnapshot(practice(), snapshot())]) {
      const state = applyEconomySnapshot(previous, response);
      for (const type of ['RESET_DAILY_MISSIONS', 'RESET_WEEKLY_MISSIONS']) {
        const reset = economyReducer(state, { type });
        assert.deepEqual(reset.missions.daily, []);
        assert.deepEqual(reset.missions.weekly, []);
        assert.deepEqual(reset.pendingClaims, []);
      }
    }
  });
  await test('automatic claims use verified server records, never local completion', () => {
    const response = snapshot();
    response.missions[0].completed = true;
    response.missions[0].progress = 3;
    let state = applyEconomySnapshot(practice(), response);
    assert.equal(state.pendingClaims.length, 0);
    response.missions[0].verified_at = response.daily.serverNow;
    state = applyEconomySnapshot(state, response);
    assert.equal(state.pendingClaims.length, 1);
    assert.deepEqual(state.pendingClaims[0].action, { type: 'COMPLETE_MISSION', payload: { missionId: 'server-assignment', isWeekly: false } });
    response.missions[0].claimed_at = response.daily.serverNow;
    state = applyEconomySnapshot(state, response);
    assert.equal(state.pendingClaims.length, 0);
    response.achievements[0].unlocked_at = null;
    response.achievements[0].verified_at = response.daily.serverNow;
    state = applyEconomySnapshot(state, response);
    assert.equal(state.pendingClaims[0].action.type, 'UNLOCK_ACHIEVEMENT');
    const practiced = economyReducer(practice(), { type: 'PRACTICE_MATCH', payload: { isVictory: true, gameType: 'mindi' } });
    assert.equal(practiced.pendingClaims.length, 0);
  });
  await test('wallet client denies arbitrary grants before any RPC', async () => {
    const before = rpcCalls.length;
    for (const action of ['ADD_COINS', 'ACTIVATE_VIP', 'ADD_ROOM_CARD', 'GRANT_COSMETIC']) {
      await assert.rejects(wallet.mutateWallet(action, { source: 'match_victory' }), /verified server settlement/);
    }
    assert.equal(rpcCalls.length, before);
  });
  await test('purchase and card activation preserve existing payload and RPC interfaces', async () => {
    rpcResult = { data: snapshot(), error: null };
    for (const [action, payload] of [
      ['PURCHASE_ROOM_CARD', { type: '1h', price: 50 }],
      ['ACTIVATE_ROOM_CARD', { cardId: '3d0869a3-e985-4d83-ad25-ab68666f56a2' }],
      ['PURCHASE_COSMETIC', { itemId: 'cb_ocean' }],
      ['EQUIP_COSMETIC', { category: 'cardBack', itemId: 'cb_ocean' }],
    ]) {
      assert.equal((await wallet.mutateWallet(action, payload)).wallet.coins, 175);
      const [name, params] = rpcCalls.at(-1);
      assert.equal(name, 'apply_economy_action');
      assert.equal(params.p_action, action);
      assert.deepEqual(params.p_payload, payload);
      assert.match(params.p_request_id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });
  await test('migration prerequisite and incomplete responses fail closed', async () => {
    rpcResult = { data: { wallet: { coins: 999 } }, error: null };
    await assert.rejects(wallet.loadWallet(), /Economy upgrade required/);
    rpcResult = { data: { ...snapshot(), roomCards: null }, error: null };
    await assert.rejects(wallet.loadWallet(), /Incomplete economy snapshot/);
    rpcResult = { data: snapshot(), error: { message: 'denied' } };
    await assert.rejects(wallet.mutateWallet('COMPLETE_MISSION', {}), /denied/);
  });
  await test('blocked storage and malformed old cache cannot grant state or crash storage helpers', () => {
    global.window = {};
    Object.defineProperty(global.window, 'localStorage', { get() { throw new Error('Storage disabled'); } });
    assert.equal(storage.safeGetItem('economy'), null);
    assert.equal(storage.safeSetItem('economy', '{}'), false);
    assert.equal(storage.safeRemoveItem('economy'), false);
    for (const raw of ['{', 'null', '[]', '{"profile":{"vip":{"active":true}}}', '{"economy":{"coins":99999}}']) {
      global.window = { localStorage: { getItem: () => raw, setItem: () => { throw new Error('Quota exceeded'); } } };
      const clean = stateForUser({ uid: 'clean-user', displayName: 'Player' });
      assert.equal(clean.profile.vip.active, false);
      assert.equal(clean.economy.coins, 0);
      assert.equal(clean.profile.roomCards.length, 0);
      assert.equal(storage.safeSetItem('economy', '{}'), false);
    }
    delete global.window;
  });
  await test('provider readiness stays false after incompatible/incomplete loads and recovers on a valid snapshot', async () => {
    const initial = deferred();
    let response = initial.promise;
    await withProvider(() => response, async h => {
      assert.equal(h.value.balanceReady, false);
      for (const [data, error] of [
        [{ ...snapshot(), integrityVersion: 0 }, /Economy upgrade required/],
        [{ ...snapshot(), roomCards: null }, /Incomplete economy snapshot/],
      ]) {
        response = { data, error: null };
        await assert.rejects(h.value.refreshBalance(), error);
        await h.pump();
        assert.equal(h.value.balanceReady, false);
        assert.equal(h.value.state.economy.coins, 0);
      }
      initial.resolve(snapshot());
      await h.pump();
      assert.equal(h.value.balanceReady, true);
      assert.equal(h.value.state.economy.coins, 175);
    });
  });
  await test('concurrent refetches and mutations cannot roll snapshots back', async () => {
    let reads = 0;
    const first = deferred(), second = deferred(), mutation = deferred();
    await withProvider(name => name === 'apply_economy_action' ? mutation.promise
      : ++reads === 1 ? { data: snapshot(), error: null } : reads === 2 ? first.promise : second.promise, async h => {
      await h.pump();
      const oldRead = h.value.refreshBalance();
      const newRead = h.value.refreshBalance();
      const purchase = h.value.dispatch({ type: 'PURCHASE_ROOM_CARD', payload: { type: '1h', price: 50 } });
      await h.pump();
      const newer = snapshot();
      newer.wallet = { ...newer.wallet, coins: 125, version: 4 };
      newer.daily.serverNow = '2026-10-02T02:00:00Z';
      newer.missions = [];
      second.resolve(newer);
      await newRead; await h.pump();
      first.resolve(snapshot());
      mutation.resolve(snapshot());
      await oldRead;
      assert.equal(await purchase, true);
      await h.pump();
      assert.equal(h.value.state.economy.coins, 125);
      assert.deepEqual(h.value.state.missions.daily, []);
      assert.equal(h.value.balanceReady, true);
    });
  });
  await test('same wallet version accepts newer entitlement snapshots but rejects older server times', async () => {
    let response = snapshot();
    await withProvider(() => ({ data: response, error: null }), async h => {
      await h.pump();
      response = { ...snapshot(), inventory: [], missions: [], daily: { ...snapshot().daily, serverNow: '2026-10-02T02:00:00Z' } };
      await h.value.refreshBalance(); await h.pump();
      response = snapshot();
      await h.value.refreshBalance(); await h.pump();
      assert.equal(h.value.state.profile.collection.cardBacks.includes('cb_ocean'), false);
      assert.deepEqual(h.value.state.missions.daily, []);
    });
  });
  await test('A-to-B-to-A ignores old loads and callbacks even when the UID matches again', async () => {
    const old = deferred(), returning = deferred();
    let reads = 0;
    await withProvider(() => ++reads === 1 ? old.promise : reads === 2 ? { data: snapshot(), error: null } : returning.promise, async h => {
      const stale = h.value;
      h.switchUser('B'); await h.pump();
      assert.equal(h.value.state.profile.uid, 'B');
      assert.equal(h.value.balanceReady, true);
      h.switchUser('A');
      old.resolve(snapshot()); await h.pump();
      assert.equal(h.value.balanceReady, false);
      assert.equal(h.value.state.economy.coins, 0);
      const before = rpcCalls.length;
      await stale.refreshBalance();
      assert.equal(await stale.dispatch({ type: 'PRACTICE_MATCH', payload: { isVictory: true, gameType: 'mindi' } }), false);
      assert.equal(rpcCalls.length, before);
      returning.resolve(snapshot()); await h.pump();
      assert.equal(h.value.balanceReady, true);
      assert.equal(h.value.state.profile.stats.matchesPlayed, 0);
    });
  });
  await test('account switches discard queued mutations and let the new account proceed independently', async () => {
    const old = deferred();
    let mutations = 0;
    await withProvider(name => name === 'apply_economy_action' && ++mutations === 1 ? old.promise : { data: snapshot(), error: null }, async h => {
      await h.pump();
      const action = { type: 'PURCHASE_ROOM_CARD', payload: { type: '1h', price: 50 } };
      const inFlight = h.value.dispatch(action), queued = h.value.dispatch(action);
      await h.pump();
      assert.equal(mutations, 1);
      h.switchUser('B'); await h.pump();
      const current = h.value.dispatch(action); await h.pump();
      assert.equal(await current, true);
      assert.equal(mutations, 2);
      h.switchUser('A'); await h.pump();
      const staleResponse = snapshot(); staleResponse.wallet = { ...staleResponse.wallet, coins: 9999, version: 999 };
      old.resolve(staleResponse);
      assert.equal(await inFlight, false);
      assert.equal(await queued, false);
      await h.pump();
      assert.equal(mutations, 2);
      assert.equal(h.value.state.economy.coins, 175);
      assert.deepEqual(h.toasts, []);
    });
  });
  await test('stale mutation errors are silent after logout and cannot restore readiness', async () => {
    const pending = deferred();
    await withProvider(name => name === 'apply_economy_action' ? pending.promise : { data: snapshot(), error: null }, async h => {
      await h.pump();
      const work = h.value.dispatch({ type: 'CLAIM_DAILY_REWARD', payload: { day: 3 } });
      await h.pump(); h.switchUser(null);
      pending.fail('old account failure');
      assert.equal(await work, false); await h.pump();
      assert.equal(h.value.balanceReady, false);
      assert.equal(h.value.state.economy.coins, 0);
      assert.deepEqual(h.toasts, []);
    });
  });
  await test('automatic pending claims do not loop on unchanged responses or errors; manual retry remains available', async () => {
    for (const fail of [false, true]) {
      const response = snapshot();
      Object.assign(response.missions[0], { completed: true, progress: 3, verified_at: response.daily.serverNow });
      Object.assign(response.achievements[0], { unlocked_at: null, verified_at: response.daily.serverNow });
      let attempts = 0;
      await withProvider(name => {
        if (name === 'apply_economy_action') {
          attempts++;
          if (fail) return { data: null, error: { message: 'claim rejected' } };
        }
        return { data: clone(response), error: null };
      }, async h => {
        await h.pump();
        assert.equal(attempts, 2);
        for (let i = 0; i < 3; i++) { await h.value.refreshBalance(); await h.pump(); }
        assert.equal(attempts, 2);
        assert.equal(h.value.state.economy.coins, 175);
        assert.equal(h.value.state.achievements.some(a => a.unlocked), false);
        await h.value.dispatch(h.value.state.pendingClaims[0].action); await h.pump();
        assert.equal(attempts, 3);
        response.missions = []; response.achievements = [];
        await h.value.refreshBalance(); await h.pump();
        assert.deepEqual(h.value.state.pendingClaims, []);
        assert.equal(attempts, 3);
      });
    }
  });
  await test('provider grant helpers never award local coins or entitlements or call forbidden RPCs', async () => {
    await withProvider(() => ({ data: snapshot(), error: null }), async h => {
      await h.pump();
      const before = rpcCalls.length;
      const state = clone(h.value.state);
      for (const type of ['ADD_COINS', 'ACTIVATE_VIP', 'ADD_ROOM_CARD', 'GRANT_COSMETIC']) {
        assert.equal(await h.value.dispatch({ type, payload: { amount: 9999, days: 9999, type: '1m', itemId: 'cb_dragon' } }), false);
      }
      await h.pump();
      assert.equal(rpcCalls.length, before);
      assert.deepEqual(h.value.state, state);
    });
  });
  await test('SQL premium flags, top-up packs and mission catalog stay aligned with product data', () => {
    const sql = fs.readFileSync(path.join(root, 'supabase/migrations/202610010008_economy_integrity.sql'), 'utf8');
    const flagged = kind => [...sql.match(new RegExp("'" + kind + "', key in \\(([^)]*)\\)"))[1].matchAll(/'([^']+)'/g)].map(m => m[1]).sort();
    for (const kind of ['isVipExclusive', 'earnedOnly']) {
      assert.deepEqual(flagged(kind), catalog.ALL_COSMETICS.filter(item => item[kind]).map(item => item.id).sort());
    }
    const packs = JSON.parse(sql.match(/'coinPackCatalog', '(\[[\s\S]*?\])'::jsonb/)[1]);
    assert.deepEqual(packs, catalog.COIN_PACKS.map(({ id, name, coins, priceMVR }) => ({ id, name, coins, priceMVR })));
    const missions = JSON.parse(sql.match(/value->'missions' \|\| '(\{[\s\S]*?\})'::jsonb/)[1]);
    for (const template of [...catalog.DAILY_MISSION_TEMPLATES, ...catalog.WEEKLY_MISSION_TEMPLATES]) {
      const actual = missions[template.id];
      for (const field of ['id', 'title', 'description', 'target', 'reward', 'rewardCosmeticId']) assert.equal(actual[field], template[field]);
    }
    assert.match(sql, /create function public\.get_public_appearance\(p_user_id uuid\)/);
    assert.match(sql, /revoke all on function public\.economy_action_v6_internal\(text,jsonb,uuid\) from public, anon, authenticated/);
  });
  console.log('Economy integrity: ' + checks + ' focused offline checks passed.');
  if (process.argv.includes('--types')) {
    const configFile = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
    const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
    const program = ts.createProgram({
      rootNames: ['next-env.d.ts', 'contexts/EconomyContext.tsx', 'components/shop/CosmeticShop.tsx', 'lib/wallet.ts'].map(file => path.join(root, file)),
      options: { ...config.options, incremental: false, noEmit: true },
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => root, getCanonicalFileName: file => file, getNewLine: () => '\n',
    }));
    console.log('PASS focused economy TypeScript roots and dependencies');
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
