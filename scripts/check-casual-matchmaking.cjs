const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), os = require('node:os');
const compiler = require('next/dist/compiled/webpack/webpack'); compiler.init();
const { chromium } = require(process.env.CHECK_PLAYWRIGHT || 'C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), output = fs.mkdtempSync(path.join(os.tmpdir(), 'thaasbai-queue-'));
const mock = path.join(__dirname, 'casual-matchmaking-test-services.ts');
async function run() {
  await new Promise((resolve, reject) => compiler.webpack({ mode: 'development', devtool: false,
    entry: path.join(__dirname, 'casual-matchmaking-test-entry.tsx'), output: { path: output, filename: 'fixture.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@/contexts/AuthContext$': mock, '@/lib/supabase/client$': mock, './supabase/client$': mock, 'next/navigation$': mock, '@': root } },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(__dirname, 'friends-test-loader.cjs') }] },
  }, (err, stats) => err || stats.hasErrors() ? reject(err || new Error(stats.toString())) : resolve()));
  const browser = await chromium.launch({ headless: true, channel: process.env.CHECK_CHANNEL || 'msedge' });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    const network = [];
    await page.route(/^https?:\/\//, route => { network.push(route.request().url()); return route.abort(); });
    async function fresh() {
      await page.goto('about:blank');
      await page.setContent('<div id="test-root"></div>');
      await page.addScriptTag({ path: path.join(output, 'fixture.js') });
      await page.waitForFunction(() => window.queueFixture.configure);
    }
    for (const [game, gameType, count] of [['gin-rummy', 'gin_rummy', 2], ['mindi', 'mindi', 4]]) {
      await fresh();
      await page.evaluate(({ game, gameType, count }) => {
        const f = window.queueFixture;
        const row = user_id => ({ user_id, game_type: gameType, pool: 'casual', queued_at: new Date().toISOString(), heartbeat_at: new Date().toISOString() });
        f.queue.push({ ...row('duo'), party_id: 'party' }, { ...row('ranked'), pool: 'ranked' },
          { ...row('stale'), heartbeat_at: new Date(Date.now() - 180_000).toISOString() },
          ...Array.from({ length: count - 1 }, (_, i) => row('opponent-' + i)));
        f.configure({ game, active: true });
      }, { game, gameType, count });
      await page.waitForFunction(() => window.queueFixture.navigations.length === 1, null, { timeout: 10000 }).catch(async error => {
        console.log(await page.evaluate(() => ({ state: window.queueFixture.state, calls: window.queueFixture.calls, queue: window.queueFixture.queue })));
        throw error;
      });
      const result = await page.evaluate(() => ({ matches: window.queueFixture.matches, authority: window.queueFixture.authority, calls: window.queueFixture.calls, requests: window.queueFixture.requests, nav: window.queueFixture.navigations, queue: window.queueFixture.queue }));
      assert.equal(result.matches.length, 1);
      assert.equal(result.nav[0], `/play/${game}/casual/online/live?m=table-${gameType}`);
      assert.ok(result.calls.indexOf('join_matchmaking_queue:complete') >= 0 && result.calls.indexOf('join_matchmaking_queue:complete') < result.calls.indexOf('match-command:form'), 'Join completes before authority formation');
      const commands = result.requests.filter(request => request.transport === 'function');
      assert.ok(commands.length > 0);
      for (const command of commands) assert.deepEqual(command, { transport: 'function', name: 'match-command', body: { type: 'form', game: gameType, pool: 'casual' } }, 'Browser sends no players, hands, stock, state, or p_state');
      assert.ok(!result.calls.includes('try_form_match'), 'Legacy client-state RPC is never used');
      const state = result.authority[`table-${gameType}`].state;
      const publicState = result.matches[0].public_state;
      if (game === 'mindi') {
        assert.equal(Object.keys(state.handsByUid).length, 4);
        assert.ok(Object.values(state.handsByUid).every(hand => hand.length === 13));
        assert.ok(state.firstDraw);
        assert.deepEqual(publicState.handsByUid, {});
      } else {
        assert.equal(Object.keys(state.hands).length, 2);
        assert.ok(Object.values(state.hands).every(hand => hand.length === 10));
        assert.equal(state.turn, state.firstCut.winner);
        assert.deepEqual(publicState.hands, {});
        assert.deepEqual(publicState.stock, []);
        assert.equal(publicState.stockCount, state.stock.length);
      }
      assert.deepEqual(result.queue.map(row => row.user_id), ['duo', 'ranked', 'stale'], 'Other pools, duo entries and stale rows are not consumed');
      const view = await page.evaluate(id => window.queueFixture.readMatch(id), `table-${gameType}`);
      const handsKey = game === 'mindi' ? 'handsByUid' : 'hands';
      assert.deepEqual(Object.keys(view.state[handsKey]), ['viewer'], 'Only the caller hand appears in their match view');
      assert.deepEqual(view.state[handsKey].viewer, state[handsKey].viewer);
      if (game !== 'mindi') assert.deepEqual(view.state.stock, []);
      assert.ok(await page.evaluate(() => window.queueFixture.calls.includes('get_match_view')));
      console.log(`PASS ${game}: state-free authority request, trusted deal, private viewer projection and pool isolation`);

      // Simulate a fresh browser session against the same persisted backend state.
      const persisted = await page.evaluate(() => ({ matches: window.queueFixture.matches, players: window.queueFixture.players, authority: window.queueFixture.authority }));
      await fresh();
      await page.evaluate(({ persisted, game }) => { Object.assign(window.queueFixture, persisted); window.queueFixture.configure({ game, active: true }); }, { persisted, game });
      await page.waitForFunction(() => window.queueFixture.navigations.length === 1);
      const reopened = await page.evaluate(id => window.queueFixture.readMatch(id), `table-${gameType}`);
      assert.deepEqual(reopened, view, 'Reload resumes the same hand and deadline without redealing');
      assert.equal(await page.evaluate(() => window.queueFixture.matches.length), 1);
      assert.equal(await page.evaluate(() => window.queueFixture.navigations[0]), `/play/${game}/casual/online/live?m=table-${gameType}`);
      console.log(`PASS ${game}: reload resumes one persisted authoritative match`);
    }
    await fresh();
    await page.evaluate(() => { const f = window.queueFixture; f.joinDelay = 300; f.configure({ game: 'mindi', active: true }); });
    await page.waitForFunction(() => window.queueFixture.calls.includes('join_matchmaking_queue'));
    await page.evaluate(() => window.queueFixture.configure({ game: 'gin-rummy', active: true }));
    await page.waitForFunction(() => window.queueFixture.queue.some(row => row.user_id === 'viewer' && row.game_type === 'gin_rummy'));
    assert.equal(await page.evaluate(() => window.queueFixture.queue.filter(row => row.user_id === 'viewer').length), 1);
    await page.evaluate(() => window.queueFixture.configure({ game: 'gin-rummy', active: false }));
    await page.waitForFunction(() => !window.queueFixture.queue.some(row => row.user_id === 'viewer'));
    assert.equal(await page.evaluate(() => window.queueFixture.navigations.length), 0);
    console.log('PASS: slow join + game switch + cancellation cannot leave a stale queue or navigate');
    await fresh();
    await page.evaluate(() => window.queueFixture.configure({ game: 'gin-rummy', active: true }));
    await page.waitForFunction(() => window.queueFixture.calls.includes('match-command:form'));
    await page.evaluate(() => {
      const f = window.queueFixture;
      // A table created by a different client, with no Realtime event emitted.
      f.seedMatch('remote-table', 'gin_rummy', ['viewer', 'remote']);
    });
    await page.waitForFunction(() => window.queueFixture.state.matchFound);
    await page.evaluate(() => window.queueFixture.configure({ game: 'gin-rummy', active: false }));
    await page.waitForTimeout(1100);
    assert.equal(await page.evaluate(() => window.queueFixture.navigations.length), 0);
    console.log('PASS: polling discovers a missed Realtime event; cancelling before navigation clears its timer');
    for (const field of ['formationError', 'formationHttpError']) {
      await fresh();
      await page.evaluate(field => { const f = window.queueFixture; f[field] = 'Authority temporarily unavailable'; f.configure({ game: 'gin-rummy', active: true }); }, field);
      await page.waitForFunction(() => window.queueFixture.state.error?.includes('Authority temporarily unavailable'));
      assert.equal(await page.evaluate(() => window.queueFixture.matches.length), 0);
      assert.equal(await page.evaluate(() => window.queueFixture.navigations.length), 0);
      assert.ok(!await page.evaluate(() => window.queueFixture.calls.includes('try_form_match')));
      console.log(`PASS ${field}: readable authority error with no client fallback or navigation`);
    }
    await fresh();
    const viewError = await page.evaluate(async () => {
      const f = window.queueFixture;
      f.seedMatch('read-failure', 'gin_rummy', ['viewer', 'remote']);
      f.viewError = { code: '42501', message: 'Match access revoked' };
      try { await f.readMatch('read-failure'); return null; } catch (error) { return error.message; }
    });
    assert.equal(viewError, 'Match access revoked', 'get_match_view errors are propagated');
    assert.equal(await page.evaluate(() => window.queueFixture.calls.includes('matches:select')), false, 'No direct-table fallback bypasses a failed view RPC');
    console.log('PASS: match-view authorization errors propagate without a direct-table fallback');
    await fresh();
    await page.evaluate(() => { const f = window.queueFixture; f.lookupError = { code: '42P17', message: 'Match permissions need repair' }; f.configure({ game: 'mindi', active: true }); });
    await page.waitForFunction(() => window.queueFixture.state.error?.includes('Match permissions need repair'));
    assert.ok(!(await page.textContent('body')).includes('[object Object]'));
    assert.deepEqual(errors, []);
    assert.deepEqual(network, [], 'The fixture never contacts Supabase or any external server');
    console.log('PASS: plain PostgREST errors retain readable messages; no browser exceptions');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
