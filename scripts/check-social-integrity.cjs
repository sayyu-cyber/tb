// Offline service regression tests. No network, environment files, or DB access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const modules = new Map();
const calls = [];
const channels = [];
const events = new Map();
const timers = new Map();
let timerId = 0;
let rpc = async () => ({ data: null, error: null });
let authCallback;
let authUnsubscribed = false;
const client = {
  rpc(name, payload) { calls.push({ name, payload }); return rpc(name, payload); },
  from() { throw new Error('Unexpected direct table access'); },
  auth: {
    getSession: async () => ({ data: { session: { user: { id: 'me' } } }, error: null }),
    onAuthStateChange(callback) { authCallback = callback; return { data: { subscription: { unsubscribe() { authUnsubscribed = true; } } } }; },
  },
  channel() {
    const channel = { handlers: [], on(_event, filter, callback) { this.handlers.push({ filter, callback }); return this; }, subscribe(callback) { this.status = callback; return this; } };
    channels.push(channel);
    return channel;
  },
  removeChannel(channel) { channel.removed = true; },
};
const browser = {
  setInterval(callback) { timers.set(++timerId, callback); return timerId; },
  clearInterval(id) { timers.delete(id); },
  addEventListener(name, callback) { events.set(name, callback); },
  removeEventListener(name, callback) { if (events.get(name) === callback) events.delete(name); },
};
function load(relative) {
  if (modules.has(relative)) return modules.get(relative);
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, reportDiagnostics: true });
  assert.equal(compiled.diagnostics.length, 0, `${relative}: syntax diagnostics`);
  const exports = {};
  const requireMock = (id) => {
    if (id === '@/lib/supabase/client') return { getSupabaseBrowserClient: () => client };
    if (id === '@/lib/supabase/data') return { realtimeChannelName: (key) => key, toMillis: (value) => value ? Date.parse(value) : 0 };
    if (id === '@/lib/messages') return load('lib/messages.ts');
    if (id === '@/lib/playerCode') return {};
    throw new Error(`Unexpected dependency ${id}`);
  };
  vm.runInNewContext(compiled.outputText, { exports, require: requireMock, window: browser, console }, { filename: relative });
  modules.set(relative, exports);
  return exports;
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
function pending() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }

async function run() {
  const dm = load('lib/messages.ts'), clubs = load('lib/clubs.ts'), friends = load('lib/friends.ts'), moderation = load('lib/moderation.ts');
  const commandCases = [
    [() => dm.ensureConversation('me', 'Untrusted', 'you', 'Untrusted'), 'dm_ensure', { actor: 'me', other: 'you' }],
    [() => dm.sendMessage('room', 'me', ' hello '), 'dm_send', { id: 'room', actor: 'me', text: 'hello' }],
    [() => dm.markConversationRead('room', 'me'), 'dm_read', { id: 'room', actor: 'me' }],
    [() => friends.sendFriendRequest('me', '', 'you', ''), 'friend_send', { actor: 'me', other: 'you' }],
    [() => friends.respondToRequest('request', true), 'friend_respond', { id: 'request', accept: true }],
    [() => friends.cancelOrRemove('request'), 'friend_remove', { id: 'request' }],
    [() => friends.sendRoomInvite('me', '', 'you', 'CODE', 'mindi'), 'invite_send', { actor: 'me', other: 'you', code: 'CODE' }],
    [() => friends.dismissRoomInvite('invite'), 'invite_remove', { id: 'invite' }],
    [() => moderation.blockUser('me', 'you'), 'block', { actor: 'me', other: 'you' }],
    [() => moderation.unblockUser('me', 'you'), 'unblock', { actor: 'me', other: 'you' }],
    [() => clubs.createClub('me', 'Forged name', 999999, ' Club ', ' ab ', ' desc '), 'club_create', { actor: 'me', name: 'Club', tag: 'AB', description: 'desc' }],
    [() => clubs.joinClub('club', 'me', 'Forged', 999999), 'club_join', { id: 'club', actor: 'me' }],
    [() => clubs.leaveClub('club', 'me'), 'club_leave', { id: 'club', actor: 'me' }],
    [() => clubs.kickMember('club', 'me', 'you'), 'club_kick', { id: 'club', actor: 'me', other: 'you' }],
    [() => clubs.transferClubOwnership('club', 'me', 'you'), 'club_transfer', { id: 'club', actor: 'me', other: 'you' }],
    [() => clubs.sendClubMessage('club', 'me', 'Forged', ' hello '), 'club_send', { id: 'club', actor: 'me', text: 'hello' }],
  ];
  for (const [invoke, action, payload] of commandCases) {
    await invoke();
    assert.equal(JSON.stringify(calls.at(-1)), JSON.stringify({ name: 'social_mutate', payload: { p_action: action, p_payload: payload } }));
  }
  const beforeEmpty = calls.length;
  await dm.sendMessage('room', 'me', ' ');
  await clubs.sendClubMessage('club', 'me', '', ' ');
  assert.equal(calls.length, beforeEmpty);
  rpc = async () => ({ error: new Error('Contact unavailable') });
  await assert.rejects(dm.sendMessage('room', 'me', 'hello'), /Contact unavailable/);
  rpc = async () => ({ data: true });
  assert.equal(await moderation.isBlockedEitherWay('me', 'you'), true);
  assert.equal(calls.at(-1).name, 'social_blocked');
  await assert.rejects(moderation.isBlockedEitherWay('someone-else', 'you'), /Caller mismatch/);

  // Equal timestamps exercise the UUID tie break, retaining sub-millisecond precision.
  const history = Array.from({ length: 500 }, (_, i) => ({ id: String(i + 1).padStart(6, '0'), sender_id: 'me', sender_name: 'Player', text: String(i + 1), created_at: '2026-10-01T12:00:00.123456+00:00' })).reverse();
  rpc = async (name, args) => {
    assert.equal(name, 'social_message_page');
    assert.equal(args.p_limit, 200);
    return { data: history.filter((row) => !args.p_before_id || row.id < args.p_before_id).slice(0, args.p_limit) };
  };
  for (const getPage of [dm.loadMessagesPage, clubs.loadClubMessagesPage]) {
    let cursor, all = [];
    do {
      const page = await getPage('room', cursor);
      assert.equal(page.messages[0].text, cursor ? (all.length === 200 ? '101' : '1') : '301');
      if (page.nextCursor) assert.equal(page.nextCursor.createdAt, history[0].created_at);
      all.push(...page.messages.map((message) => message.id));
      cursor = page.nextCursor;
    } while (cursor);
    assert.equal(all.length, 500);
    assert.equal(new Set(all).size, 500);
    assert.equal(all[199], '000500', 'Newest message is present in the initial window');
  }

  const requests = [], updates = [], errors = [];
  const stop = dm.watchSocialSnapshot('test', [{ table: 'club_members' }], () => { const p = pending(); requests.push(p); return p.promise; }, (value) => updates.push(value), (error) => errors.push(error), []);
  const channel = channels.at(-1);
  channel.status('SUBSCRIBED');
  requests[1].resolve(['new']); await tick();
  requests[0].resolve(['stale']); await tick();
  assert.equal(JSON.stringify(updates), '[["new"]]', 'Older snapshots cannot overwrite a newer one');
  channel.handlers[0].callback();
  requests[2].reject(new Error('Membership revoked')); await tick();
  assert.equal(JSON.stringify(updates.at(-1)), '[]', 'Revoked membership clears cached data');
  assert.equal(errors.length, 1);
  events.get('focus')(); requests[3].resolve(['focus']); await tick();
  channel.status('SUBSCRIBED'); requests[4].resolve(['reconnect']); await tick();
  [...timers.values()][0](); requests[5].resolve(['poll']); await tick();
  channel.handlers[0].callback(); stop(); requests[6].resolve(['after stop']); await tick();
  assert.equal(JSON.stringify(updates.at(-1)), '["poll"]');
  assert.equal(channel.removed, true);
  assert.equal(timers.size, 0);
  assert.equal(events.size, 0);
  assert.equal(authUnsubscribed, true);

  let acceptedLoads = 0;
  const stopFiltered = dm.watchSocialSnapshot('filtered', [{ table: 'profiles', accept: payload => payload.new?.id === 'friend' }],
    async () => ++acceptedLoads, () => {});
  const filtered = channels.at(-1).handlers[0];
  assert.equal(filtered.filter.accept, undefined, 'Local predicates are not passed to the realtime API');
  filtered.callback({ new: { id: 'stranger' } }); await tick();
  assert.equal(acceptedLoads, 1, 'Unrelated presence updates do not reload Friends');
  filtered.callback({ new: { id: 'friend' } }); await tick();
  assert.equal(acceptedLoads, 2, 'Relevant presence updates still reload');
  stopFiltered();

  const authPending = pending(), authUpdates = [];
  const stopAuth = dm.watchSocialSnapshot('auth', [], () => authPending.promise, (value) => authUpdates.push(value), undefined, []);
  authCallback('SIGNED_OUT');
  assert.equal(JSON.stringify(authUpdates), '[[]]', 'Sign-out clears the previous account snapshot immediately');
  stopAuth();
  authPending.resolve(['previous account']); await tick();
  assert.equal(JSON.stringify(authUpdates), '[[]]', 'A previous account request cannot repopulate after cleanup');

  rpc = async () => ({ data: [] });
  const stopDm = dm.watchMessages('room', () => {});
  assert.equal(channels.at(-1).handlers.some(({ filter }) => filter.table === 'chat_participants'), true);
  stopDm();
  const stopClub = clubs.watchClubMessages('club', () => {});
  assert.equal(channels.at(-1).handlers.some(({ filter }) => filter.table === 'club_members'), true);
  stopClub();

  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/202610010007_social_integrity.sql'), 'utf8');
  const functions = [...sql.matchAll(/create or replace function public\.(social_\w+)[\s\S]*?\$\$;/g)];
  assert.equal(functions.length, 5);
  for (const [body, name] of functions) {
    assert.match(body, /security definer set search_path = ''/i, name);
    assert.match(body, /auth\.uid\(\)/, `${name} must bind the caller`);
  }
  assert.match(sql, /from public, anon, authenticated/);
  assert.match(sql, /drop policy %I on public\.%I/);
  assert.match(sql, /create unique index social_dm_pair_unique/);
  assert.match(sql, /create trigger social_room_entry before insert on public.room_players/);
  const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const files = ['lib/messages.ts', 'lib/clubs.ts', 'lib/friends.ts', 'lib/moderation.ts'].map((file) => path.join(root, file));
  const program = ts.createProgram(files, { ...parsed.options, noEmit: true, incremental: false });
  const diagnostics = files.flatMap((file) => program.getSemanticDiagnostics(program.getSourceFile(file)));
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: (file) => file, getCurrentDirectory: () => root, getNewLine: () => '\n' }));
  console.log('Social integrity offline checks passed: 16 mutation adapters, error propagation, bidirectional-block RPC, 500-message pagination, realtime races/reconnect/membership cleanup, and SQL security contracts.');
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
