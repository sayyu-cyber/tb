// Isolated browser regressions using the real DM/club page services and watcher.
// Only Supabase transport and unrelated UI dependencies are mocked. No live DB.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const nextWebpack = require('next/dist/compiled/webpack/webpack');
nextWebpack.init();
const { webpack } = nextWebpack;
const { chromium } = require(process.env.CHECK_PLAYWRIGHT ||
  'C:/Users/Sayyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const moduleUrl = source => 'data:text/javascript;charset=utf-8,' + encodeURIComponent(source);
const absolute = relative => JSON.stringify(path.join(root, relative).replaceAll('\\', '/'));

const mocks = moduleUrl(`
import React, { useSyncExternalStore } from 'react';
export * from ${absolute('scripts/messages-test-services.tsx')};
const listeners = new Set();
const state = window.pagination = {
  user: 'test-self', version: 0, calls: [], channels: [], pending: [], holds: new Set(),
  failLatest: false, failOlder: false, failSend: false, empty: false, overlap: false, extra: false,
  notify() { state.version++; listeners.forEach(fn => fn()); },
  switchUser() { state.user = 'second-user'; state.notify(); },
  refresh(id) { state.channels.filter(c => !c.removed && c.id === id).forEach(c => c.refresh()); },
  release() { const pending = state.pending.splice(0); state.holds.clear(); pending.forEach(fn => fn()); },
};
const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export function useAuth() {
  useSyncExternalStore(subscribe, () => state.version);
  return { user: { uid: state.user, displayName: 'Player' }, isGuest: false };
}
export function useSearchParams() {
  useSyncExternalStore(subscribe, () => state.version);
  return new URLSearchParams(location.search);
}
export const useRouter = () => ({
  replace(url) { history.replaceState(null, '', url); state.notify(); }, push() {},
});
export const watchSocialProfiles = (_ids, callback) => { callback({}); return () => {}; };
const row = (id, index) => ({
  id: id + '-' + String(index).padStart(4, '0'), sender_id: index % 2 ? state.user : 'mariyam',
  sender_name: 'Mariyam', text: id + ' message ' + index,
  created_at: new Date(Date.UTC(2026, 8, 1) + index * 1000).toISOString().replace('.000Z', '.123456Z'),
});
const client = {
  async rpc(name, payload) {
    state.calls.push({ name, ...payload });
    const older = !!payload.p_before_id;
    const sending = name === 'social_mutate' && ['dm_send', 'club_send'].includes(payload.p_action);
    const held = name === 'social_mutate' && payload.p_action === 'dm_ensure' ? 'ensure' : sending ? 'send' : older ? 'older' : 'latest';
    const user = state.user;
    const snapshot = { fail: older ? state.failOlder : state.failLatest, sendError: state.failSend, empty: state.empty,
      overlap: state.overlap, extra: state.extra };
    if (state.holds.has(held)) await new Promise(resolve => state.pending.push(resolve));
    if (name === 'social_mutate') return { data: payload.p_action === 'dm_ensure' ? 'c-' + payload.p_payload.other : null,
      error: sending && snapshot.sendError ? new Error('Send failed') : null };
    if (name !== 'social_message_page') throw new Error('Unexpected RPC ' + name);
    if (snapshot.fail) return { data: null, error: { code: '42501', message: 'membership revoked' } };
    if (snapshot.empty) return { data: [], error: null };
    const id = payload.p_id;
    const boundary = older ? Number(payload.p_before_id.split('-').at(-1)) : (snapshot.extra ? 501 : 500);
    let indices = Array.from({ length: Math.min(boundary, 200) }, (_, i) => boundary - 1 - i);
    if (older && snapshot.overlap) indices = [boundary, ...indices.slice(0, 199)];
    return { data: indices.map(index => ({ ...row(id, index), sender_id: index % 2 ? user : 'mariyam' })), error: null };
  },
  from(table) {
    let all = false;
    const query = {
      select() { return query; }, eq() { return query; }, in() { all = true; return query; },
      limit() { return query; },
      async then(resolve) {
        const participants = [{ room_id: 'c-mariyam', user_id: state.user, display_name: 'Player' },
          { room_id: 'c-mariyam', user_id: 'mariyam', display_name: 'Mariyam' }];
        const data = table === 'chat_rooms' ? [{ id: 'c-mariyam', last_message: 'Latest', last_message_at: new Date().toISOString(), last_sender_id: 'mariyam' }]
          : all ? participants : [participants[0]];
        if (state.holds.has('conversations')) await new Promise(done => state.pending.push(done));
        return resolve({ data, error: null });
      },
    };
    return query;
  },
  channel() {
    const channel = {
      removed: false, id: '',
      on(_event, source, callback) { this.id = source.filter?.split('eq.')[1]; this.refresh = callback; return this; },
      subscribe(callback) { this.status = callback; return this; },
    };
    state.channels.push(channel);
    return channel;
  },
  removeChannel(channel) { channel.removed = true; },
  auth: { onAuthStateChange(callback) {
    state.auth = callback;
    return { data: { subscription: { unsubscribe() {} } } };
  } },
};
export const getSupabaseBrowserClient = () => client;
`);
const entry = moduleUrl(`
import React, { useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { MessagesClient } from ${absolute('components/messages/MessagesClient.tsx')};
import { ClubHome } from ${absolute('components/clubs/ClubHome.tsx')};
import { useAuth } from '@/contexts/AuthContext';
const state = window.pagination;
function App() {
  const { user } = useAuth();
  const club = new URLSearchParams(location.search).get('club');
  // A phone (landscape, at most 500 tall) gets LClubs' hero, as ClubsClient does.
  const phone = innerHeight <= 500;
  return club ? React.createElement('div', { className: phone ? 'arena-land is-m is-land arena-lclubs' : 'arena-clubs' },
    React.createElement(ClubHome, { myUid: user.uid, myName: 'Player', land: phone,
      club: { id: club, name: 'Test Club', tag: 'TEST', ownerUid: user.uid,
        members: [user.uid], memberNames: {}, memberTrophies: {}, createdAt: 0, description: '' } }))
    : React.createElement(MessagesClient);
}
createRoot(document.getElementById('test-root')).render(React.createElement(App));
`);

async function run() {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'thaasbai-pagination-'));
  const mockNames = new Set([
    '@/contexts/AuthContext', '@/contexts/ToastContext', '@/contexts/HomeSocialContext', 'next/navigation',
    '@/lib/supabase/client', '@/lib/presence', '@/lib/rooms', '@/lib/friends', '@/hooks/useTranslation', 'next/link',
  ]);
  await new Promise((resolve, reject) => webpack({
    mode: 'development', devtool: false, entry,
    output: { path: output, filename: 'component.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@': root } },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(__dirname, 'friends-test-loader.cjs') }] },
    plugins: [new webpack.NormalModuleReplacementPlugin(/.*/, resource => {
      if (mockNames.has(resource.request)) resource.request = mocks;
      else if (/\.css$/.test(resource.request)) resource.request = moduleUrl('export default {};');
    })],
    optimization: { minimize: false },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || stats.toString()) : resolve()));
  const cssFiles = [...fs.readFileSync(path.join(root, 'app/layout.tsx'), 'utf8').matchAll(/import "@\/(styles\/[^"\n]+\.css)"/g)].map(m => m[1]);
  const css = cssFiles.map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n')
    + fs.readFileSync(path.join(root, 'components/messages/message-history.css'), 'utf8');
  const script = fs.readFileSync(path.join(output, 'component.js'), 'utf8');
  const server = http.createServer((request, response) => {
    if (request.url === '/fixture.css') {
      response.writeHead(200, { 'Content-Type': 'text/css' }); response.end(css); return;
    }
    if (request.url.startsWith('/login')) {
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end('<html><head><link rel="stylesheet" href="/fixture.css"></head><body class="arena-app"></body></html>'); return;
    }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>`
      + `<body class="arena-app" style="margin:0"><div id="test-root"></div><script>${script.replace(/<\/script/gi, '<\\/script')}</script></body></html>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    const channel = process.env.CHECK_CHANNEL === undefined ? 'msedge' : process.env.CHECK_CHANNEL;
    browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
    if (!process.argv.includes('--legacy-only')) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const rows = page.locator('[data-message-id]');
    const older = page.getByRole('button', { name: 'Load older messages' });
    // A phone is landscape (design/arena/LANDSCAPE.md): Messages is LMessages
    // and Clubs LClubs, at 844x390 and 740x360.
    async function open(kind, width = 1440, target, height = width < 768 ? 844 : 900) {
      await page.setViewportSize({ width, height });
      await page.goto(base + (kind === 'club' ? '/?club=' + (target || 'club-a') : '/messages?with=' + (target || 'mariyam')));
      if (kind === 'club') await page.getByRole('button', { name: 'Club Chat', exact: true }).click();
      await page.waitForFunction(() => document.querySelectorAll('[data-message-id]').length === 200);
    }
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const holdOlder = () => page.evaluate(() => window.pagination.holds.add('older'));
    const release = () => page.evaluate(() => window.pagination.release());
    const scroll = page.getByRole('region', { name: /message history/i });
    async function anchor() {
      return scroll.evaluate(node => {
        const top = node.getBoundingClientRect().top;
        const item = [...node.querySelectorAll('[data-message-id]')].find(row => row.getBoundingClientRect().bottom > top);
        return { id: item.dataset.messageId, offset: item.getBoundingClientRect().top - top };
      });
    }
    async function checkAnchor(saved) {
      const position = await page.locator(`[data-message-id="${saved.id}"]`).evaluate(node =>
        node.getBoundingClientRect().top - node.closest('[role=region]').getBoundingClientRect().top);
      assert.ok(Math.abs(position - saved.offset) < 2, `Visible anchor preserved: ${position} vs ${saved.offset}`);
    }

    for (const kind of ['dm', 'club']) {
      const id = kind === 'club' ? 'club-a' : 'c-mariyam';
      const sizes = [[1440, 900], [844, 390], [740, 360]];
      for (const [width, height] of sizes) {
        await open(kind, width, undefined, height);
        assert.equal(await rows.first().getAttribute('data-message-id'), id + '-0300');
        assert.equal(await rows.last().getAttribute('data-message-id'), id + '-0499');
        assert.ok(await scroll.evaluate(node => node.scrollHeight > node.clientHeight), 'History scrolls: ' + JSON.stringify(await scroll.evaluate(node => ({
          kind: node.className, height: node.clientHeight, scrollHeight: node.scrollHeight,
          parentHeight: node.parentElement.clientHeight, cssHeight: getComputedStyle(node.parentElement).height,
          minHeight: getComputedStyle(node).minHeight, overflow: getComputedStyle(node).overflowY,
        }))));
        await scroll.evaluate(node => { node.scrollTop = 120; });
        await older.focus();
        const saved = await anchor();
        await holdOlder();
        await page.keyboard.press('Enter');
        await page.getByRole('status').filter({ hasText: 'Loading older messages' }).waitFor();
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => window.pagination.calls.filter(c => c.p_before_id).length), 1, 'Concurrent requests suppressed');
        assert.equal(await scroll.getAttribute('aria-busy'), 'true');
        await release();
        await page.waitForFunction(() => document.querySelectorAll('[data-message-id]').length === 400);
        await settle();
        await checkAnchor(saved);
        assert.equal(await older.evaluate(node => node === document.activeElement), true, 'Keyboard focus retained');
        const request = await page.evaluate(() => window.pagination.calls.find(c => c.p_before_id));
        assert.equal(request.p_before_id, id + '-0300');
        assert.equal(request.p_before_time, '2026-09-01T00:05:00.123456Z', 'Exact service cursor preserved');
        assert.equal(request.p_kind, kind);

        await page.evaluate(id => { window.pagination.extra = true; window.pagination.refresh(id); }, id);
        await page.waitForFunction(() => document.querySelectorAll('[data-message-id]').length === 401);
        await settle();
        await checkAnchor(saved);
        assert.equal(await rows.first().getAttribute('data-message-id'), id + '-0100', 'Live window retains loaded history');
        await older.click();
        await page.getByRole('status').filter({ hasText: 'Beginning of conversation' }).waitFor();
        assert.equal(await rows.count(), 501);
        assert.equal(await older.getAttribute('aria-disabled'), 'true');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${kind}: no overflow at ${width}`);
        await page.screenshot({ path: path.join(output, `${kind}-${width}.png`) });
      }

      await open(kind);
      await page.evaluate(() => { window.pagination.overlap = true; });
      await older.click();
      await page.waitForFunction(() => document.querySelectorAll('[data-message-id]').length === 399);
      assert.equal(await rows.evaluateAll(nodes => new Set(nodes.map(node => node.dataset.messageId)).size), 399, 'Overlapping page deduped');
      await page.evaluate(id => window.pagination.refresh(id), id);
      await settle();
      assert.equal(await rows.count(), 399, 'Realtime overlap deduped');

      for (const mode of ['empty', 'failLatest', 'failOlder']) {
        await open(kind);
        await older.click();
        await page.waitForFunction(() => document.querySelectorAll('[data-message-id]').length === 400);
        await holdOlder();
        await older.click();
        await page.getByRole('status').filter({ hasText: 'Loading older messages' }).waitFor();
        await page.evaluate(({ mode, id }) => {
          window.pagination[mode] = true;
          if (mode !== 'failOlder') window.pagination.refresh(id);
        }, { mode, id });
        if (mode === 'failOlder') {
          // The held request captured success. Start a failing older request next.
          await release();
          await page.getByRole('status').filter({ hasText: 'Beginning' }).waitFor();
          await open(kind);
          await page.evaluate(() => { window.pagination.failOlder = true; });
          await older.click();
        }
        await page.waitForFunction(() => document.querySelectorAll('[data-message-id]').length === 0);
        await release();
        await settle();
        assert.equal(await rows.count(), 0, `${kind}: ${mode} clears cached and pending history`);
        if (mode !== 'empty') {
          assert.equal(await page.evaluate(id => window.pagination.channels.filter(c => !c.removed && c.id === id).length, id), 0, 'Failed watcher stopped');
          await page.getByRole('button', { name: 'Try again' }).waitFor();
          await page.evaluate(() => { window.pagination.failLatest = false; window.pagination.failOlder = false; });
          await page.getByRole('button', { name: 'Try again' }).click();
          await page.waitForFunction(() => document.querySelectorAll('[data-message-id]').length === 200);
        }
      }

      for (const switchKind of ['thread', 'user']) {
        await open(kind);
        await holdOlder();
        await older.click();
        await page.getByRole('status').filter({ hasText: 'Loading older messages' }).waitFor();
        await page.evaluate(({ switchKind, kind }) => {
          if (switchKind === 'user') window.pagination.switchUser();
          else { history.replaceState(null, '', kind === 'club' ? '/?club=club-b' : '/messages?with=hussain'); window.pagination.notify(); }
        }, { switchKind, kind });
        if (kind === 'club' && switchKind === 'thread') await settle();
        await page.waitForFunction(() => document.querySelectorAll('[data-message-id]').length === 200);
        await release();
        await settle();
        assert.equal(await rows.count(), 200, `${kind}: stale ${switchKind} response ignored`);
        if (switchKind === 'thread') assert.ok((await rows.first().getAttribute('data-message-id')).startsWith(kind === 'club' ? 'club-b' : 'c-hussain'));
      }

      // A completion or failure from the previous identity cannot clear a new draft or show its error.
      await open(kind);
      const input = page.getByRole('textbox', { name: kind === 'club' ? 'Message the club' : 'Message\u2026' });
      await input.fill('Old draft');
      await page.evaluate(() => { window.pagination.holds.add('send'); window.pagination.failSend = true; });
      await page.getByRole('button', { name: kind === 'club' ? 'Send to club' : 'Send message', exact: true }).click();
      await page.waitForFunction(() => window.pagination.pending.length === 1);
      await page.evaluate(() => window.pagination.switchUser());
      await page.waitForFunction(() => document.querySelectorAll('[data-message-id]').length === 200);
      assert.equal(await input.inputValue(), '', 'Account change clears previous draft');
      await input.fill('New draft');
      await release();
      await settle();
      assert.equal(await input.inputValue(), 'New draft', 'Stale send cannot clear current draft');
      assert.equal(await page.getByRole('alert').count(), 0, 'Stale send error ignored');
      console.log(`${kind}: ${sizes.map(([w, h]) => w + 'x' + h).join('/')}, exact cursors, 501 messages, keyboard/loading/end, scroll anchoring, live retention, dedupe, access/error clears and thread/user races passed.`);
    }

    // Deferred DM creation must not leave a subscription behind after navigation.
    await open('dm');
    await page.evaluate(() => {
      window.pagination.holds.add('ensure');
      history.replaceState(null, '', '/messages?with=slow'); window.pagination.notify();
    });
    await page.waitForFunction(() => window.pagination.pending.length === 1);
    await page.evaluate(() => { history.replaceState(null, '', '/messages?with=other'); window.pagination.notify(); });
    await page.waitForFunction(() => window.pagination.pending.length === 2);
    await release();
    await page.waitForFunction(() => document.querySelectorAll('[data-message-id]').length === 200);
    assert.equal(await page.evaluate(() => window.pagination.channels.filter(c => !c.removed && c.id === 'c-slow').length), 0);
    // On a phone the thread sits beside the list (LMessages), so there is no
    // Back: picking another conversation swaps the pane, and the shell's
    // chrome stays.
    await open('dm', 844, undefined, 390);
    await page.locator('.arena-lmessages .conv').first().waitFor();
    assert.equal(await page.locator('.arena-lmessages .cp [role=region]').count(), 1, 'Phone: the thread is beside the list');
    await page.locator('.arena-lmessages .conv').first().click();
    await page.waitForFunction(() => document.querySelectorAll('[data-message-id]').length === 200);
    await page.evaluate(() => {
      window.pagination.holds.add('conversations');
      window.pagination.switchUser();
    });
    await page.getByText('Loading conversations...').waitFor();
    assert.equal(await page.locator('.arena-lmessages .conv').count(), 0, 'Old account list cleared before reload');
    await release();
    await page.locator('.arena-lmessages .conv').first().waitFor();
    assert.deepEqual(errors, [], 'No browser errors');
    console.log('Deferred DM creation, send completion, the phone two-pane layout and account-list isolation passed. Screenshots: ' + output);
    }
    if (process.argv.includes('--legacy') || process.argv.includes('--legacy-only')) {
      for (const file of ['check-messages-ui.cjs', 'check-clubs-ui.cjs']) {
        await new Promise((resolve, reject) => {
          const child = spawn(process.execPath, [path.join(__dirname, file)], {
            cwd: root, env: { ...process.env, CHECK_BASE_URL: base }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
          });
          let result = '';
          child.stdout.on('data', chunk => { result += chunk; });
          child.stderr.on('data', chunk => { result += chunk; });
          child.on('error', reject);
          child.on('close', code => code === 0 ? (console.log(result.trim()), resolve()) : reject(new Error(file + ': ' + result.slice(-8000))));
        });
      }
    }
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
