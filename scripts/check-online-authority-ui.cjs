/* Real static export + isolated HTTP fixtures. No backend network or database.
 * CHECK_BASE_URL=http://127.0.0.1:3018 node scripts/check-online-authority-ui.cjs
 * Only NEXT_PUBLIC_SUPABASE_URL is consumed from .env.local; no credentials.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { chromium } = require(process.env.CHECK_PLAYWRIGHT || 'C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const base = new URL(process.env.CHECK_BASE_URL || 'http://127.0.0.1:3018');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Use a local exported-app preview');
const backendValue = process.env.NEXT_PUBLIC_SUPABASE_URL || fs.readFileSync(path.join(root, '.env.local'), 'utf8')
  .match(/^NEXT_PUBLIC_SUPABASE_URL=["']?([^\r\n"']+)/m)?.[1];
assert.ok(backendValue, 'NEXT_PUBLIC_SUPABASE_URL is required to identify intercepted fixture requests');
const backend = new URL(backendValue);
// SupabaseClient derives its default storage key from the first hostname label.
const storageKey = `sb-${backend.hostname.split('.')[0]}-auth-token`;
const artifacts = path.join(root, 'artifacts', 'online-authority-test');
const previousHook = require.extensions['.ts'];
let authority;
try {
  require.extensions['.ts'] = (module, filename) => {
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
    });
    module._compile(outputText, filename);
  };
  authority = require('../server/matchAuthority.ts');
} finally {
  if (previousHook) require.extensions['.ts'] = previousHook;
  else delete require.extensions['.ts'];
}
const players = [1, 2, 3, 4].map(n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
const failures = [];
const passes = [];
function random(seed = 42) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
const cardKey = c => `${c.suit}${c.rank}`;
function cardLabel(c) {
  return `${({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' })[c.rank] || c.rank} of ${{ S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' }[c.suit]}`.toLowerCase();
}
function permanentSession(uid) {
  const user = { id: uid, email: 'authority-fixture@example.invalid', aud: 'authenticated', role: 'authenticated',
    is_anonymous: false, created_at: '2026-01-01T00:00:00Z', email_confirmed_at: '2026-01-01T00:00:00Z',
    app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { full_name: 'Authority Tester' } };
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = [{ alg: 'HS256', typ: 'JWT' }, { sub: uid, aud: 'authenticated', role: 'authenticated', is_anonymous: false, exp }]
    .map(v => Buffer.from(JSON.stringify(v)).toString('base64url')).join('.') + '.fixture';
  return { user, access_token: jwt, refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600, expires_at: exp };
}
function makeFixture(game, index) {
  const seated = players.slice(0, game === 'mindi' ? 4 : 2);
  const rng = random();
  let current = { game, players: seated, state: authority.createState(game, seated, rng), deadline: Date.now() + 300000, completed: false };
  const viewer = authority.activePlayer(current);
  const session = permanentSession(viewer);
  const id = `20000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
  let revision = 0;
  const field = game === 'mindi' ? 'handsByUid' : 'hands';
  const fixture = { id, viewer, session, commands: [], views: [], unexpected: [], routeErrors: [], rejectNext: false,
    get current() { return current; }, get revision() { return revision; },
    hand() { return current.state[field][viewer]; },
    view(uid) {
      assert.ok(seated.includes(uid), 'Private views require a participant');
      const { publicState, privateStates } = authority.projectMatch(current);
      const state = structuredClone(publicState);
      assert.deepEqual(state[field], game === 'gin_rummy' && current.completed ? current.state.hands : {});
      state[field] = { ...state[field], [uid]: structuredClone(privateStates[uid].hand) };
      if (!current.completed) assert.deepEqual(Object.keys(state[field]), [uid], 'Active view exposes only the requesting hand');
      if (game === 'gin_rummy') assert.deepEqual(state.stock, [], 'Stock identities never reach the browser');
      for (const player of seated) assert.equal(state.handCounts[player], current.state[field][player].length);
      return { gameType: game, pool: 'casual', players: seated, status: current.completed ? 'completed' : 'active',
        createdAt: 1767225600000, revision, state };
    },
    command(body, uid) {
      const attempt = { body: structuredClone(body), before: revision, accepted: false };
      fixture.commands.push(attempt);
      assert.equal(body.type, 'move');
      assert.equal(body.matchId, id);
      assert.deepEqual(Object.keys(body).sort(), ['matchId', 'move', 'revision', 'type']);
      if (!Number.isSafeInteger(body.revision) || body.revision !== revision) return { status: 409, value: { error: 'This table changed. Refresh and retry.' } };
      if (fixture.rejectNext) {
        fixture.rejectNext = false;
        return { status: 503, value: { error: 'Fixture server unavailable. Please try again.' } };
      }
      try {
        current = authority.applyMove(current, uid, body.move, Date.now(), rng);
        revision++;
        attempt.accepted = true;
        return { status: 200, value: { result: true } };
      } catch (error) { return { status: 400, value: { error: error.message } }; }
    },
  };
  return fixture;
}
async function installFixtures(context, fixture) {
  await context.routeWebSocket('**/*', ws => ws.close());
  await context.addInitScript(({ key, session }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(session));
  }, { key: storageKey, session: fixture.session });
  const equipped = { user_id: fixture.viewer, card_back: 'cb_default', table_theme: 'tt_default', profile_frame: 'pf_default', title: '', victory_animation: 'va_default', banner: 'bn_default' };
  const wallet = { user_id: fixture.viewer, coins: 1000, total_earned: 0, total_spent: 0, version: 0 };
  const profiles = players.map((uid, i) => ({ id: uid, display_name: uid === fixture.viewer ? 'Authority Tester' : `Fixture Player ${i + 1}`,
    photo_url: null, player_code: `FIXT00${i + 1}`, player_stats: { user_id: uid, total_matches: 0, wins: 0, losses: 0, win_percentage: 0, peak_trophies: 0, highest_rank: 'Unranked' },
    ranked_progress: { user_id: uid, trophies: 0, weekly_trophies: 0, week_start: null, current_rank: 'Unranked', highest_rank: 'Unranked' },
    equipped_cosmetics: { ...equipped, user_id: uid } }));
  const emptyTables = new Set(['match_players', 'notifications', 'friendships', 'friend_requests', 'blocks', 'user_blocks', 'club_members', 'club_memberships', 'messages', 'conversations', 'conversation_members', 'match_results', 'matchmaking_queue', 'user_inventory', 'room_cards', 'vip_subscriptions', 'user_missions', 'user_achievements', 'daily_rewards', 'presence', 'app_config', 'coin_topup_requests']);
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] || '*', 'Cache-Control': 'no-store' };
    const reply = (value, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(value) });
    try {
      if (url.origin !== backend.origin) {
        if (url.origin === base.origin && ['GET', 'HEAD'].includes(req.method()) && !/^\/(api|rest|auth|functions)\//.test(url.pathname)) return route.continue();
        fixture.unexpected.push(`${req.method()} ${url.origin}${url.pathname}`);
        return route.abort('blockedbyclient');
      }
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      const endpoint = url.pathname.split('/').pop();
      if (url.pathname.startsWith('/auth/')) {
        assert.ok(['user', 'token'].includes(endpoint), `Unexpected auth endpoint ${endpoint}`);
        return reply(endpoint === 'user' ? fixture.session.user : fixture.session);
      }
      assert.equal(req.headers().authorization, `Bearer ${fixture.session.access_token}`, 'Backend requests use the permanent fixture session');
      const uid = JSON.parse(Buffer.from(req.headers().authorization.split('.')[1], 'base64url').toString()).sub;
      if (endpoint === 'get_match_view') {
        assert.equal(req.postDataJSON().p_match, fixture.id);
        const view = fixture.view(uid);
        fixture.views.push({ revision: view.revision, uid, view });
        return reply(view);
      }
      if (endpoint === 'match-command') {
        const result = fixture.command(req.postDataJSON(), uid);
        return reply(result.value, result.status);
      }
      let value;
      if (endpoint === 'get_economy_snapshot') value = { integrityVersion: 1, wallet, equipped,
        inventory: [{ item_id: 'cb_default', category: 'cardBack' }], roomCards: [], vip: null, missions: [], achievements: [],
        daily: { available: true, claimedThrough: 0, nextDay: 1, lastClaimed: null, nextClaimAt: null, serverNow: new Date().toISOString() } };
      else if (endpoint === 'get_public_appearance') value = { card_back: equipped.card_back, table_theme: equipped.table_theme };
      else if (endpoint === 'profiles') {
        const filter = url.searchParams.get('id');
        value = filter?.startsWith('eq.') ? profiles.filter(p => p.id === filter.slice(3)) : profiles;
      } else if (endpoint === 'player_stats' || endpoint === 'ranked_progress') value = [profiles.find(p => p.id === uid)[endpoint]];
      else if (endpoint === 'equipped_cosmetics') {
        assert.equal(req.method(), 'GET', 'No direct protected cosmetic writes');
        value = [equipped];
      } else if (endpoint === 'wallets') value = [wallet];
      else if (emptyTables.has(endpoint)) value = [];
      else {
        fixture.unexpected.push(`${req.method()} ${url.pathname}`);
        return reply({ message: `Unmocked fixture endpoint: ${endpoint}` }, 501);
      }
      const single = (req.headers().accept || '').includes('application/vnd.pgrst.object');
      if (single && Array.isArray(value)) value = value[0] || null;
      return reply(value);
    } catch (error) {
      fixture.routeErrors.push(error.message);
      return reply({ error: error.message }, 500);
    }
  });
}
async function eventually(check, label, timeout = 12000) {
  const until = Date.now() + timeout;
  let last;
  do {
    try { await check(); return; } catch (error) { last = error; }
    await new Promise(resolve => setTimeout(resolve, 100));
  } while (Date.now() < until);
  throw new Error(`${label}: ${last?.message}`);
}
async function runScenario(browser, game, viewport, index) {
  const label = `${game}-${viewport.width}x${viewport.height}`;
  const fixture = makeFixture(game, index);
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', serviceWorkers: 'block',
    ...(viewport.width === 844 ? { isMobile: true, hasTouch: true } : {}) });
  const errors = [];
  await installFixtures(context, fixture);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.stack || error.message));
  const url = new URL(`/play/${game === 'mindi' ? 'mindi' : 'gin-rummy'}/casual/online/live/?m=${fixture.id}`, base).href;
  const hand = () => page.locator('section[aria-label^="Your"] button.hc');
  const shot = name => page.screenshot({ path: path.join(artifacts, `${label}-${name}.png`), fullPage: true });
  async function check(name, fn) {
    try { await fn(); passes.push(`${label}: ${name}`); console.log(`PASS ${label}: ${name}`); }
    catch (error) { failures.push(`${label}: ${name}: ${error.message}`); console.error(`FAIL ${label}: ${name}: ${error.message}`); await shot(`failed-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`); }
  }
  async function assertHand() {
    const expected = fixture.hand().map(cardLabel).sort();
    await eventually(async () => {
      const actual = await hand().evaluateAll(nodes => nodes.map(n => n.getAttribute('aria-label').toLowerCase()).sort());
      assert.deepEqual(actual, expected, 'Rendered cards match only the viewer private hand');
    }, 'private hand rendering');
  }
  async function assertCounts() {
    await eventually(async () => {
      const counts = await page.locator('.ct').allTextContents();
      const expected = fixture.current.players.map(uid => String(fixture.current.state[game === 'mindi' ? 'handsByUid' : 'hands'][uid].length));
      assert.deepEqual(counts.map(s => s.trim()).sort(), expected.sort(), 'Every seat retains its authoritative card count');
    }, 'seat counts');
  }
  async function ready() {
    await hand().first().waitFor({ state: 'visible', timeout: 22000 });
    await assertHand();
  }
  async function clickCard() {
    const card = hand().last();
    const name = await card.getAttribute('aria-label');
    await card.click();
    await eventually(async () => assert.equal(await card.getAttribute('aria-pressed'), 'true'), 'card selection');
    return { card, name };
  }
  async function playMindi() {
    const selected = await clickCard();
    await selected.card.click();
    return selected.name;
  }
  const draw = () => page.getByRole('button', { name: /^Draw from (the )?stock,/i }).click();
  try {
    const response = await page.goto(url);
    assert.equal(response.status(), 200, 'Exported live route is served');
    // The real opening ceremony completes before any card can be played.
    await ready();
    await check('initial private hand and opponent counts', async () => { await assertCounts(); await shot('initial'); });
    const initial = structuredClone(fixture.current);
    fixture.rejectNext = true;
    const commandCount = fixture.commands.length;
    if (game === 'mindi') await playMindi(); else await draw();
    await eventually(() => assert.equal(fixture.commands.length, commandCount + 1), 'rejected command reached fixture');
    await check('rejected command does not advance state', async () => {
      assert.equal(fixture.revision, 0);
      assert.deepEqual(fixture.current, initial);
      await assertHand(); await assertCounts();
    });
    await check('rejected command is visible', async () => {
      await page.getByRole('alert').filter({ hasText: /failed|unavailable|try again/i }).first().waitFor({ state: 'visible', timeout: 2500 });
      await shot('command-error');
    });
    // Reload removes only local selection/error state; the same server hand returns.
    await page.reload(); await ready();
    if (game === 'mindi') {
      const selected = await playMindi();
      await eventually(() => assert.equal(fixture.revision, 1), 'Mindi play accepted');
      await check('actual card click submits play and decrements hand', async () => {
        const command = fixture.commands.at(-1);
        assert.equal(command.body.move.type, 'play');
        assert.equal(cardLabel(command.body.move.card), selected.toLowerCase());
        assert.equal(command.body.revision, 0);
        assert.equal(fixture.hand().length, 12);
        await assertHand(); await assertCounts(); await shot('played');
      });
    } else {
      await draw();
      await eventually(() => assert.equal(fixture.revision, 1), 'Gin draw accepted');
      await check('draw consumes stock and adds private card', async () => {
        assert.deepEqual(fixture.commands.at(-1).body.move, { type: 'draw', source: 'stock' });
        assert.equal(fixture.current.state.phase, 'discard'); assert.equal(fixture.hand().length, 11);
        assert.equal(fixture.current.state.stock.length, 30);
        await assertHand(); await assertCounts(); await shot('drawn');
      });
      const selected = await clickCard();
      await page.getByRole('button', { name: /^Discard (?:[A2-9JQK]|10|& win)/i }).click();
      await eventually(() => assert.equal(fixture.revision, 2), 'Gin discard accepted');
      await check('selected discard submits current revision and ends turn', async () => {
        const command = fixture.commands.at(-1);
        assert.equal(command.body.revision, 1); assert.equal(command.body.move.type, 'discard');
        assert.equal(cardLabel(command.body.move.card), selected.name.toLowerCase());
        assert.equal(cardKey(fixture.current.state.discard.at(-1)), cardKey(command.body.move.card));
        assert.equal(fixture.hand().length, 10); assert.notEqual(fixture.current.state.turn, fixture.viewer);
        await assertHand(); await assertCounts(); await shot('discarded');
      });
    }
    await check('refresh restores current private view', async () => {
      const count = fixture.views.length, revision = fixture.revision, commands = fixture.commands.length;
      await page.reload(); await ready(); await assertCounts();
      assert.ok(fixture.views.length > count, 'Refresh fetched get_match_view');
      assert.equal(fixture.views.at(-1).revision, revision);
      assert.equal(fixture.commands.length, commands, 'Refresh sent no gameplay command');
      assert.equal(fixture.views.at(-1).uid, fixture.viewer);
      await shot('refreshed');
    });
    await check('forfeit command and completed result on revisit', async () => {
      const revision = fixture.revision;
      await page.getByRole('button', { name: /^Leave game$/i }).click();
      await page.getByRole('dialog').getByRole('button', { name: /^Leave game$/i }).click();
      await eventually(() => assert.equal(fixture.revision, revision + 1), 'forfeit accepted');
      assert.deepEqual(fixture.commands.at(-1).body.move, { type: 'forfeit' });
      assert.equal(fixture.current.completed, true);
      assert.ok(!authority.winners(fixture.current).includes(fixture.viewer));
      await page.waitForURL(/\/play\/?$/);
      await page.goto(url);
      await page.getByRole('heading', { name: game === 'mindi' ? 'You left the hand' : 'You forfeited', exact: true }).waitFor();
      assert.equal(fixture.views.at(-1).view.status, 'completed');
      await shot('forfeit-result');
    });
  } catch (error) {
    failures.push(`${label}: flow: ${error.message}`);
    console.error(`FAIL ${label}: flow: ${error.stack}`);
    await shot('flow-failure').catch(() => {});
  } finally {
    await check('no browser exceptions or unmocked backend traffic', async () => {
      assert.deepEqual({ errors, routeErrors: fixture.routeErrors, unexpected: fixture.unexpected },
        { errors: [], routeErrors: [], unexpected: [] }, 'Browser exceptions, fixture contracts and blocked requests');
    });
    console.log(`TRACE ${label}: ${JSON.stringify({ revisions: fixture.commands.map(c => ({ type: c.body.move?.type, revision: c.body.revision, accepted: c.accepted })), privateViews: fixture.views.length })}`);
    await context.close();
  }
}
async function run() {
  fs.mkdirSync(artifacts, { recursive: true });
  const preview = await fetch(base, { signal: AbortSignal.timeout(5000) }).catch(error => {
    throw new Error(`Exported preview unavailable at ${base.origin}. Start scripts/preview.mjs --port ${base.port || 80} after the build. ${error.message}`);
  });
  assert.equal(preview.status, 200, 'Local preview is ready');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    let index = 0;
    for (const viewport of [{ width: 1440, height: 900 }, { width: 844, height: 390 }]) {
      for (const game of ['mindi', 'gin_rummy']) await runScenario(browser, game, viewport, ++index);
    }
  } finally { await browser.close(); }
  console.log(`\n${passes.length} checks passed; ${failures.length} failed. Screenshots: ${artifacts}`);
  for (const failure of failures) console.error(`FAIL ${failure}`);
  if (failures.length) process.exitCode = 1;
}
run().catch(error => { console.error(error.stack); process.exitCode = 1; });
