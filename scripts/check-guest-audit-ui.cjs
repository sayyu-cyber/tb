// Full exported app with HTTP fixtures: real auth, providers, routing and games.
// No production account, progress or wallet is modified.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium, webkit } = require(process.env.CHECK_PLAYWRIGHT || 'C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:3002';
const env = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
const backend = env.match(/^NEXT_PUBLIC_SUPABASE_URL=["']?([^\r\n"']+)/m)[1];
const uid = '11111111-1111-4111-8111-111111111111';
const user = { id: uid, aud: 'authenticated', role: 'authenticated', is_anonymous: true, created_at: new Date().toISOString(), app_metadata: { provider: 'anonymous', providers: ['anonymous'] }, user_metadata: { full_name: 'Guest' } };
const jwt = [ { alg: 'HS256', typ: 'JWT' }, { sub: uid, aud: 'authenticated', role: 'authenticated', is_anonymous: true, exp: Math.floor(Date.now()/1000)+3600 } ].map(v => Buffer.from(JSON.stringify(v)).toString('base64url')).join('.') + '.fixture';
const session = { user, access_token: jwt, refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600 };
const wallet = { user_id: uid, coins: 1000, total_earned: 0, total_spent: 0, version: 0 };
const equipped = { user_id: uid, card_back: 'cb_default', table_theme: 'tt_default', profile_frame: 'pf_default', title: '', victory_animation: 'va_default', banner: 'bn_default' };
const profile = { id: uid, display_name: 'Guest', photo_url: null, player_code: 'GUEST01', player_stats: { total_matches: 0, wins: 0, losses: 0, win_percentage: 0, peak_trophies: 0, highest_rank: 'Unranked' }, ranked_progress: { trophies: 0, weekly_trophies: 0, week_start: null, current_rank: 'Unranked', highest_rank: 'Unranked' }, equipped_cosmetics: equipped };
const leader = { ...profile, id: '22222222-2222-4222-8222-222222222222', display_name: 'Ranked Player', ranked_progress: { trophies: 58, weekly_trophies: 12, week_start: null, current_rank: 'Gold' } };
async function run() {
  const useWebkit = process.env.CHECK_BROWSER === 'webkit';
  const browser = await (useWebkit ? webkit : chromium).launch({ headless: true, ...(useWebkit ? {} : { channel: 'msedge' }) });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await context.routeWebSocket('**/realtime/**', ws => ws.close());
    let protectedWrites = 0, snapshots = 0, signups = 0, queues = 0;
    await context.route(backend + '/**', async route => {
      const req = route.request(), url = new URL(req.url()), endpoint = url.pathname.split('/').pop();
      const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers': req.headers()['access-control-request-headers'] || '*' };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      let value = [];
      if (url.pathname.includes('/auth/')) {
        if (endpoint === 'signup') { signups++; value = session; }
        else if (endpoint === 'user') value = { user };
        else value = session;
      } else if (endpoint === 'get_economy_snapshot') {
        snapshots++;
        value = { integrityVersion: 1, wallet, equipped, inventory: [{ item_id: 'cb_default', category: 'cardBack' }], roomCards: [], vip: null, missions: [], achievements: [],
          daily: { available: true, claimedThrough: 0, nextDay: 1, lastClaimed: null, nextClaimAt: null, serverNow: new Date().toISOString() } };
      }
      else if (endpoint === 'equipped_cosmetics') {
        if (req.method() !== 'GET') {
          protectedWrites++;
          return route.fulfill({ status: 403, headers, contentType: 'application/json', body: JSON.stringify({ message: 'Use the verified economy command' }) });
        }
        value = [equipped];
      } else if (endpoint === 'wallets') value = [wallet];
      else if (endpoint === 'profiles') value = url.searchParams.has('id') ? [profile] : [leader];
      else if (endpoint === 'player_stats') value = [profile.player_stats];
      else if (endpoint === 'ranked_progress') value = url.searchParams.get('select')?.includes('profiles!inner')
        ? [{ user_id: leader.id, ...leader.ranked_progress, profiles: leader }]
        : [profile.ranked_progress];
      if (/queue|form_match/.test(endpoint)) queues++;
      const single = (req.headers().accept || '').includes('application/vnd.pgrst.object');
      if (single && Array.isArray(value)) value = value[0] || null;
      return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(value) });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => { if (msg.type() === 'error' && /Failed to (save|load) (to|from) Supabase/.test(msg.text())) errors.push(msg.text()); });
    // Let auth/hydration requests settle before destroying each document.
    // WebKit otherwise reports cancelled fixture fetches as CORS failures.
    async function visit(route) {
      // Economy saves debounce for one second. Flush that timer before
      // hard navigation so WebKit does not cancel an otherwise valid PATCH.
      await page.waitForTimeout(1200);
      await page.waitForLoadState('networkidle');
      await page.goto(base + route);
      await page.waitForLoadState('networkidle');
    }
    await visit('/login/');
    await page.getByRole('button', { name: /Continue as Guest/i }).click();
    await page.waitForURL('**/home/');
    await page.locator('.arena-home').waitFor();
    await page.waitForTimeout(1800);
    assert.ok(snapshots > 0, 'Economy provider hydrates the authoritative snapshot as a guest');
    assert.equal(protectedWrites, 0, 'Hydration never writes protected cosmetics directly');
    assert.equal(await page.locator('main h1').count(), 1, 'Home mounts one heading');
    assert.equal(await page.locator('.arena-lhome').count(), 0, 'Desktop has no hidden phone tree');
    await page.setViewportSize({ width: 844, height: 390 });
    await page.locator('.arena-lhome').waitFor();
    assert.equal(await page.locator('.arena-home').count(), 0, 'Phone has no hidden desktop tree');
    assert.equal(await page.locator('main h1').count(), 1);
    await page.setViewportSize({ width: 1440, height: 900 });
    await visit('/leaderboard/');
    await page.getByRole('heading', { name: 'Leaderboard', exact: true }).waitFor();
    await page.getByRole('button', { name: /^All Time/ }).click();
    await page.getByText('Ranked Player', { exact: true }).first().waitFor();
    await page.getByText('Sign in to see where you stand.').waitFor();
    assert.ok(page.url().endsWith('/leaderboard/'), 'Guest is not redirected Home');
    for (const route of ['/play/mindi/casual/online/', '/play/gin-rummy/casual/online/', '/play/gin-rummy/ranked/', '/play/mindi/ranked-duo/']) {
      await visit(route);
      await page.getByText('Sign in to play with other players.', { exact: false }).waitFor();
      await page.getByRole('link', { name: /^Sign In$/i }).waitFor();
      await page.getByRole('link', { name: /^Play vs AI$/i }).waitFor();
    }
    assert.equal(queues, 0, 'Guests never join online/ranked queues');
    await page.getByRole('link', { name: /^Sign In$/i }).click();
    await page.waitForURL('**/login/');
    await page.waitForTimeout(600);
    assert.ok(page.url().endsWith('/login/'), 'Existing guest can stay on login');
    await page.getByRole('button', { name: /Continue as Guest/i }).click();
    await page.waitForURL('**/home/');
    assert.equal(signups, 1, 'Returning guest keeps their existing session');
    await visit('/friends/');
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForURL('**/login/');
    for (const route of ['/messages/', '/clubs/']) {
      await visit(route);
      await page.getByRole('link', { name: /^Sign In$/i }).waitFor();
    }
    await visit('/play/mindi/room/');
    await page.getByRole('link', { name: /Sign in to join private rooms/i }).waitFor();
    await visit('/settings/');
    await page.getByRole('switch', { name: /Background Music/i }).waitFor();
    assert.equal(await page.getByRole('switch', { name: /Notifications|Sound Effects/i }).count(), 0);
    for (const route of ['/play/gin/casual/ai/', '/play/gin-rummy/casual/ai/']) {
      await visit(route);
      const skip = page.getByRole('button', { name: /Skip to deal/i });
      await skip.waitFor();
      if (await skip.isEnabled()) {
        try { await skip.click({ timeout: 1500 }); }
        catch (error) {
          // The timed cut may enter its disabled dealing phase while the
          // browser waits for the animated table to become stable.
          if (await skip.isEnabled().catch(() => false)) throw error;
        }
      }
      await skip.waitFor({ state: 'detached', timeout: 18000 });
      assert.ok(await page.locator('.arena-gin-board').count(), 'Both Gin URLs load the actual game');
    }
    await visit('/home/');
    await page.waitForTimeout(1600); await page.waitForLoadState('networkidle');
    await page.reload();
    await page.locator('.arena-home').waitFor(); await page.waitForTimeout(1600);
    assert.equal(signups, 1, 'Reload restores the guest session');
    assert.equal(protectedWrites, 0, 'Practice and navigation never write protected cosmetics directly');
    assert.deepEqual(errors, [], 'No app exceptions or Supabase save/load failures');
    console.log(`PASS ${useWebkit ? 'WebKit' : 'Chromium'}: guest signup/reload/login, server snapshot hydration, no direct cosmetic writes, leaderboard, both Gin AI URLs, one Home composition and direct online/ranked gates`);
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
