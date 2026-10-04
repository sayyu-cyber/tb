// Offline request-budget checks using the actual Friends service.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const queries = [];
let requestRows = [];
let profileFailure = false;
let subscriptions = 0;
let lastSource;
const client = {
  from(table) {
    const query = { table, filters: [], ids: [] };
    const builder = {
      select() { return builder; },
      eq(field, value) { query.filters.push([field, value]); return builder; },
      limit(value) { query.limit = value; return builder; },
      in(field, ids) { query.ids = [...ids]; return builder; },
      then(resolve, reject) {
        queries.push(query);
        return Promise.resolve(table === 'friend_requests'
          ? { data: requestRows, error: null }
          : { data: query.ids.map(id => ({ id, display_name: `Name ${id}`, photo_url: null, last_seen: null,
              ranked_progress: { trophies: 17 } })), error: profileFailure ? new Error('Profiles unavailable') : null })
          .then(resolve, reject);
      },
    };
    return builder;
  },
};
const exported = {};
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/friends.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
vm.runInNewContext(compiled.outputText, { exports: exported, require(id) {
  if (id === '@/lib/supabase/client') return { getSupabaseBrowserClient: () => client };
  if (id === '@/lib/supabase/data') return { toMillis: value => value ? Date.parse(value) : 0 };
  if (id === '@/lib/messages') return { watchSocialSnapshot(key, sources, load) {
    subscriptions++;
    lastSource = { key, sources, load };
    return () => {};
  } };
  if (id === '@/lib/playerCode') return {};
  throw new Error(`Unexpected dependency: ${id}`);
} });

async function run() {
  let empty;
  const stop = exported.watchSocialProfiles(['', ''], value => { empty = value; }, () => {});
  assert.equal(Object.keys(empty).length, 0);
  assert.equal(subscriptions, 0, 'Empty friend lists must not subscribe to all profiles');
  stop();

  requestRows = Array.from({ length: 250 }, (_, i) => ({ id: `request-${i}`, from_user_id: `player-${i}`,
    to_user_id: 'me', status: 'pending', created_at: '2026-10-03T00:00:00Z' }));
  exported.watchIncomingRequests('me', () => {});
  const requests = await lastSource.load();
  assert.equal(requests.length, 250);
  assert.equal(requests[249].fromName, 'Name player-249');
  assert.equal(requests[249].toName, 'Name me');
  const profiles = queries.filter(query => query.table === 'profiles');
  assert.equal(profiles.length, 3, '250 requests use three bounded profile reads, not 250 reads');
  assert.ok(profiles.every(query => query.ids.length <= 100));
  const ids = profiles.flatMap(query => query.ids);
  assert.equal(ids.length, 251);
  assert.equal(new Set(ids).size, 251, 'The common recipient is read only once');

  queries.length = 0;
  requestRows = [];
  assert.equal((await lastSource.load()).length, 0);
  assert.equal(queries.filter(query => query.table === 'profiles').length, 0);

  requestRows = [{ id: 'broken', from_user_id: 'other', to_user_id: 'me', status: 'pending', created_at: '' }];
  profileFailure = true;
  await assert.rejects(lastSource.load(), /Profiles unavailable/, 'A failed profile fetch must reach the subscriber error handler');
  profileFailure = false;

  exported.watchSocialProfiles(['player-2', 'player-1', 'player-2'], () => {}, () => {});
  const appearance = await lastSource.load();
  assert.equal(appearance['player-2'].trophies, 17);
  assert.equal(queries.at(-1).ids.join(','), 'player-1,player-2');
  const [profileSource, rankSource] = lastSource.sources;
  assert.equal(profileSource.accept({ new: { id: 'unrelated' } }), false);
  assert.equal(profileSource.accept({ new: { id: 'player-1' } }), true);
  assert.equal(profileSource.accept({ old: { id: 'player-2' } }), true);
  assert.equal(rankSource.accept({ new: { user_id: 'unrelated' } }), false);
  assert.equal(rankSource.accept({ new: { user_id: 'player-2' } }), true);
  assert.equal(rankSource.accept({ old: {} }), true, 'Incomplete delete events still refresh safely');
  console.log('PASS Friends loading: bounded batch reads, shared-recipient deduplication, real names/trophies, empty-list subscription avoidance, and error propagation.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
