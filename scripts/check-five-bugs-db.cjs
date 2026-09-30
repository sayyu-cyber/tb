// Integration verification is rollback-only; it never applies migrations.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const { Client } = createRequire(path.join(root, 'supabase/auth-migration/tools/firebase-to-supabase/package.json'))('pg');
async function run() {
  const client = new Client({ ...JSON.parse(fs.readFileSync(path.join(root, 'supabase/auth-migration/secrets/supabase-service.json'), 'utf8')), connectionTimeoutMillis: 15000 });
  await client.connect();
  try {
    await client.query('begin');
    for (const file of ['202609300005_room_invite_join.sql', '202609300006_authoritative_wallet_rewards.sql']) await client.query(fs.readFileSync(path.join(root, 'supabase/migrations', file), 'utf8'));
    const users = (await client.query('select id from public.profiles order by created_at limit 5')).rows.map(row => row.id);
    assert.equal(users.length, 5);
    async function actor(uid, admin = false) {
      await client.query('set local role authenticated');
      await client.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)", [uid, JSON.stringify({ sub: uid, email: admin ? 'sayyu9898@gmail.com' : 'fixture@example.invalid' })]);
    }
    async function owner() { await client.query('reset role'); }
    async function fail(message, fn) {
      await client.query('savepoint expected_error');
      await assert.rejects(fn, error => error.message.includes(message));
      await client.query('rollback to savepoint expected_error');
    }
    async function action(type, payload, id = crypto.randomUUID()) { return (await client.query('select public.apply_economy_action($1,$2,$3) as snapshot', [type, payload, id])).rows[0].snapshot; }
    const uid = users[0];
    await client.query('update public.wallets set coins = 5000 where user_id = $1', [uid]);
    await client.query('delete from public.daily_rewards where user_id = $1', [uid]);
    await client.query('delete from public.inventory_items where user_id = $1 and item_id = $2', [uid, 'cb_neon']);
    await actor(uid);
    const id = crypto.randomUUID();
    let result = await action('ADD_COINS', { amount: 999999, source: 'match_victory' }, id);
    assert.equal(result.wallet.coins, 5010, 'Server determines the existing victory payout');
    assert.equal((await action('ADD_COINS', { source: 'match_victory' }, id)).wallet.coins, 5010, 'Request retry is idempotent');
    result = await action('SPEND_COINS', { amount: 13 }); assert.equal(result.wallet.coins, 4997);
    await fail('Not enough coins', () => action('SPEND_COINS', { amount: 999999 }));
    await fail('permission denied', () => client.query('update public.wallets set coins = 999999 where user_id = $1', [uid]));
    result = await action('CLAIM_DAILY_REWARD', { day: 1 }); assert.equal(result.wallet.coins, 5022);
    assert.equal(result.daily.available, false);
    assert.equal(new Date(result.daily.nextClaimAt) - new Date(result.daily.lastClaimed), 86400000);
    await fail('already claimed', () => action('CLAIM_DAILY_REWARD', { day: 2 }));
    await fail('already claimed', () => action('CLAIM_DAILY_REWARD', { day: 1 }));
    await owner();
    await client.query("update public.daily_rewards set claimed_at = now() - interval '24 hours' where user_id = $1", [uid]);
    await actor(uid);
    result = await action('CLAIM_DAILY_REWARD', { day: 2 }); assert.equal(result.wallet.coins, 5072);
    await owner();
    await client.query("delete from public.daily_rewards where user_id = $1", [uid]);
    await client.query("insert into public.daily_rewards(user_id,reward_day,claimed_at,cycle_started_at) values ($1,6,now()-interval '24 hours',now()-interval '6 days')", [uid]);
    await actor(uid);
    result = await action('CLAIM_DAILY_REWARD', { day: 7 }); assert.ok(result.roomCardId);
    assert.equal(result.daily.claimedThrough, 7, 'Seven claimed tiles stay claimed during cooldown');
    await fail('already claimed', () => action('CLAIM_DAILY_REWARD', { day: 1 }));
    const before = result.wallet.coins;
    await actor(users[1], true);
    const topup = (await client.query('select public.admin_top_up($1,$2) as wallet', [uid, 37])).rows[0].wallet;
    assert.equal(topup.coins, before + 37, 'Offline player deposit credits immediately');
    await actor(uid);
    assert.equal((await client.query('select public.get_economy_snapshot() as snapshot')).rows[0].snapshot.wallet.coins, topup.coins, 'Player and admin read the same wallet');
    await fail('Admin access', () => client.query('select public.admin_top_up($1,1)', [uid]));
    await owner();
    const deposit = (await client.query("select id from public.coin_topup_requests where user_id = $1 and coins = 37 order by created_at desc limit 1", [uid])).rows[0].id;
    await fail('already been credited', () => client.query("update public.coin_topup_requests set status = 'approved' where id = $1", [deposit]));
    console.log('PASS bugs 1/5: server balance responses, retry/overspend protection, cache write rejection, atomic offline deposit, equal admin/player reads, 24h claims and day-seven cooldown');

    const code = 'T' + crypto.randomBytes(4).toString('hex').slice(0, 5).toUpperCase();
    await client.query("insert into public.game_rooms(code,game_type,owner_id,max_players,password_hash) values ($1,'mindi',$2,4,'secret')", [code, uid]);
    await client.query('insert into public.room_players(room_code,user_id,display_name,seat_index) values ($1,$2,$3,0)', [code, uid, 'Fixture']);
    await actor(uid);
    const addressed = (await client.query("insert into public.room_invites(from_user_id,to_user_id,room_code,game_type,expires_at) values ($1,$2,$3,'mindi',now()+interval '1 day') returning id,created_at,expires_at", [uid, users[4], code])).rows[0];
    assert.equal(new Date(addressed.expires_at) - new Date(addressed.created_at), 300000, 'Server overrides client-supplied invite expiry to five minutes');
    const token = (await client.query('select public.create_room_invite_link($1) as token', [code])).rows[0].token;
    await actor(users[1]);
    const join = (tokenValue = token) => client.query('select public.join_room($1,$2,$3)', [code, '', tokenValue]);
    await join(); await join();
    assert.equal((await client.query('select * from public.room_players where room_code=$1 and user_id=$2', [code, users[1]])).rowCount, 1, 'Double-click yields one membership');
    await owner();
    await client.query("update public.room_invite_links set expires_at = now()-interval '1 second' where id=$1", [token]);
    await actor(users[2]);
    await fail('expired', join);
    await fail('password', () => join(null));
    await owner();
    await client.query('insert into public.room_bans(room_code,user_id) values ($1,$2)', [code, users[2]]);
    await actor(users[2]); await fail('banned', join);
    await owner();
    await client.query("update public.room_invite_links set expires_at=now()+interval '5 minutes' where id=$1", [token]);
    await client.query("update public.game_rooms set max_players=2 where code=$1", [code]);
    await actor(users[3]); await fail('full', join);
    await owner(); await client.query("update public.game_rooms set status='started' where code=$1", [code]);
    await actor(users[3]); await fail('already started', join);
    await actor(users[1]); await join();
    await owner(); await client.query("update public.game_rooms set status='closed' where code=$1", [code]);
    await actor(users[1]); await fail('closed', join);
    console.log('PASS bug 4: invited password bypass, atomic/idempotent membership, five-minute expiry, password, banned, full, started, closed and already joined');
  } finally { await client.query('rollback'); await client.end(); }
  console.log('PASS: all verification data/schema changes rolled back');
}
run().catch(error => { console.error(error.code ? `${error.code}: ${error.message}` : error.message); process.exitCode = 1; });
