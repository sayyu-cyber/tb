const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { createClient } = require('@supabase/supabase-js');
const root = path.resolve(__dirname, '..');
const pageFile = 'app/(main)/play/post-match/page.tsx';

function load(file, mocks = {}, globals = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, {
    module, exports: module.exports, console, ...globals,
    require(id) {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id === 'react' || id === 'react/jsx-runtime') return require(id);
      // Unexpected dependencies fail, including any client-side mutation service.
      throw new Error(`Unexpected import: ${id}`);
    },
  }, { filename: file });
  return module.exports;
}

function pageHarness() {
  let auth = { user: { uid: 'me' }, playerStats: { trophies: 137, currentRank: 'Gold' }, loading: false };
  let params = new URLSearchParams('m=first&win=true');
  let cursor = 0, pending = [], dirty = false;
  const slots = [], requests = [];
  const react = {
    ...React,
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; dirty = true; }];
    },
    useEffect(fn, deps) {
      const i = cursor++, prior = slots[i];
      if (!prior || deps.some((dep, n) => !Object.is(dep, prior.deps[n]))) {
        pending.push(() => { prior?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; });
      }
    },
  };
  const Page = load(pageFile, {
    react,
    'framer-motion': { motion: { div: 'div' } },
    'lucide-react': Object.fromEntries(['Trophy', 'Home', 'RotateCcw', 'TrendingDown', 'Sparkles'].map(name => [name, 'svg'])),
    'next/link': { default: 'a', __esModule: true },
    'next/navigation': { useSearchParams: () => params },
    '@/contexts/AuthContext': { useAuth: () => auth },
    '@/lib/mindiEngine': load('lib/mindiEngine.ts', { './openingCut': {} }),
    '@/lib/matchmaking': { getMatch: id => new Promise((resolve, reject) => requests.push({ id, resolve, reject })) },
  }).default;
  function render() {
    let tree;
    do {
      dirty = false; cursor = 0; tree = Page();
      for (const effect of pending.splice(0)) effect();
    } while (dirty);
    return tree;
  }
  return {
    requests, render,
    query(value) { params = new URLSearchParams(value); return render(); },
    auth(value) { auth = { ...auth, ...value }; return render(); },
    async flush() { await new Promise(resolve => setImmediate(resolve)); return render(); },
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
    isDirty: () => dirty,
  };
}

function text(tree) {
  if (tree == null || typeof tree === 'boolean') return '';
  if (Array.isArray(tree)) return tree.map(text).join(' ');
  if (typeof tree !== 'object') return String(tree);
  return text(tree.props?.children);
}
const mindi = (winner = 'A', players = ['me', 'other'], status = 'completed') => ({ gameType: 'mindi', players, status, state: { outcome: { winner } } });
const gin = winnerUid => ({ gameType: 'gin_rummy', players: ['me', 'other'], status: 'completed', state: { result: { winnerUid } } });

async function postMatchChecks() {
  for (const [query, match, expected] of [
    ['m=loss&win=true', mindi('B'), 'Defeat'],
    ['m=win&win=false&game=gin-rummy', mindi('A'), 'Victory!'],
    ['m=team', mindi('A', ['partner', 'other', 'me', 'last']), 'Victory!'],
    ['m=team-b', mindi('B', ['other', 'partner', 'last', 'me']), 'Victory!'],
    ['m=gin&win=false&game=mindi', gin('me'), 'Victory!'],
    ['m=gin&win=true', gin('other'), 'Defeat'],
    ['m=active&win=true', mindi('A', ['me', 'other'], 'active'), 'Result unavailable'],
    ['m=stranger', mindi('A', ['one', 'two']), 'Result unavailable'],
    ['m=missing', null, 'Result unavailable'],
    ['m=outcome', { ...mindi(), state: {} }, 'Result unavailable'],
    ['m=bad-winner', gin('stranger'), 'Result unavailable'],
    ['m=bad-team', mindi('C'), 'Result unavailable'],
  ]) {
    const h = pageHarness(); h.query(query);
    assert.equal(h.requests[0].id, new URLSearchParams(query).get('m'));
    h.requests[0].resolve(match);
    const view = text(await h.flush());
    assert.ok(view.includes(expected), `${query}: ${view}`);
    assert.equal(view.includes('137'), expected !== 'Result unavailable');
    assert.doesNotMatch(view, /48|Promotion|PROMOTED|\+3|\-2/);
    // A second render cannot award or request another result.
    h.render(); assert.equal(h.requests.length, 1); h.unmount();
  }
  for (const auth of [{}, { user: { uid: 'me', isGuest: true }, playerStats: null }, { user: null, playerStats: null }]) {
    const h = pageHarness(); h.query('win=true&game=mindi'); h.auth(auth);
    const view = text(await h.flush());
    assert.match(view, /Result unavailable/); assert.doesNotMatch(view, /Victory|Defeat|137|48/);
    assert.equal(h.requests.length, 0);
    h.unmount();
  }
  const signedOut = pageHarness(); signedOut.auth({ user: null, playerStats: null });
  assert.match(text(await signedOut.flush()), /Result unavailable/);
  assert.equal(signedOut.requests.length, 0); signedOut.unmount();
  const guest = pageHarness(); guest.auth({ user: { uid: 'me', isGuest: true }, playerStats: null });
  guest.requests[0].resolve(mindi());
  assert.match(text(await guest.flush()), /Victory!.*Current stats unavailable/);
  guest.unmount();

  const h = pageHarness(); h.render();
  h.requests[0].resolve(mindi()); await h.flush();
  assert.doesNotMatch(text(h.query('m=second&win=true')), /Victory|137/);
  h.query('m=third'); h.requests[1].resolve(mindi());
  assert.doesNotMatch(text(await h.flush()), /Victory|137/);
  h.requests[2].resolve(gin('other')); assert.match(text(await h.flush()), /Defeat/);
  assert.doesNotMatch(text(h.auth({ user: { uid: 'someone-else' }, playerStats: null })), /Defeat|137/);
  h.requests[3].reject(new Error('not a participant'));
  assert.match(text(await h.flush()), /Result unavailable/);
  h.unmount();

  const stats = pageHarness(); stats.render(); stats.requests[0].resolve(mindi()); await stats.flush();
  assert.match(text(stats.auth({ playerStats: { trophies: 0, currentRank: 'Bronze' } })), /Current Trophies\s+0.*Bronze/);
  assert.doesNotMatch(text(stats.auth({ profileError: true })), /Current Trophies|Bronze/);
  assert.match(text(stats.auth({ profileLoading: true })), /Loading current stats/);
  stats.unmount();

  const loading = pageHarness(); loading.auth({ loading: true });
  assert.equal(loading.requests.length, 0);
  loading.auth({ loading: false }); assert.equal(loading.requests.length, 1);
  loading.unmount(); loading.requests[0].resolve(mindi());
  await new Promise(resolve => setImmediate(resolve)); assert.equal(loading.isDirty(), false);
  console.log('PASS verified read-only post-match results, real stats, missing data and stale requests');
}

async function profileChecks() {
  let profile = { id: 'other', display_name: 'Opponent', ranked_progress: { trophies: 81, current_rank: 'Gold' }, equipped_cosmetics: { card_back: 'unverified', table_theme: 'unverified' } };
  let appearance = { card_back: 'cb_default', table_theme: 'tt_default' }, failure;
  const requests = [];
  const client = createClient('https://integration.invalid', 'fixture', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, options) => {
      const url = new URL(input), name = url.pathname.split('/').at(-1);
      requests.push({ url, options });
      assert.ok(['profiles', 'get_public_appearance'].includes(name), `Unexpected resource ${name}`);
      if (name === 'profiles') {
        assert.equal(options.method, 'GET');
        assert.equal(url.searchParams.get('id'), 'eq.other');
        assert.doesNotMatch(url.searchParams.get('select'), /inventory|equipped_cosmetics|wallet/);
      } else {
        assert.equal(options.method, 'POST');
        assert.deepEqual(JSON.parse(options.body), { p_user_id: 'other' });
      }
      return new Response(JSON.stringify(failure === name ? { message: 'fixture failure' } : name === 'profiles' ? profile : appearance), {
        status: failure === name ? 500 : 200, headers: { 'Content-Type': 'application/json' },
      });
    } },
  });
  const { getPublicProfile } = load('lib/publicProfile.ts', { '@/lib/supabase/client': { getSupabaseBrowserClient: () => client } });
  let result = await getPublicProfile('other');
  assert.equal(result.trophies, 81); assert.equal(result.cardBack, 'cb_default'); assert.equal(result.tableTheme, 'tt_default');
  appearance = { card_back: 'cb_neon', table_theme: 'tt_lagoon' };
  result = await getPublicProfile('other'); assert.equal(result.cardBack, 'cb_neon'); assert.equal(result.tableTheme, 'tt_lagoon');
  appearance = null; result = await getPublicProfile('other'); assert.equal(result.cardBack, undefined); assert.equal(result.tableTheme, undefined);
  for (const resource of ['profiles', 'get_public_appearance']) {
    failure = resource; await assert.rejects(getPublicProfile('other'), error => error.message === 'fixture failure');
  }
  failure = null; profile = null;
  const before = requests.length;
  assert.equal(await getPublicProfile('other'), null); assert.equal(requests.length, before + 1);
  console.log('PASS public appearance RPC, no private joins, null data and errors');
}

async function roomChecks() {
  const room = query => load('scripts/room-test-services.tsx', {}, { location: { search: query }, URLSearchParams, window: {} });
  const service = room('');
  for (const [code, protectedRoom] of [['TF2GRQ', true], ['LOCK23', true], ['K7Q2MX', false], ['FULL23', false]]) {
    assert.equal(service.sampleRoom(code).password, protectedRoom);
  }
  for (const mode of ['gin', 'duel']) assert.equal(room(`?code=TEST23&${mode}`).sampleRoom('TEST23').password, false);
  await assert.rejects(service.joinRoom('LOCK23', 'me', 'Me', 'wrong'), /Incorrect room password/);
  await service.joinRoom('LOCK23', 'me', 'Me', 'secret');
  await service.joinRoom('LOCK23', 'me', 'Me', '', 'valid');
  await assert.rejects(service.joinRoom('LOCK23', 'me', 'Me', '', 'expired'), /expired/);
  await service.joinRoom('K7Q2MX', 'me', 'Me', '');
  await assert.rejects(service.joinRoom('FULL23', 'me', 'Me', ''), /full/);
  await assert.rejects(service.joinRoom('Z4C3EF', 'me', 'Me', ''), /closed/);
  console.log('PASS boolean room password fixtures and existing join behavior');
}

function compatibilityAndTypes() {
  const time = load('lib/competitionTime.ts');
  const legacy = load('lib/trophyUpdates.ts', { '@/lib/competitionTime': time });
  assert.deepEqual(Object.keys(legacy), ['getWeekStartKey']);
  assert.equal(legacy.getWeekStartKey(new Date('2026-10-05T00:00:00Z')), '2026-10-05');
  const files = [pageFile, 'lib/trophyUpdates.ts', 'lib/publicProfile.ts', 'scripts/room-test-services.tsx'];
  const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const program = ts.createProgram(files.map(file => path.join(root, file)), { ...parsed.options, incremental: false, noEmit: true });
  const diagnostics = files.flatMap(file => {
    const source = program.getSourceFile(path.join(root, file));
    return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
  });
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: file => file, getCurrentDirectory: () => root, getNewLine: () => '\n',
  }));
  console.log('PASS legacy calendar export and type diagnostics for the four owned files');
}

(async () => {
  await postMatchChecks(); await profileChecks(); await roomChecks(); compatibilityAndTypes();
})().catch(error => { console.error(error); process.exitCode = 1; });
