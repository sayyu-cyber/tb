// Exercise the live permissions inside a rollback-only transaction.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const { Client } = createRequire(path.join(root, 'supabase/auth-migration/tools/firebase-to-supabase/package.json'))('pg');
async function run() {
  const client = new Client({ ...JSON.parse(fs.readFileSync(path.join(root, 'supabase/auth-migration/secrets/supabase-service.json'), 'utf8')), connectionTimeoutMillis: 15000 });
  await client.connect();
  try {
    await client.query('begin');
    const uid = crypto.randomUUID();
    await client.query("insert into auth.users(id,raw_user_meta_data,is_anonymous) values ($1,'{}',true)", [uid]);
    await client.query('set local role authenticated');
    await client.query("select set_config('request.jwt.claim.sub',$1,true), set_config('request.jwt.claims',$2,true)", [uid, JSON.stringify({ sub: uid, role: 'authenticated', is_anonymous: true })]);
    await client.query('savepoint old_save');
    await assert.rejects(() => client.query("insert into public.equipped_cosmetics(user_id,card_back,table_theme) values ($1,'cb_default','tt_default') on conflict(user_id) do update set card_back=excluded.card_back", [uid]), error => {
      console.log(`Confirmed old upsert failure: ${error.code}: ${error.message}`);
      return error.code === '42501';
    });
    await client.query('rollback to savepoint old_save');
    const updated = await client.query("update public.equipped_cosmetics set card_back='cb_default',table_theme='tt_default',profile_frame='pf_default',title='',victory_animation='va_default',banner='bn_default' where user_id=$1 returning *", [uid]);
    assert.equal(updated.rowCount, 1, 'Auth trigger creates the row; guests can update their cosmetics');
    assert.equal((await client.query('select * from public.get_economy_snapshot()')).rowCount, 1, 'Guests load the server wallet');
    const other = (await client.query('select id from public.profiles where id<>$1 limit 1', [uid])).rows[0].id;
    assert.equal((await client.query("update public.equipped_cosmetics set table_theme='tt_default' where user_id=$1", [other])).rowCount, 0, 'Guests cannot update another player');
    await client.query('select p.id,r.trophies from public.profiles p join public.ranked_progress r on r.user_id=p.id order by r.trophies desc limit 50');
    console.log('PASS: guest save, wallet read, leaderboard read and cross-player isolation');
  } finally { await client.query('rollback'); await client.end(); }
  console.log('PASS: all fixture data rolled back');
}
run().catch(error => { console.error(`${error.code || 'ERROR'}: ${error.message}`); process.exitCode = 1; });
