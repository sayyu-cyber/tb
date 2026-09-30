// Uses isolated temporary fixture accounts, never existing players. All fixture
// accounts and their dependent rows are removed in finally after real races.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const { Client } = createRequire(path.join(root, 'supabase/auth-migration/tools/firebase-to-supabase/package.json'))('pg');
async function run() {
  const credentials = { ...JSON.parse(fs.readFileSync(path.join(root, 'supabase/auth-migration/secrets/supabase-service.json'), 'utf8')), connectionTimeoutMillis: 15000 };
  const admin = new Client(credentials); await admin.connect();
  const users = Array.from({ length: 4 }, () => crypto.randomUUID());
  const workers = [];
  const code = 'T' + crypto.randomBytes(4).toString('hex').slice(0, 5).toUpperCase();
  try {
    await admin.query("insert into auth.users(id,aud,role,raw_user_meta_data) select id,'authenticated','authenticated','{\"full_name\":\"Temporary concurrency fixture\"}'::jsonb from unnest($1::uuid[]) id", [users]);
    await admin.query("insert into public.game_rooms(code,game_type,owner_id,max_players) values ($1,'gin_rummy',$2,2)", [code, users[0]]);
    await admin.query("insert into public.room_players(room_code,user_id,display_name,seat_index) values ($1,$2,'Fixture',0)", [code, users[0]]);
    async function race(uid, query, args) {
      const client = new Client(credentials); workers.push(client); await client.connect();
      await client.query('begin');
      await client.query('set local role authenticated');
      await client.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
      try { const result = await client.query(query, args); await client.query('commit'); return result.rows[0]; }
      catch (error) { await client.query('rollback'); return { error: error.message }; }
    }
    const claims = await Promise.all([0,1].map(() => race(users[0], "select public.apply_economy_action('CLAIM_DAILY_REWARD','{\"day\":1}', $1) as snapshot", [crypto.randomUUID()])));
    assert.equal(claims.filter(result => result.snapshot).length, 1);
    assert.equal(claims.filter(result => result.error?.includes('already claimed')).length, 1);
    assert.equal((await admin.query('select coins from public.wallets where user_id=$1', [users[0]])).rows[0].coins, 125);
    assert.equal((await admin.query('select * from public.daily_rewards where user_id=$1', [users[0]])).rowCount, 1);
    const spends = await Promise.all([0,1].map(() => race(users[0], "select public.apply_economy_action('SPEND_COINS','{\"amount\":100}', $1) as snapshot", [crypto.randomUUID()])));
    assert.equal(spends.filter(result => result.snapshot).length, 1);
    assert.equal((await admin.query('select coins from public.wallets where user_id=$1', [users[0]])).rows[0].coins, 25);
    const joins = await Promise.all(users.slice(1,3).map(uid => race(uid, "select public.join_room($1,'',null) as joined", [code])));
    assert.equal(joins.filter(result => !result.error).length, 1);
    assert.equal(joins.filter(result => result.error?.includes('full')).length, 1);
    assert.equal((await admin.query('select * from public.room_players where room_code=$1', [code])).rowCount, 2);
    console.log('PASS: two connections racing daily claims award once, concurrent spends cannot overspend, and concurrent joins cannot overfill the last seat');
  } finally {
    await Promise.all(workers.map(client => client.end().catch(() => {})));
    await admin.query('delete from auth.users where id=any($1::uuid[])', [users]);
    assert.equal((await admin.query('select * from public.profiles where id=any($1::uuid[])', [users])).rowCount, 0);
    await admin.end();
    console.log('Temporary fixture accounts and dependent data removed.');
  }
}
run().catch(error => { console.error(error.code ? `${error.code}: ${error.message}` : error.message); process.exitCode = 1; });
