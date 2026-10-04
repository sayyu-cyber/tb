const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const compiler = require('next/dist/compiled/webpack/webpack');
compiler.init();
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'thaasbai-auth-integrity-'));

async function run() {
  const source = fs.readFileSync(path.join(root, 'lib/safeStorage.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const sandbox = { exports: {} };
  vm.runInNewContext(code, sandbox);
  assert.equal(sandbox.exports.safeGetItem('test'), null);
  assert.equal(sandbox.exports.safeSetItem('test', 'value'), false);
  assert.equal(sandbox.exports.safeRemoveItem('test'), false);
  console.log('PASS storage: SSR-safe read/write/remove');

  const mock = path.join(__dirname, 'check-auth-integrity-services.tsx');
  const alias = Object.fromEntries(['@/lib/supabase/client', '@/lib/supabase/data', 'next/navigation', 'next/link', '@/hooks/useTranslation'].map(key => [key + '$', mock]));
  alias['@'] = root;
  await new Promise((resolve, reject) => compiler.webpack({
    mode: 'development', devtool: false, entry: path.join(__dirname, 'check-auth-integrity-entry.tsx'),
    output: { path: output, filename: 'fixture.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], alias },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(__dirname, 'friends-test-loader.cjs') }] },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString())) : resolve()));
  const bundle = fs.readFileSync(path.join(output, 'fixture.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const pages = [];
  async function pageFor(view = '', hash = '') {
    const page = await browser.newPage();
    await page.clock.install();
    pages.push(page);
    page.errors = [];
    page.on('pageerror', error => page.errors.push(error.message));
    await page.route('**/*', route => route.request().resourceType() === 'document'
      ? route.fulfill({ contentType: 'text/html', body: `<style>input,select,textarea,[contenteditable]{display:block;width:180px;height:24px}input[hidden]{display:none}.sheet{background:white;padding:16px;position:fixed;inset:20px;overflow:auto}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden}.phone-sheet-host{position:fixed;inset:0}.mscrim{position:fixed;inset:0}</style><div id="test-root"></div><script>${bundle}</script>` })
      : route.abort());
    await page.goto(`http://auth.test/?view=${view}${hash}`);
    await page.waitForFunction(() => window.authFixture && (window.authFixture.context || window.authFixture.rerenderSheet));
    return page;
  }
  const snapshot = page => page.evaluate(() => window.authFixture.snapshot);
  async function settle() { await new Promise(resolve => setTimeout(resolve, 40)); }
  async function signIn(page, id = 'alpha', guest = false) {
    await page.evaluate(({ id, guest }) => window.authFixture.emit('SIGNED_IN', window.authFixture.user(id, guest)), { id, guest });
    await page.waitForFunction(id => window.authFixture.profileRequests.some(request => request.id === id), id);
  }
  async function resolveProfile(page, index = 0, trophies = 42) {
    await page.evaluate(({ index, trophies }) => { const f = window.authFixture; f.profileRequests[index].resolve(f.profile(f.profileRequests[index].id, trophies)); }, { index, trophies });
    await page.waitForFunction(value => window.authFixture.snapshot.trophies === value, trophies);
  }
  try {
    let page = await pageFor();
    assert.deepEqual(await page.evaluate(() => {
      const s = window.authFixture.storage;
      return [s.safeSetItem('test', 'value'), s.safeGetItem('test'), s.safeRemoveItem('test'), s.safeGetItem('test')];
    }), [true, 'value', true, null]);
    for (const mode of ['getter', 'methods']) {
      assert.deepEqual(await page.evaluate(mode => {
        const s = window.authFixture.storage;
        if (mode === 'getter') Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
        else Object.defineProperty(window, 'localStorage', { configurable: true, value: { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('denied'); } } });
        return [s.safeGetItem('test'), s.safeSetItem('test', 'value'), s.safeRemoveItem('test')];
      }, mode), [null, false, false]);
    }
    console.log('PASS storage: normal access, blocked property, quota and method failures');

    page = await pageFor();
    await page.evaluate(() => { const f = window.authFixture; f.emit('SIGNED_OUT', null); f.authRequests[0].resolve({ data: { user: f.user() }, error: null }); });
    await settle();
    assert.equal((await snapshot(page)).uid, null);
    assert.equal(await page.evaluate(() => window.authFixture.channels.length), 0);
    await signIn(page, 'beta');
    await resolveProfile(page);
    await page.evaluate(() => { const f = window.authFixture; f.emit('TOKEN_REFRESHED', f.user('beta')); f.emit('SIGNED_IN', f.user('beta')); });
    await settle();
    assert.equal((await snapshot(page)).trophies, 42);
    assert.equal((await snapshot(page)).displayName, 'Profile beta');
    assert.equal(await page.evaluate(() => window.authFixture.profileRequests.length), 1);
    assert.equal(await page.evaluate(() => window.authFixture.channels.filter(c => c.active).length), 1);
    console.log('PASS auth: delayed getUser cannot revive sign-out; refresh/repeated sign-in retain stats and one profile read/channel');

    page = await pageFor();
    await signIn(page);
    await page.evaluate(() => window.authFixture.emit('SIGNED_OUT', null));
    await page.evaluate(() => { const f = window.authFixture; f.profileRequests[0].resolve(f.profile()); });
    await settle();
    assert.equal((await snapshot(page)).trophies, null);
    assert.equal(await page.evaluate(() => window.authFixture.channels.filter(c => c.active).length), 0);
    await signIn(page, 'beta');
    await resolveProfile(page, 1, 99);
    await page.evaluate(() => { const f = window.authFixture; f.authRequests[0].resolve({ data: { user: f.user() }, error: null }); });
    await settle();
    assert.equal((await snapshot(page)).uid, 'beta');
    assert.equal((await snapshot(page)).trophies, 99);
    console.log('PASS auth: old profile and initialization cannot replace a newer account');

    page = await pageFor();
    await signIn(page);
    await page.evaluate(() => { const f = window.authFixture; f.holdCode = true; f.profileRequests[0].resolve(f.profile('alpha', 1, null)); });
    await page.waitForFunction(() => window.authFixture.codeRequests.length === 1);
    await page.evaluate(() => { const f = window.authFixture; f.emit('SIGNED_OUT', null); f.codeRequests[0].resolve(); });
    await settle();
    assert.equal(await page.evaluate(() => window.authFixture.profileRequests.length), 1);
    assert.equal(await page.evaluate(() => window.authFixture.channels.filter(c => c.active).length), 0);
    console.log('PASS auth: sign-out during player-code repair stops the follow-up read');

    page = await pageFor();
    await signIn(page);
    await page.evaluate(() => window.authFixture.unmountProvider());
    await page.waitForFunction(() => window.authFixture.listeners.size === 0);
    await page.evaluate(() => { const f = window.authFixture; f.authRequests[0].resolve({ data: { user: f.user() }, error: null }); f.profileRequests[0].resolve(f.profile()); });
    await settle();
    assert.equal(await page.evaluate(() => window.authFixture.channels.filter(c => c.active).length), 0);
    await page.evaluate(() => window.authFixture.remountProvider());
    await page.waitForFunction(() => window.authFixture.listeners.size === 1);
    await signIn(page, 'beta');
    await resolveProfile(page, 1, 88);
    console.log('PASS auth: unmount releases listeners/channels; remount accepts a fresh identity');

    page = await pageFor();
    await page.evaluate(() => window.authFixture.authRequests[0].reject(new Error('offline')));
    await page.waitForFunction(() => window.authFixture.snapshot.profileError);
    assert.equal((await snapshot(page)).loading, false);
    await page.evaluate(() => window.authFixture.context.retryProfile());
    await page.waitForFunction(() => window.authFixture.authRequests.length === 2);
    await page.evaluate(() => { const f = window.authFixture; f.authRequests[1].resolve({ data: { user: f.user() }, error: null }); });
    await page.waitForFunction(() => window.authFixture.profileRequests.length === 1);
    await page.evaluate(() => window.authFixture.profileRequests[0].reject(new Error('offline')));
    await page.waitForFunction(() => !window.authFixture.snapshot.profileLoading);
    assert.equal((await snapshot(page)).profileError, true);
    await page.evaluate(() => window.authFixture.context.retryProfile());
    await page.waitForFunction(() => window.authFixture.profileRequests.length === 2);
    await resolveProfile(page, 1);
    assert.equal((await snapshot(page)).profileError, false);
    assert.equal(await page.evaluate(() => window.authFixture.channels.filter(c => c.active).length), 1);
    console.log('PASS auth: rejected auth/profile reads end loading and retry recovers without extra channels');

    page = await pageFor();
    await page.clock.install();
    await page.clock.fastForward(16000);
    await page.waitForFunction(() => !window.authFixture.snapshot.loading);
    assert.equal((await snapshot(page)).profileError, true);
    await signIn(page);
    await page.clock.fastForward(16000);
    await page.waitForFunction(() => !window.authFixture.snapshot.profileLoading);
    assert.equal((await snapshot(page)).profileError, true);
    console.log('PASS auth: hung initialization and profile requests have bounded loaders');

    page = await pageFor();
    await signIn(page);
    await resolveProfile(page);
    await page.evaluate(() => { const f = window.authFixture; f.holdLogout = true; void f.context.logout().catch(error => { f.logoutError = error.message; }); });
    await page.waitForFunction(() => window.authFixture.logoutRequest);
    await page.evaluate(() => { const f = window.authFixture; f.emit('TOKEN_REFRESHED', f.user()); f.authRequests[0].resolve({ data: { user: f.user() }, error: null }); });
    await settle();
    assert.equal((await snapshot(page)).uid, null);
    await page.evaluate(() => window.authFixture.logoutRequest.resolve({ error: new Error('signout failed') }));
    await page.waitForFunction(() => window.authFixture.authRequests.length === 2);
    await page.evaluate(() => { const f = window.authFixture; f.authRequests[1].resolve({ data: { user: f.user() }, error: null }); });
    await page.waitForFunction(() => window.authFixture.profileRequests.length === 2);
    await resolveProfile(page, 1);
    assert.equal(await page.evaluate(() => window.authFixture.logoutError), 'signout failed');
    console.log('PASS auth: pending logout ignores old refresh; failed logout reconciles current server identity');

    page = await pageFor();
    await signIn(page);
    await page.evaluate(() => { const f = window.authFixture; for (let i = 0; i < 8; i++) f.channels[0].callbacks[0](); });
    await resolveProfile(page);
    await page.waitForFunction(() => window.authFixture.profileRequests.length === 2);
    await resolveProfile(page, 1, 60);
    assert.equal(await page.evaluate(() => window.authFixture.profileRequests.length), 2);
    await page.evaluate(() => { const f = window.authFixture; f.channels[0].fail(new Error('channel error')); f.channels[0].callbacks[0](); });
    await page.waitForFunction(() => window.authFixture.profileRequests.length === 3);
    await resolveProfile(page, 2, 61);
    assert.equal((await snapshot(page)).profileError, true);
    console.log('PASS auth: event bursts coalesce; successful reads do not hide channel failures');

    page = await pageFor('completion');
    await page.evaluate(() => window.authFixture.context.signUpWithEmail('new@example.test', 'password123', 'New Player'));
    await page.getByRole('heading', { name: 'Check your email' }).waitFor();
    await page.getByRole('button', { name: 'Resend confirmation' }).click();
    await page.getByText('Confirmation email requested.', { exact: false }).waitFor();
    assert.equal(await page.evaluate(() => window.authFixture.calls.at(-1).args.type), 'signup');
    await page.evaluate(() => { const f = window.authFixture; f.signUpSession = { user: f.user() }; });
    assert.equal(await page.evaluate(async () => (await window.authFixture.api.signUpWithSupabaseEmail('new@example.test', 'password123', 'Player')).status), 'signed-in');
    console.log('PASS completion: confirmation-required and immediate-session results; accessible resend state');

    page = await pageFor('completion');
    await signIn(page, 'guest-id', true);
    await page.evaluate(() => window.authFixture.context.signUpWithEmail('new@example.test', 'password123', 'Player'));
    await page.getByRole('heading', { name: 'Check your email' }).waitFor();
    assert.deepEqual(await page.evaluate(() => { const f = window.authFixture; return [f.calls.some(c => c.name === 'signUp'), f.calls.at(-1).args.password, f.snapshot.uid, f.snapshot.accountCompletion.upgrade]; }), [false, undefined, 'guest-id', true]);
    await page.getByRole('button', { name: 'Resend confirmation' }).click();
    await page.waitForFunction(() => window.authFixture.calls.at(-1).name === 'resend');
    assert.equal(await page.evaluate(() => window.authFixture.calls.at(-1).args.type), 'email_change');
    await page.evaluate(() => window.authFixture.api.signInWithSupabaseGoogle());
    assert.deepEqual(await page.evaluate(() => { const c = window.authFixture.calls.at(-1); return [c.name, c.args.options.redirectTo]; }), ['linkIdentity', 'http://auth.test/home']);
    await page.evaluate(() => { window.authFixture.mutationError = 'Manual linking disabled'; });
    assert.equal(await page.evaluate(async () => { try { await window.authFixture.api.signInWithSupabaseGoogle(); } catch (error) { return error.message; } }), 'Manual linking disabled');
    assert.equal(await page.evaluate(() => window.authFixture.calls.some(c => c.name === 'signInWithOAuth')), false);
    await page.evaluate(() => { const f = window.authFixture; f.mutationError = null; f.session = null; });
    await page.evaluate(() => window.authFixture.api.signInWithSupabaseGoogle());
    assert.deepEqual(await page.evaluate(() => { const c = window.authFixture.calls.at(-1); return [c.name, c.args.options.redirectTo]; }), ['signInWithOAuth', 'http://auth.test/home']);
    console.log('PASS guest: upgrade uses original identity, email_change resend, no retained password; OAuth preserves /home and surfaces linking failures');

    page = await pageFor('login');
    await signIn(page, 'guest-id', true);
    await page.evaluate(() => {
      const f = window.authFixture;
      f.holdUpdate = true;
      void f.context.signUpWithEmail('new@example.test', 'password123', 'Player');
    });
    await page.waitForFunction(() => window.authFixture.updateRequest);
    await page.evaluate(() => { const f = window.authFixture; f.emit('USER_UPDATED', f.user('guest-id')); });
    await settle();
    assert.equal((await snapshot(page)).accountBusy, true);
    assert.deepEqual(await page.evaluate(() => window.authFixture.routes), []);
    await page.evaluate(() => { const f = window.authFixture; f.updateRequest.resolve({ data: { user: f.user('guest-id') }, error: null }); });
    await page.getByRole('heading', { name: 'Set your password' }).waitFor();
    assert.equal((await snapshot(page)).accountCompletion.status, 'password-required');
    assert.deepEqual(await page.evaluate(() => window.authFixture.routes), []);
    await page.evaluate(() => Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw new Error('storage blocked'); } }));
    await page.getByRole('button', { name: 'Back to sign in', exact: true }).click();
    await page.waitForFunction(() => window.authFixture.routes.includes('/home'));
    console.log('PASS login: USER_UPDATED cannot bypass guest password completion; blocked return-path storage falls back to /home');

    page = await pageFor('request');
    await page.getByLabel('Email', { exact: true }).fill('member@example.test');
    await page.getByRole('button', { name: 'Send email' }).click();
    await page.getByRole('status').filter({ hasText: 'If this email is eligible' }).waitFor();
    assert.equal(await page.evaluate(() => window.authFixture.calls.at(-1).args.options.redirectTo), 'http://auth.test/reset-password');
    page = await pageFor('reset', '#error=access_denied&error_code=otp_expired');
    await page.getByRole('alert').filter({ hasText: 'invalid or expired' }).waitFor();
    assert.equal(await page.getByLabel('New password').count(), 0);
    page = await pageFor('reset');
    await page.waitForFunction(() => window.authFixture.authRequests.length === 2);
    await page.evaluate(() => { const f = window.authFixture; f.authRequests.forEach(r => r.resolve({ data: { user: f.user() }, error: null })); });
    await page.getByLabel('New password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm password', { exact: true }).fill('different123');
    await page.getByRole('button', { name: 'Save password' }).click();
    await page.getByRole('alert').filter({ hasText: 'do not match' }).waitFor();
    await page.getByLabel('Confirm password', { exact: true }).fill('password123');
    await page.getByRole('button', { name: 'Save password' }).click();
    await page.waitForFunction(() => window.authFixture.authRequests.length === 3);
    await page.evaluate(() => { const f = window.authFixture; f.authRequests[2].resolve({ data: { user: f.user() }, error: null }); });
    await page.getByRole('status').filter({ hasText: 'Your password has been updated' }).waitFor();
    assert.deepEqual(await page.evaluate(() => window.authFixture.calls.at(-1).args.password), 'password123');
    console.log('PASS recovery: request redirect, expired-link rejection, password mismatch and validated password update');

    page = await pageFor('sheet');
    await page.getByRole('button', { name: 'Open sheet', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Account form' });
    await dialog.waitFor();
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('role')), 'dialog');
    assert.equal(await page.evaluate(() => document.getElementById('test-root').inert), true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close Account form');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'First input');
    for (const label of ['Select', 'Notes', 'Editable']) {
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), label);
    }
    await page.evaluate(() => window.authFixture.rerenderSheet());
    await settle();
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Editable');
    await page.evaluate(() => { const el = document.createElement('button'); el.id = 'new-background'; document.body.append(el); });
    await page.waitForFunction(() => document.getElementById('new-background').inert);
    await page.evaluate(() => { const el = document.getElementById('new-background'); el.inert = false; el.focus(); });
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('role')), 'dialog');
    await page.getByRole('button', { name: 'Open nested', exact: true }).click();
    await page.getByRole('dialog', { name: 'Nested heading' }).waitFor();
    assert.equal(await page.evaluate(() => document.querySelector('[aria-label="Account form"]').closest('.phone-sheet-host').inert), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 1);
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Open nested');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'opener');
    assert.equal(await page.evaluate(() => document.getElementById('test-root').inert), false);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    await page.getByRole('button', { name: 'Open sheet', exact: true }).click();
    await page.evaluate(() => { window.authFixture.emptySheet(); });
    await settle();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close Account form');
    await page.getByRole('button', { name: 'Close Account form' }).evaluate(button => { button.disabled = true; });
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('role')), 'dialog');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('role')), 'dialog');
    await page.keyboard.press('Escape');
    console.log('PASS sheet: labels, controls, initial reverse tab, wrap, empty trap, dynamic background, nested Escape, callback rerenders and opener/scroll restoration');

    for (const tested of pages) assert.deepEqual(tested.errors, [], 'No unhandled browser exceptions');
    console.log('PASS all auth integrity checks (isolated fixtures; no server mutations)');
  } finally {
    await browser.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
