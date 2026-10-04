/** Offline regression tests: real PostgREST URL generation, fake responses and hook clocks. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');
const root = path.resolve(__dirname, '..');

function harness() {
  let now = Date.parse('2026-10-01T12:00:00Z');
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const timers = new Map(), listeners = new Map(), storage = new Map(), modules = new Map();
  let timerId = 0, active, storageReadError = false, storageWriteError = false;
  const events = {
    addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
    visibilityState: 'visible',
  };
  const react = {
    useState(initial) {
      const hook = active, index = hook.cursor++;
      if (!(index in hook.slots)) hook.slots[index] = typeof initial === 'function' ? initial() : initial;
      return [hook.slots[index], value => { hook.slots[index] = typeof value === 'function' ? value(hook.slots[index]) : value; hook.dirty = true; }];
    },
    useRef(initial) { return react.useState(() => ({ current: initial }))[0]; },
    useMemo(fn, deps) {
      const hook = active, index = hook.cursor++, prior = hook.slots[index];
      if (!prior || deps.some((value, i) => !Object.is(value, prior.deps[i]))) hook.slots[index] = { deps, value: fn() };
      return hook.slots[index].value;
    },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) {
      const hook = active, index = hook.cursor++, prior = hook.slots[index];
      if (!prior || deps.some((value, i) => !Object.is(value, prior.deps[i]))) {
        hook.effects.push(() => { prior?.cleanup?.(); hook.slots[index] = { deps, cleanup: fn() }; });
      }
    },
  };
  const urls = [], tables = { ranked_progress: [], match_players: [] };
  let responseError = false;
  const client = createClient('https://query-integrity.invalid', 'offline-fixture-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async input => {
      const url = new URL(input); urls.push(url);
      if (responseError) return new Response(JSON.stringify({ message: 'fixture failure' }), { status: 500 });
      const table = url.pathname.split('/').at(-1), params = url.searchParams;
      assert.ok(Object.hasOwn(tables, table), `Unexpected table ${table}`);
      let rows = [...tables[table]];
      for (const [key, value] of params) {
        if (['select', 'order', 'limit'].includes(key)) continue;
        const get = row => key.split('.').reduce((item, part) => (Array.isArray(item) ? item[0] : item)?.[part], row);
        if (value.startsWith('eq.')) rows = rows.filter(row => String(get(row)) === value.slice(3));
        else if (value.startsWith('in.(')) rows = rows.filter(row => value.slice(4, -1).split(',').includes(String(get(row))));
        else assert.fail(`Unexpected predicate ${key}=${value}`);
      }
      if (params.get('select')?.includes('profiles!inner')) rows = rows.filter(row => row.profiles && (!Array.isArray(row.profiles) || row.profiles.length));
      const orders = (params.get('order') || '').split(',').filter(Boolean).map(value => value.split('.'));
      rows.sort((a, b) => {
        for (const [key, direction] of orders) {
          const diff = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
          if (diff) return direction === 'desc' ? -diff : diff;
        }
        return 0;
      });
      if (params.has('limit')) rows = rows.slice(0, Number(params.get('limit')));
      return new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  let vip = false;
  function load(file) {
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} }; modules.set(file, module);
    const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, fileName: file,
    }).outputText;
    vm.runInNewContext(source, {
      module, exports: module.exports, Date: Clock, console,
      require(id) {
        if (id === 'react') return react;
        if (id === '@/lib/supabase/client') return { getSupabaseBrowserClient: () => client };
        if (id === '@/lib/supabase/data') return { toMillis: value => Date.parse(value) };
        if (id === '@/contexts/EconomyContext') return { useEconomy: () => ({ state: { profile: { vip: { active: vip } } } }) };
        if (id.startsWith('@/')) return load(id.slice(2) + '.ts');
        throw new Error(`Unmocked import ${id}`);
      },
      window: events, document: events,
      localStorage: {
        getItem(key) { if (storageReadError) throw new Error('blocked'); return storage.get(key) ?? null; },
        setItem(key, value) { if (storageWriteError) throw new Error('quota'); storage.set(key, value); },
      },
      setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, at: now + delay }); return id; },
      clearTimeout(id) { timers.delete(id); },
    }, { filename: file });
    return module.exports;
  }
  return {
    load, tables, urls, storage, timers, events,
    setTime(value) { now = Date.parse(value); },
    runTimers() { for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); } },
    emit(name, event = {}) { for (const fn of [...(listeners.get(name) || [])]) fn(event); },
    failResponse(value) { responseError = value; },
    setVip(value) { vip = value; },
    blockStorage(read, write) { storageReadError = read; storageWriteError = write; },
    mount(fn, ...args) {
      const hook = { slots: [], effects: [], cursor: 0, dirty: true, value: null };
      const render = () => {
        do {
          hook.dirty = false; hook.cursor = 0; active = hook;
          hook.value = fn(...args); active = null;
          for (const effect of hook.effects.splice(0)) effect();
        } while (hook.dirty);
        return hook.value;
      };
      render();
      return {
        render,
        async flush() { await new Promise(resolve => setImmediate(resolve)); return render(); },
        update(...next) { args = next; return render(); },
        unmount() { for (const slot of hook.slots) slot?.cleanup?.(); },
      };
    },
  };
}

function calendarChecks() {
  const h = harness(), time = h.load('lib/competitionTime.ts');
  for (const [instant, week] of [
    ['2026-10-05T00:00:00+05:00', '2026-09-28'],
    ['2026-10-05T00:00:00Z', '2026-10-05'],
    ['2026-10-04T23:59:59Z', '2026-09-28'],
    ['2026-10-04T20:00:00-07:00', '2026-10-05'],
    ['2027-01-01T00:00:00Z', '2026-12-28'],
  ]) assert.equal(time.getWeekStartKey(new Date(instant)), week);
  assert.equal(time.nextWeekResetAt(new Date('2026-10-04T23:59:59Z')), Date.parse('2026-10-05T00:00:00Z'));
  for (const [instant, live, boundary] of [
    ['2026-10-01T18:58:59Z', false, '2026-10-01T18:59:00.000Z'],
    ['2026-10-01T18:59:00Z', true, '2026-10-03T19:05:00.000Z'],
    ['2026-10-03T19:00:00Z', true, '2026-10-03T19:05:00.000Z'],
    ['2026-10-03T19:04:59Z', true, '2026-10-03T19:05:00.000Z'],
    ['2026-10-03T19:05:00Z', false, '2026-10-08T18:59:00.000Z'],
  ]) {
    const result = time.getLeagueWindow(new Date(instant));
    assert.equal(result.live, live); assert.equal(result.boundary.toISOString(), boundary);
    assert.ok(result.msRemaining > 0);
  }
  assert.match(time.formatLeagueBoundary(new Date('2026-10-03T19:05:00Z')), /Sunday.*12:05.*AM/);
  const legacy = h.load('lib/trophyUpdates.ts');
  assert.equal(legacy.getWeekStartKey(new Date('2026-10-05T00:00:00+05:00')), '2026-09-28');
  console.log(`PASS calendar UTC week / Maldives league boundaries (${process.env.TZ || 'host'})`);
}

async function queryChecks() {
  const h = harness();
  const rows = Array.from({ length: 140 }, (_, i) => ({
    user_id: `player-${String(i).padStart(3, '0')}`, trophies: i, weekly_trophies: i,
    week_start: '2026-09-28', current_rank: 'Silver',
    profiles: { display_name: `Player ${i}`, player_stats: { total_matches: 10, wins: 6, win_percentage: 60 } },
  }));
  rows[139].weekly_trophies = 1000; rows[138].weekly_trophies = 1000;
  rows[137].weekly_trophies = 9000; rows[137].week_start = '2026-09-21';
  rows[136].weekly_trophies = 8000; rows[136].current_rank = 'Bronze';
  rows[135].profiles = [rows[135].profiles];
  h.tables.ranked_progress = rows;
  const { useLeaderboard } = h.load('hooks/useLeaderboard.ts');
  const hook = h.mount(useLeaderboard, 'weekly');
  let view = await hook.flush();
  assert.equal(view.entries.length, 50);
  assert.equal(view.entries[0].uid, 'player-136');
  assert.equal(view.entries[1].uid, 'player-138');
  assert.equal(view.entries[2].uid, 'player-139');
  assert.ok(!view.entries.some(row => row.uid === 'player-137'));
  assert.equal(view.entries.find(row => row.uid === 'player-135').wins, 6);
  assert.equal(h.urls.at(-1).searchParams.get('order'), 'weekly_trophies.desc,user_id.asc');
  assert.match(h.urls.at(-1).searchParams.get('select'), /profiles!inner/);
  hook.update('allTime'); view = await hook.flush();
  assert.equal(view.entries[0].uid, 'player-139');
  assert.equal(h.urls.at(-1).searchParams.has('week_start'), false);
  hook.update('friends', ['player-139', 'player-001']); view = await hook.flush();
  assert.equal(view.entries.map(row => row.uid).join(','), 'player-139,player-001');
  const count = h.urls.length;
  hook.update('friends', []); view = await hook.flush();
  assert.equal(view.entries.length, 0); assert.equal(h.urls.length, count);
  hook.update('weekly'); await hook.flush();
  h.setTime('2026-10-05T00:00:00Z'); h.runTimers(); view = await hook.flush();
  assert.equal(view.entries.length, 0); assert.equal(view.meta.weekStartKey, '2026-10-05');
  assert.equal(view.meta.nextResetAt, Date.parse('2026-10-12T00:00:00Z'));
  h.setTime('2026-10-01T12:00:00Z');
  const { getWeeklyStandings } = h.load('lib/weekendLeague.ts');
  const standings = await getWeeklyStandings(3);
  assert.equal(standings.map(row => row.uid).join(','), 'player-138,player-139,player-135');
  assert.equal(h.urls.at(-1).searchParams.get('week_start'), 'eq.2026-09-28');
  assert.equal(h.urls.at(-1).searchParams.get('current_rank'), 'in.(Silver,Gold,Platinum)');
  assert.equal((await getWeeklyStandings(0)).length, 0);
  h.failResponse(true);
  await assert.rejects(getWeeklyStandings(), error => error.message === 'fixture failure');
  hook.unmount(); assert.equal(h.timers.size, 0);
  console.log('PASS leaderboard/league: full population, current week, qualified ranks, ties, friends, rollover, errors');

  h.failResponse(false);
  const match = (i, status) => ({ user_id: 'viewer', match_id: `match-${String(i).padStart(3, '0')}`, result: 'win', created_at: `2026-10-${status === 'completed' ? '01' : '02'}T00:00:00Z`,
    matches: { game_type: 'mindi', pool: 'weekend', status, created_at: '2026-10-01T00:00:00Z', public_state: { tricksWon: { B: 4, A: 9 }, outcome: { winner: 'A' } }, match_results: [] } });
  h.tables.match_players = [...Array.from({ length: 70 }, (_, i) => match(i + 100, 'active')), ...Array.from({ length: 60 }, (_, i) => match(i, 'completed'))];
  h.tables.match_players[70].matches.match_results = [{ result: { verified: true, outcome: { tricksWon: { B: 5, A: 8 } } } }];
  h.tables.match_players[71].matches = [h.tables.match_players[71].matches];
  h.tables.match_players[72].matches.game_type = 'gin_rummy';
  h.tables.match_players[72].matches.match_results = { result: { verified: true, outcome: { score: 25 } } };
  h.tables.match_players[72].result = 'loss';
  h.tables.match_players[73].result = null;
  h.tables.match_players[74].matches.match_results = [{ result: { tricksWon: { A: 7, B: 6 } } }];
  h.tables.match_players[75].matches.game_type = 'gin_rummy';
  h.tables.match_players[75].matches.public_state = { result: { score: 0 } };
  h.tables.match_players[75].matches.match_results = [{ result: {} }];
  const history = await h.load('lib/profileHistory.ts').getProfileHistory('viewer');
  assert.equal(history.length, 50); assert.equal(history[0].id, 'match-000');
  assert.equal(history[0].score, '8 : 5 tricks'); assert.equal(history[1].score, '9 : 4 tricks');
  assert.equal(history[2].score, '25 points'); assert.equal(history[2].result, 'Loss');
  assert.equal(history[3].result, 'Unavailable');
  assert.equal(history[4].score, '7 : 6 tricks');
  assert.equal(history[5].score, '0 points');
  assert.equal(h.urls.at(-1).searchParams.get('matches.status'), 'eq.completed');
  assert.match(h.urls.at(-1).searchParams.get('select'), /matches!inner/);
  console.log('PASS history: completed filter before limit, stable order, Mindi state/canonical scores, Gin, missing result');
}

function lifecycleChecks() {
  const h = harness(); h.setTime('2026-10-04T23:59:59Z');
  const hook = h.mount(h.load('hooks/useMatchLimits.ts').useMatchLimits, 'viewer');
  hook.render().recordMatch(); hook.render().recordMatch();
  assert.equal(hook.render().dailyUsed, 2);
  h.setTime('2026-10-05T00:00:00Z'); h.runTimers();
  assert.equal(hook.render().dailyUsed, 0); assert.equal(hook.render().weeklyUsed, 0);
  hook.render().recordMatch(); assert.equal(hook.render().dailyUsed, 1);
  h.setTime('2026-10-06T00:00:00Z');
  hook.render().recordMatch(); // Rollover must also work before the overdue timer fires.
  assert.equal(hook.render().dailyUsed, 1); assert.equal(hook.render().weeklyUsed, 2);
  h.setTime('2026-10-07T00:00:00Z'); h.emit('focus');
  assert.equal(hook.render().dailyUsed, 0); assert.equal(hook.render().weeklyUsed, 2);
  h.storage.set('thaasbai_matches_viewer', JSON.stringify({ dailyUsed: 3, weeklyUsed: 8, lastDay: '2026-10-07', lastWeek: '2026-10-05' }));
  h.emit('visibilitychange'); assert.equal(hook.render().dailyUsed, 3);
  h.setVip(true); assert.equal(hook.render().dailyTotal, 4);
  h.storage.delete('thaasbai_matches_viewer'); h.emit('storage', { key: null });
  assert.equal(hook.render().dailyUsed, 0);
  h.storage.set('thaasbai_matches_viewer', JSON.stringify({ dailyUsed: -9, weeklyUsed: 'bad', lastDay: '2026-10-07', lastWeek: '2026-10-05' }));
  h.emit('focus'); assert.equal(hook.render().weeklyUsed, 0);
  h.blockStorage(false, true); hook.render().recordMatch(); hook.render().recordMatch();
  h.emit('focus'); assert.equal(hook.render().dailyUsed, 2, 'Failed writes must not restore stale readable storage');
  h.blockStorage(true, true); hook.render().recordMatch(); hook.render().recordMatch();
  assert.equal(hook.render().dailyUsed, 4);
  hook.update('someone-else'); assert.equal(hook.render().dailyUsed, 0);
  hook.unmount(); assert.equal(h.timers.size, 0);
  h.setTime('2026-10-03T19:04:00Z');
  const lock = h.mount(h.load('hooks/useRankLock.ts').useRankLock);
  assert.equal(lock.render().isLocked, true); assert.match(lock.render().nextUnlockTime, /Sunday.*12:05/);
  h.setTime('2026-10-03T19:05:00Z'); h.runTimers();
  assert.equal(lock.render().isLocked, false); assert.equal(lock.render().isQualification, true);
  h.setTime('2026-10-08T18:59:00Z'); h.emit('focus');
  assert.equal(lock.render().isWeekendLeague, true);
  lock.unmount(); assert.equal(h.timers.size, 0);
  console.log('PASS lifecycle: midnight/Monday, pre-timer record, focus, visibility, storage, VIP, user switch, Sunday unlock, cleanup');
}

async function main() {
  if (process.argv.includes('--calendar-only')) return calendarChecks();
  for (const zone of ['UTC', 'Indian/Maldives', 'America/Los_Angeles']) {
    const result = spawnSync(process.execPath, [__filename, '--calendar-only'], { env: { ...process.env, TZ: zone }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout); process.stdout.write(result.stdout);
  }
  await queryChecks(); lifecycleChecks();
}
main().catch(error => { console.error(error); process.exitCode = 1; });
