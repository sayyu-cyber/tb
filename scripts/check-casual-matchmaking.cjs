const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), os = require('node:os');
const compiler = require('next/dist/compiled/webpack/webpack'); compiler.init();
const { chromium } = require(process.env.CHECK_PLAYWRIGHT || 'C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), output = fs.mkdtempSync(path.join(os.tmpdir(), 'thaasbai-queue-'));
const mock = path.join(__dirname, 'casual-matchmaking-test-services.ts');
async function run() {
  await new Promise((resolve, reject) => compiler.webpack({ mode: 'development', devtool: false,
    entry: path.join(__dirname, 'casual-matchmaking-test-entry.tsx'), output: { path: output, filename: 'fixture.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@/contexts/AuthContext$': mock, '@/lib/supabase/client$': mock, 'next/navigation$': mock, '@': root } },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(__dirname, 'friends-test-loader.cjs') }] },
  }, (err, stats) => err || stats.hasErrors() ? reject(err || new Error(stats.toString())) : resolve()));
  const browser = await chromium.launch({ headless: true, channel: process.env.CHECK_CHANNEL || 'msedge' });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
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
        f.queue.push({ ...row('duo'), party_id: 'party' }, { ...row('ranked'), pool: 'ranked' }, ...Array.from({ length: count - 1 }, (_, i) => row('opponent-' + i)));
        f.configure({ game, active: true });
      }, { game, gameType, count });
      await page.waitForFunction(() => window.queueFixture.navigations.length === 1, null, { timeout: 10000 }).catch(async error => {
        console.log(await page.evaluate(() => ({ state: window.queueFixture.state, calls: window.queueFixture.calls, queue: window.queueFixture.queue })));
        throw error;
      });
      const result = await page.evaluate(() => ({ matches: window.queueFixture.matches, calls: window.queueFixture.calls, nav: window.queueFixture.navigations, queue: window.queueFixture.queue }));
      assert.equal(result.matches.length, 1);
      assert.equal(result.nav[0], `/play/${game}/casual/online/live?m=table-${gameType}`);
      assert.ok(result.calls.indexOf('join_matchmaking_queue') < result.calls.indexOf('refresh_matchmaking_queue'), 'Join completes before formation');
      const state = result.matches[0].public_state;
      if (game === 'mindi') {
        assert.equal(Object.keys(state.handsByUid).length, 4);
        assert.ok(Object.values(state.handsByUid).every(hand => hand.length === 13));
        assert.ok(state.firstDraw);
      } else {
        assert.equal(Object.keys(state.hands).length, 2);
        assert.ok(Object.values(state.hands).every(hand => hand.length === 10));
        assert.equal(state.turn, state.firstCut.winner);
      }
      assert.deepEqual(result.queue.map(row => row.user_id), ['duo', 'ranked'], 'Other pools and duo entries survive');
      console.log(`PASS ${game}: production queue/service/engine forms correct table and navigates`);
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
    await page.waitForFunction(() => window.queueFixture.calls.includes('refresh_matchmaking_queue'));
    await page.evaluate(() => {
      const f = window.queueFixture;
      // A table created by a different client, with no Realtime event emitted.
      f.matches.push({ id: 'remote-table', game_type: 'gin_rummy', pool: 'casual', status: 'active', created_at: new Date().toISOString(), public_state: {} });
      f.players.push({ user_id: 'viewer', seat_index: 0, match_id: 'remote-table' }, { user_id: 'remote', seat_index: 1, match_id: 'remote-table' });
    });
    await page.waitForFunction(() => window.queueFixture.state.matchFound);
    await page.evaluate(() => window.queueFixture.configure({ game: 'gin-rummy', active: false }));
    await page.waitForTimeout(1100);
    assert.equal(await page.evaluate(() => window.queueFixture.navigations.length), 0);
    console.log('PASS: polling discovers a missed Realtime event; cancelling before navigation clears its timer');
    await fresh();
    await page.evaluate(() => { const f = window.queueFixture; f.lookupError = { code: '42P17', message: 'Match permissions need repair' }; f.configure({ game: 'mindi', active: true }); });
    await page.waitForFunction(() => window.queueFixture.state.error?.includes('Match permissions need repair'));
    assert.ok(!(await page.textContent('body')).includes('[object Object]'));
    assert.deepEqual(errors, []);
    console.log('PASS: plain PostgREST errors retain readable messages; no browser exceptions');
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
