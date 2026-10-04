-- LOCAL DISPOSABLE DATABASE ONLY, after migrations 001-011.
-- Run with psql -v ON_ERROR_STOP=1 -f scripts/check-economy-integrity.sql.
-- No credentials or connection discovery. Fixtures and changes roll back together.
\set ON_ERROR_STOP on
begin;

create function pg_temp.check_true(p_condition boolean, p_label text)
returns void language plpgsql as $$
begin
  if p_condition is distinct from true then raise exception 'FAIL: %', p_label; end if;
  raise notice 'PASS: %', p_label;
end;
$$;
create function pg_temp.expect_error(p_statement text, p_pattern text)
returns void language plpgsql as $$
begin
  begin
    execute p_statement;
  exception when others then
    if sqlerrm ~* p_pattern then return; end if;
    raise exception 'Unexpected error: % (wanted %)', sqlerrm, p_pattern;
  end;
  raise exception 'Statement unexpectedly succeeded: %', p_statement;
end;
$$;

insert into auth.users(id, raw_user_meta_data) values
  ('08000000-0000-4000-8000-000000000001','{"full_name":"Economy fixture A"}'),
  ('08000000-0000-4000-8000-000000000002','{"full_name":"Economy fixture B"}');
update public.wallets set coins = 10000, total_earned = 10000
where user_id in ('08000000-0000-4000-8000-000000000001','08000000-0000-4000-8000-000000000002');
insert into public.room_cards(id,user_id,type,activated_at,expires_at,source) values
  ('08000000-0000-4000-8000-000000000011','08000000-0000-4000-8000-000000000001','1h',null,null,'purchase'),
  ('08000000-0000-4000-8000-000000000012','08000000-0000-4000-8000-000000000001','1h',now()-interval '2 hours',now()-interval '1 hour','purchase'),
  ('08000000-0000-4000-8000-000000000013','08000000-0000-4000-8000-000000000002','1h',null,null,'purchase');
-- Historical unverified grants must not confer an earned-only unlock.
insert into public.inventory_items(user_id,item_id,category,source) values
  ('08000000-0000-4000-8000-000000000001','bn_champion','banner','weekly_mission');

select set_config('request.jwt.claim.sub','08000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"08000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
select pg_temp.check_true((public.get_economy_snapshot()->>'integrityVersion')::integer = 1, 'complete snapshot version');
select pg_temp.check_true(jsonb_array_length(public.get_economy_snapshot()->'missions') = 6, 'three daily and three weekly server assignments');
select pg_temp.check_true((select count(*) = 6 from public.user_missions where user_id = auth.uid()), 'refresh cannot reroll or duplicate assignments');
select pg_temp.expect_error($q$select public.ensure_economy_missions(auth.uid())$q$, 'permission denied');
select pg_temp.expect_error($q$select public.economy_snapshot_v6_internal()$q$, 'permission denied');
select pg_temp.expect_error($q$select public.economy_action_v6_internal('ADD_COINS','{"source":"match_victory"}',gen_random_uuid())$q$, 'permission denied');
select pg_temp.expect_error($q$select public.apply_economy_action('ADD_COINS','{"source":"match_victory","amount":100000}',gen_random_uuid())$q$, 'Trusted settlement');
select pg_temp.expect_error($q$select public.apply_economy_action('ADD_COINS','{"source":"match_victory","amount":100000}',gen_random_uuid())$q$, 'Trusted settlement');
select pg_temp.expect_error($q$select public.apply_economy_action('ADD_COINS','{"source":"match_defeat"}',gen_random_uuid())$q$, 'Trusted settlement');
select pg_temp.expect_error($q$select public.apply_economy_action('ADD_COINS','{"source":"weekly_rank"}',gen_random_uuid())$q$, 'Trusted settlement');
select pg_temp.expect_error($q$select public.apply_economy_action('ACTIVATE_VIP','{"days":30}',gen_random_uuid())$q$, 'Trusted settlement');
select pg_temp.check_true((public.get_economy_snapshot()->'wallet'->>'coins')::integer = 10000, 'forged grants never credit');

select pg_temp.expect_error($q$select public.apply_economy_action('COMPLETE_MISSION','{"missionId":"dm_play_3_123_0","isWeekly":false}',gen_random_uuid())$q$, 'not been verified');
select pg_temp.expect_error($q$select public.apply_economy_action('UNLOCK_ACHIEVEMENT','{"achievementId":"ach_first_win"}',gen_random_uuid())$q$, 'not been verified');
select pg_temp.expect_error($q$update public.user_missions set completed=true,progress=target,verified_at=now() where user_id=auth.uid()$q$, 'permission denied');
select pg_temp.expect_error($q$update public.vip_entitlements set active=true,expires_at=now()+interval '1 year' where user_id=auth.uid()$q$, 'permission denied');
select pg_temp.expect_error($q$select public.apply_economy_action('PURCHASE_COSMETIC','{"itemId":"cb_vip_gold"}',gen_random_uuid())$q$, 'Active VIP');
select pg_temp.expect_error($q$select public.apply_economy_action('PURCHASE_COSMETIC','{"itemId":"pf_master"}',gen_random_uuid())$q$, 'must be earned');
select pg_temp.expect_error($q$select public.equip_cosmetic('cardBack','cb_dragon')$q$, 'not owned');
select pg_temp.expect_error($q$select public.equip_cosmetic('tableTheme','cb_default')$q$, 'Invalid cosmetic slot');
select pg_temp.expect_error($q$select public.equip_cosmetic('banner','bn_champion')$q$, 'Verified unlock');
select pg_temp.expect_error($q$update public.equipped_cosmetics set card_back='cb_dragon' where user_id=auth.uid()$q$, 'permission denied');

select public.apply_economy_action('PURCHASE_COSMETIC','{"itemId":"cb_ocean","price":0}','08000000-0000-4000-8000-000000000021')->'wallet' as purchased;
select public.apply_economy_action('PURCHASE_COSMETIC','{"itemId":"cb_ocean","price":0}','08000000-0000-4000-8000-000000000021')->'wallet' as replayed;
select pg_temp.check_true((public.get_economy_snapshot()->'wallet'->>'coins')::integer = 9500, 'catalog price charged exactly once despite forged price');
select public.equip_cosmetic('cardBack','cb_ocean')->'equipped' as equipped;
select pg_temp.check_true(public.get_public_appearance(auth.uid())->>'card_back' = 'cb_ocean', 'owned category equips and appears publicly');
select pg_temp.check_true((select count(*)=2 from jsonb_object_keys(public.get_public_appearance(auth.uid()))), 'public appearance exposes only two keys');

select public.activate_room_card('08000000-0000-4000-8000-000000000011')->'roomCards' as activated;
select pg_temp.expect_error($q$select public.activate_room_card('08000000-0000-4000-8000-000000000011')$q$, 'already been consumed');
select pg_temp.expect_error($q$select public.activate_room_card('08000000-0000-4000-8000-000000000012')$q$, 'already been consumed');
select pg_temp.expect_error($q$select public.activate_room_card('08000000-0000-4000-8000-000000000013')$q$, 'not found');
select pg_temp.expect_error($q$update public.room_cards set activated_at=null,expires_at=null where user_id=auth.uid()$q$, 'permission denied');
select pg_temp.check_true((select expires_at-activated_at=interval '1 hour' from public.room_cards where id='08000000-0000-4000-8000-000000000011'), 'server-owned duration');
select public.apply_economy_action('PURCHASE_ROOM_CARD','{"type":"1h","price":0}',gen_random_uuid())->'wallet' as room_purchase;
select pg_temp.check_true((public.get_economy_snapshot()->'wallet'->>'coins')::integer = 9450, 'room-card catalog price ignores caller price');

select pg_temp.expect_error($q$insert into public.coin_topup_requests(user_id,player_name,coins,price_mvr,pack_name) values(auth.uid(),'A',10000,10,'Starter Pack')$q$, 'catalog pack');
select pg_temp.expect_error($q$insert into public.coin_topup_requests(user_id,player_name,coins,price_mvr,pack_name,pack_id) values(auth.uid(),'A',100,10,'Starter Pack','pack_mega')$q$, 'catalog pack');
select pg_temp.expect_error($q$insert into public.coin_topup_requests(user_id,player_name,coins,price_mvr,pack_name) values(auth.uid(),'A',10000,0,'Admin Top-Up')$q$, 'catalog pack');
insert into public.coin_topup_requests(id,user_id,player_name,coins,price_mvr,pack_name)
values('08000000-0000-4000-8000-000000000031',auth.uid(),'A',100,10,'Starter Pack');
select pg_temp.check_true((select pack_id='pack_starter' from public.coin_topup_requests where id='08000000-0000-4000-8000-000000000031'), 'top-up SKU resolved server-side');
select set_config('economy_test.mission_id',(select id::text from public.user_missions where user_id=auth.uid() and cadence='daily' order by template_id limit 1),true);
select set_config('economy_test.reward',(select reward::text from public.user_missions where id::text=current_setting('economy_test.mission_id')),true);
select pg_temp.expect_error($q$select public.apply_economy_action('COMPLETE_MISSION',jsonb_build_object('missionId',current_setting('economy_test.mission_id'),'isWeekly',false),gen_random_uuid())$q$, 'not been verified');

reset role;
-- Simulate a trusted settlement, never a client mutation.
update public.user_missions set completed=true,progress=target,completed_at=now(),verified_at=now()
where id::text=current_setting('economy_test.mission_id');
-- Snapshot recomputation needs settled match evidence and usable inventory,
-- including a live entitlement for the catalog's VIP table.
insert into public.matches(id,game_type,pool,status,authority_version,completed_at) values
  ('08000000-0000-4000-8000-000000000041','gin_rummy','casual','completed',1,now());
insert into public.match_players(match_id,user_id,seat_index,result) values
  ('08000000-0000-4000-8000-000000000041','08000000-0000-4000-8000-000000000001',0,'win'),
  ('08000000-0000-4000-8000-000000000041','08000000-0000-4000-8000-000000000002',1,'loss');
insert into public.match_results(match_id,winner_user_id,result) values
  ('08000000-0000-4000-8000-000000000041','08000000-0000-4000-8000-000000000001','{"verified":true}');
insert into public.inventory_items(user_id,item_id,category,source)
  select '08000000-0000-4000-8000-000000000001'::uuid,c.key,'tableTheme','fixture'
  from public.app_config a cross join lateral jsonb_each(a.value->'cosmetics') c
  where a.id='economyCatalog' and c.value->>'category'='tableTheme'
  on conflict(user_id,item_id) do nothing;
update public.vip_entitlements set active=true,expires_at=now()+interval '1 day'
where user_id='08000000-0000-4000-8000-000000000001';
insert into public.user_achievements(user_id,achievement_id,progress,target,verified_at) values
  ('08000000-0000-4000-8000-000000000001','ach_first_win',1,1,now()),
  ('08000000-0000-4000-8000-000000000001','ach_all_tables',10,10,now())
  on conflict(user_id,achievement_id) do update set
    progress=excluded.progress,target=excluded.target,verified_at=excluded.verified_at;
select pg_temp.expect_error($q$update public.room_cards set activated_at=null,expires_at=null where id='08000000-0000-4000-8000-000000000012'$q$, 'cannot be reset');
select pg_temp.expect_error($q$update public.coin_topup_requests set coins=100000 where id='08000000-0000-4000-8000-000000000031'$q$, 'immutable');
set local role authenticated;
select pg_temp.check_true((public.get_economy_snapshot()->'wallet'->>'coins')::integer = 9450,
  'verified evidence refresh does not pay rewards');
select pg_temp.check_true((select progress=1 and target=1 and verified_at is not null from public.user_achievements
  where user_id=auth.uid() and achievement_id='ach_first_win'), 'verified match preserves first-win eligibility');
select pg_temp.check_true((select progress=10 and target=10 and verified_at is not null from public.user_achievements
  where user_id=auth.uid() and achievement_id='ach_all_tables'), 'all usable tables with VIP preserve Table Master eligibility');
select pg_temp.expect_error($q$select public.apply_economy_action('COMPLETE_MISSION',jsonb_build_object('missionId',current_setting('economy_test.mission_id'),'isWeekly',true),gen_random_uuid())$q$, 'cadence mismatch');
select public.apply_economy_action('COMPLETE_MISSION',jsonb_build_object('missionId',current_setting('economy_test.mission_id'),'isWeekly',false),gen_random_uuid())->'wallet' as mission;
select public.apply_economy_action('COMPLETE_MISSION',jsonb_build_object('missionId',current_setting('economy_test.mission_id'),'isWeekly',false),gen_random_uuid())->'wallet' as mission_replay;
select pg_temp.check_true((public.get_economy_snapshot()->'wallet'->>'coins')::integer = 9450+current_setting('economy_test.reward')::integer, 'trusted mission pays once across new request IDs');
select public.apply_economy_action('UNLOCK_ACHIEVEMENT','{"achievementId":"ach_first_win"}',gen_random_uuid())->'wallet' as achievement;
select public.apply_economy_action('UNLOCK_ACHIEVEMENT','{"achievementId":"ach_first_win"}',gen_random_uuid())->'wallet' as achievement_replay;
select public.apply_economy_action('UNLOCK_ACHIEVEMENT','{"achievementId":"ach_all_tables"}',gen_random_uuid())->'wallet' as zero_reward;
select public.apply_economy_action('UNLOCK_ACHIEVEMENT','{"achievementId":"ach_all_tables"}',gen_random_uuid())->'wallet' as zero_reward_replay;
select pg_temp.check_true((public.get_economy_snapshot()->'wallet'->>'coins')::integer = 9500+current_setting('economy_test.reward')::integer, 'trusted achievement pays once; zero reward is valid');

-- Second device/user can read appearance but not another user's economy rows.
select set_config('request.jwt.claim.sub','08000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"08000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',true);
select pg_temp.check_true(public.get_public_appearance('08000000-0000-4000-8000-000000000001')->>'card_back'='cb_ocean', 'opponent public appearance');
select pg_temp.check_true((select count(*)=0 from public.inventory_items where user_id='08000000-0000-4000-8000-000000000001'), 'opponent inventory remains private');
select pg_temp.expect_error($q$select public.apply_economy_action('COMPLETE_MISSION',jsonb_build_object('missionId',current_setting('economy_test.mission_id'),'isWeekly',false),gen_random_uuid())$q$, 'not been verified');

reset role;
select set_config('request.jwt.claim.sub','08000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"08000000-0000-4000-8000-000000000001","role":"authenticated","email":"sayyu9898@gmail.com","is_anonymous":false}',true);
set local role authenticated;
update public.coin_topup_requests set status='approved',decided_at=now() where id='08000000-0000-4000-8000-000000000031';
select pg_temp.check_true((select status='credited' from public.coin_topup_requests where id='08000000-0000-4000-8000-000000000031'), 'approval atomically credits canonical pack');
select pg_temp.expect_error($q$update public.coin_topup_requests set status='approved' where id='08000000-0000-4000-8000-000000000031'$q$, 'finalized|already been credited');
select pg_temp.check_true((public.get_economy_snapshot()->'wallet'->>'coins')::integer = 9600+current_setting('economy_test.reward')::integer, 'top-up paid exactly once');

reset role;
set local role anon;
select pg_temp.expect_error($q$select public.get_public_appearance('08000000-0000-4000-8000-000000000001')$q$, 'permission denied');
select pg_temp.expect_error($q$select public.get_economy_snapshot()$q$, 'permission denied');
reset role;
rollback;
