-- Run only in the isolated local DB harness after migrations 001 through 011.
-- Fixture setup impersonates trusted storage; all assertions use normal RPCs
-- where applicable. This file never commits fixtures or changes product rules.
\set ON_ERROR_STOP on
begin;
set local statement_timeout = '15s';
set local lock_timeout = '5s';

create function pg_temp.progress_check(p_ok boolean, p_message text)
returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'FAIL: %', p_message; end if;
end;
$$;
create function pg_temp.progress_expect_error(p_sql text, p_pattern text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm ~ p_pattern then return; end if;
    raise;
  end;
  raise exception 'Expected error matching %: %', p_pattern, p_sql;
end;
$$;

create temporary table progress_users(n integer primary key, id uuid not null);
insert into progress_users select n,gen_random_uuid() from generate_series(1,3) n;
insert into auth.users(id,email,raw_user_meta_data)
  select id,'progress-' || id || '@example.invalid',jsonb_build_object('name','Progress fixture ' || n)
  from progress_users;
create temporary table progress_baseline as
  select w.user_id,w.coins,w.total_earned from public.wallets w join progress_users u on u.id=w.user_id;
create temporary table progress_matches(n integer primary key, id uuid not null);
insert into progress_matches select n,gen_random_uuid() from generate_series(1,9) n;
create temporary table progress_snapshots(label text primary key, body jsonb not null);
create temporary table progress_write_log(relation_name text not null);
create function pg_temp.progress_record_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into pg_temp.progress_write_log(relation_name) values(tg_table_name);
  return new;
end;
$$;
-- Transactional instrumentation catches physical writes even when now() is
-- unchanged inside this fixture transaction. Both triggers disappear on rollback.
create trigger progress_fixture_achievement_write after insert or update on public.user_achievements
  for each row execute function pg_temp.progress_record_write();
create trigger progress_fixture_mission_write after insert or update on public.user_missions
  for each row execute function pg_temp.progress_record_write();
grant select on progress_users,progress_baseline,progress_matches to authenticated,anon;
grant select on progress_write_log to authenticated;
grant all on progress_snapshots to authenticated;

-- Legacy totals and labels disagree with the trusted evidence on purpose.
update public.player_stats set wins=999,total_matches=999,peak_trophies=75,highest_rank='Platinum'
  where user_id in (select id from progress_users where n in (1,2));
update public.ranked_progress set trophies=case when user_id=(select id from progress_users where n=1) then 50 else 24 end,
  current_rank='Platinum',highest_rank='Platinum'
  where user_id in (select id from progress_users where n in (1,2));
insert into public.matches(id,game_type,pool,status,authority_version,completed_at)
  select id,case when n=3 then 'mindi'::public.game_type else 'gin_rummy'::public.game_type end,
    'casual','completed',case when n in (5,6,8) then 0 else 1 end,now() from progress_matches;
insert into public.match_players(match_id,user_id,seat_index,result)
  select m.id,u.id,0,case when m.n=4 then 'loss' else 'win' end
  from progress_matches m join progress_users u on u.n=case when m.n=7 then 2 else 1 end
  where m.n<>9;
-- n=3 models a team win without winner_user_id. n=7 and n=9 name the
-- main user as winner but lack their membership; neither may count.
insert into public.match_results(match_id,winner_user_id,winner_team,result)
  select m.id,case when m.n=3 then null else u.id end,case when m.n=3 then 'A' else null end,
    case when m.n=5 then '{"verified":false}'::jsonb when m.n=6 then '{}'::jsonb
      else '{"verified":true}'::jsonb end
  from progress_matches m cross join progress_users u where u.n=1 and m.n<>8;

insert into public.user_achievements(user_id,achievement_id,progress,target,unlocked_at)
  select u.id,a.key,999,1,now()-interval '30 days'
  from progress_users u cross join public.app_config c cross join lateral jsonb_each(c.value->'achievements') a
  where u.n=1 and c.id='economyCatalog';
insert into public.inventory_items(user_id,item_id,category,source)
  select u.id,i.id,i.category,'legacy' from progress_users u cross join (values
    ('cb_ocean','cardBack'),('cb_fire','cardBack'),('tt_red','tableTheme'),
    ('pf_master','profileFrame'),('pf_animated_gold','profileFrame'),('bn_champion','banner'),
    ('cb_vip_gold','cardBack'),('tt_vip','tableTheme'),('em_thumbs','tableTheme'),('unknown_item','cardBack')
  ) i(id,category) where u.n=1;

-- Deterministic existing assignments exercise all three real weekly rank IDs.
-- ensure_economy_missions must preserve their rewards and assignment identity.
insert into public.user_missions(user_id,cadence,template_id,title,description,target,reward,reward_cosmetic_id,
  period_start,progress,completed,completed_at)
  select u.id,'weekly',m.key,m.value->>'title',m.value->>'description',1,(m.value->>'reward')::integer,
    m.value->>'rewardCosmeticId',date_trunc('week',now() at time zone 'UTC')::date,999,true,now()-interval '30 days'
  from progress_users u cross join public.app_config c cross join lateral jsonb_each(c.value->'missions') m
  where u.n=1 and c.id='economyCatalog' and m.key in ('wm_reach_silver','wm_reach_gold','wm_reach_platinum');
insert into public.user_missions(user_id,cadence,template_id,title,description,target,reward,period_start,generated_at)
  select id,'weekly','wm_reach_gold','Expired Gold','Fixture',1,500,
    date_trunc('week',now() at time zone 'UTC')::date-7,now()-interval '7 days'
  from progress_users where n=1;
insert into public.user_missions(user_id,cadence,template_id,title,description,target,reward,period_start,generated_at,
  progress,completed,completed_at)
  select u.id,'weekly',m.id,'Fixture','Fixture',1,300,
    case when m.id='wm_reach_platinum' then null else date_trunc('week',now() at time zone 'UTC')::date end,
    case when m.id='wm_reach_gold' then now()+interval '1 day' else now() end,999,true,now()
  from progress_users u cross join (values ('wm_reach_silver'),('wm_reach_gold'),('wm_reach_platinum')) m(id)
  where u.n=2;
insert into public.user_missions(user_id,cadence,template_id,title,description,target,reward,period_start,progress,completed,completed_at)
  select id,'weekly','wm_weekend_champ','Champion','Fixture',1,2000,
    date_trunc('week',now() at time zone 'UTC')::date,1,true,now() from progress_users where n=3;

-- Check effective ACLs, including PUBLIC, before exercising normal-user calls.
do $$ declare r text; f text; begin
  foreach r in array array['anon','authenticated'] loop
    foreach f in array array['public.ensure_verified_economy_progress(uuid)',
      'public.economy_snapshot_v8_internal()','public.economy_snapshot_v6_internal()'] loop
      perform pg_temp.progress_check(not has_function_privilege(r,f,'EXECUTE'),r || ' cannot execute ' || f);
    end loop;
  end loop;
  perform pg_temp.progress_check(has_function_privilege('service_role','public.ensure_verified_economy_progress(uuid)','EXECUTE'),
    'trusted service can refresh progress');
  perform pg_temp.progress_check(has_function_privilege('authenticated','public.get_economy_snapshot()','EXECUTE'),
    'normal user can read snapshot');
  perform pg_temp.progress_check(not has_function_privilege('anon','public.get_economy_snapshot()','EXECUTE'),
    'anonymous role cannot read snapshot');
end $$;

select set_config('request.jwt.claim.sub',(select id::text from progress_users where n=1),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from progress_users where n=1),
  'role','authenticated','is_anonymous',false)::text,true);
set local role authenticated;
select pg_temp.progress_expect_error($q$select public.apply_economy_action('UNLOCK_ACHIEVEMENT',
  '{"achievementId":"ach_100_wins","progress":100,"verified":true}',gen_random_uuid())$q$,'not been verified');
select pg_temp.progress_expect_error($q$select public.ensure_verified_economy_progress(auth.uid())$q$,'permission denied');
select pg_temp.progress_expect_error($q$select public.economy_snapshot_v8_internal()$q$,'permission denied');
select pg_temp.progress_expect_error($q$update public.user_achievements set verified_at=now(),progress=100 where user_id=auth.uid()$q$,'permission denied');
select pg_temp.progress_expect_error($q$update public.user_missions set verified_at=now() where user_id=auth.uid()$q$,'permission denied');
select pg_temp.progress_expect_error($q$update public.inventory_items set verified_at=now() where user_id=auth.uid()$q$,'permission denied');
select pg_temp.progress_expect_error($q$update public.match_players set result='win' where user_id=auth.uid()$q$,'permission denied');
do $$ begin
  begin
    insert into public.match_results(match_id,winner_user_id,result)
      values((select id from progress_matches where n=8),auth.uid(),'{"verified":true}');
    raise exception 'Normal user forged verified match evidence';
  exception when insufficient_privilege then null; -- SQLSTATE 42501 covers ACL and RLS denial.
  end;
  perform pg_temp.progress_check(not exists(select 1 from public.match_results
    where match_id=(select id from progress_matches where n=8)), 'denied forgery leaves no result row');
end $$;
-- These protected tables may reject a mutation through RLS instead of an ACL.
do $$ declare changed integer; begin
  begin
    update public.ranked_progress set trophies=999 where user_id=auth.uid();
    get diagnostics changed = row_count;
    perform pg_temp.progress_check(changed=0,'normal user cannot forge trophies');
  exception when insufficient_privilege then null; end;
  begin
    update public.player_stats set peak_trophies=999 where user_id=auth.uid();
    get diagnostics changed = row_count;
    perform pg_temp.progress_check(changed=0,'normal user cannot forge peak');
  exception when insufficient_privilege then null; end;
end $$;
insert into progress_snapshots values ('initial',public.get_economy_snapshot());
do $$ declare s jsonb := (select body from progress_snapshots where label='initial'); a jsonb; begin
  perform pg_temp.progress_check(s->>'integrityVersion'='1','integrityVersion contract');
  perform pg_temp.progress_check(s ?& array['wallet','inventory','equipped','roomCards','vip','missions','achievements'], 'snapshot fields preserved');
  perform pg_temp.progress_check((s#>>'{wallet,coins}')::integer=(select coins from progress_baseline where user_id=auth.uid()),
    'snapshot refresh never pays rewards');
  for a in select value from jsonb_array_elements(s->'achievements') loop
    perform pg_temp.progress_check(a->>'unlocked_at' is not null,'historical unlocked display retained');
    if a->>'achievement_id'='ach_weekend_champ' then
      perform pg_temp.progress_check(a->>'verified_at' is null,'champion stays unverified');
    else
      perform pg_temp.progress_check(a->>'verified_at' is not null,'derived progress is verified');
      perform pg_temp.progress_check((a->>'progress')::integer=case a->>'achievement_id'
        when 'ach_first_win' then 1 when 'ach_10_wins' then 3 when 'ach_50_wins' then 3 when 'ach_100_wins' then 3
        when 'ach_first_gold' then 1 when 'ach_first_platinum' then 1 when 'ach_10_cardbacks' then 3
        when 'ach_all_tables' then 2 when 'ach_100_collection' then 8 end,'exact partial count for ' || (a->>'achievement_id'));
      perform pg_temp.progress_check((a->>'target')::integer=case a->>'achievement_id'
        when 'ach_first_win' then 1 when 'ach_10_wins' then 10 when 'ach_50_wins' then 50 when 'ach_100_wins' then 100
        when 'ach_first_gold' then 1 when 'ach_first_platinum' then 1 when 'ach_10_cardbacks' then 10
        when 'ach_all_tables' then 10 when 'ach_100_collection' then 56 end,'actual product target for ' || (a->>'achievement_id'));
    end if;
  end loop;
  perform pg_temp.progress_check(jsonb_array_length(s->'achievements')=10,'all historical achievement rows retained');
  perform pg_temp.progress_check((select count(*)=3 from public.user_missions where user_id=auth.uid() and cadence='weekly'
    and period_start=date_trunc('week',now() at time zone 'UTC')::date),'assignments unchanged');
  perform pg_temp.progress_check((select bool_and(progress=case when template_id='wm_reach_platinum' then 0 else 1 end
    and completed=(template_id<>'wm_reach_platinum') and verified_at is not null
    and (completed_at is not null)=(template_id<>'wm_reach_platinum'))
    from public.user_missions where user_id=auth.uid() and cadence='weekly'
      and period_start=date_trunc('week',now() at time zone 'UTC')::date),'weekly rank uses current trophies, not peak or stale completed flag');
  perform pg_temp.progress_check((select verified_at is null from public.user_missions where user_id=auth.uid()
    and template_id='wm_reach_gold' and period_start=date_trunc('week',now() at time zone 'UTC')::date-7),'expired assignment untouched');
end $$;
select set_config('progress_test.write_count',(select count(*)::text from progress_write_log),true);
insert into progress_snapshots values ('replay',public.get_economy_snapshot());
do $$ begin
  perform public.get_economy_snapshot();
  perform public.get_economy_snapshot();
end $$;
select pg_temp.progress_check((select count(*) from progress_write_log)=current_setting('progress_test.write_count')::bigint,
  'repeated snapshots emit ZERO achievement or mission writes, preventing realtime refresh loops');
select pg_temp.progress_check((select body #- '{daily,serverNow}' from progress_snapshots where label='initial')=
  (select body #- '{daily,serverNow}' from progress_snapshots where label='replay'),'snapshot refresh is idempotent except server clock');
select pg_temp.progress_expect_error($q$select public.apply_economy_action('UNLOCK_ACHIEVEMENT',
  '{"achievementId":"ach_10_wins","progress":999,"target":1}',gen_random_uuid())$q$,'not been verified');
select pg_temp.progress_expect_error($q$select public.apply_economy_action('UNLOCK_ACHIEVEMENT',
  '{"achievementId":"ach_weekend_champ"}',gen_random_uuid())$q$,'not been verified');
select pg_temp.progress_expect_error($q$select public.apply_economy_action('CLAIM_WEEKLY_RANK_REWARD',
  '{"rank":"Platinum"}',gen_random_uuid())$q$,'Unsupported economy action');
select pg_temp.progress_expect_error($q$select public.apply_economy_action('COMPLETE_MISSION',
  jsonb_build_object('missionId',(select id from public.user_missions where user_id=auth.uid() and template_id='wm_reach_platinum'),
  'isWeekly',true,'rank','Platinum'),gen_random_uuid())$q$,'not been verified');
do $$ declare id text; request uuid; begin
  foreach id in array array['ach_first_win','ach_first_gold','ach_first_platinum'] loop
    request := gen_random_uuid();
    perform public.apply_economy_action('UNLOCK_ACHIEVEMENT',jsonb_build_object('achievementId',id),request);
    perform public.apply_economy_action('UNLOCK_ACHIEVEMENT',jsonb_build_object('achievementId',id),request);
    perform public.apply_economy_action('UNLOCK_ACHIEVEMENT',jsonb_build_object('achievementId',id),gen_random_uuid());
  end loop;
  for id in select m.id::text from public.user_missions m where user_id=auth.uid() and cadence='weekly'
    and period_start=date_trunc('week',now() at time zone 'UTC')::date and template_id in ('wm_reach_silver','wm_reach_gold') loop
    request := gen_random_uuid();
    perform public.apply_economy_action('COMPLETE_MISSION',jsonb_build_object('missionId',id,'isWeekly',true),request);
    perform public.apply_economy_action('COMPLETE_MISSION',jsonb_build_object('missionId',id,'isWeekly',true),request);
    perform public.apply_economy_action('COMPLETE_MISSION',jsonb_build_object('missionId',id,'isWeekly',true),gen_random_uuid());
  end loop;
  perform pg_temp.progress_check((public.get_economy_snapshot()#>>'{wallet,coins}')::integer=
    (select coins+3850 from progress_baseline where user_id=auth.uid()),'eligible achievements and rank missions pay exactly once');
end $$;
reset role;
select pg_temp.progress_check((select count(*)=5 from public.economy_reward_claims where user_id=(select id from progress_users where n=1)),
  'five unique reward claims after replays');
select pg_temp.progress_check((select count(*)=5 and sum(amount)=3850 from public.coin_transactions
  where user_id=(select id from progress_users where n=1)),'ledger records each paid reward once');
select pg_temp.progress_check((select w.total_earned=b.total_earned+3850 from public.wallets w
  join progress_baseline b on b.user_id=w.user_id where w.user_id=(select id from progress_users where n=1)),
  'lifetime earnings match the one-time rewards');
select pg_temp.progress_check((select bool_and(verified_at is null) from public.inventory_items
  where user_id=(select id from progress_users where n=1) and item_id in ('pf_master','pf_animated_gold','bn_champion')),
  'unverified earned-only items never certified by snapshot or claims');

-- A trusted rank completion persists through a later drop within this period.
update public.ranked_progress set trophies=0 where user_id=(select id from progress_users where n=1);
set local role authenticated;
select public.get_economy_snapshot()->>'integrityVersion';
select pg_temp.progress_check((select bool_and(completed and progress=1 and verified_at is not null)
  from public.user_missions where user_id=auth.uid() and claimed_at is not null),'verified weekly completion survives rank drop');
reset role;

-- A former Platinum at 24 trophies cannot newly complete this week's Silver.
select set_config('request.jwt.claim.sub',(select id::text from progress_users where n=2),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from progress_users where n=2),
  'role','authenticated','is_anonymous',false)::text,true);
set local role authenticated;
select public.get_economy_snapshot()->>'integrityVersion';
select pg_temp.progress_check((select progress=0 and not completed and completed_at is null and verified_at is not null
  from public.user_missions where user_id=auth.uid() and template_id='wm_reach_silver'),'legacy completed Silver reset below threshold');
select pg_temp.progress_check((select bool_and(verified_at is null) from public.user_missions where user_id=auth.uid()
  and template_id in ('wm_reach_gold','wm_reach_platinum')),'future-generated and undated assignments not certified');
select pg_temp.progress_check((select progress=1 from public.user_achievements where user_id=auth.uid()
  and achievement_id='ach_first_platinum'),'protected peak proves lifetime Platinum');
select pg_temp.progress_check((select progress=1 from public.user_achievements where user_id=auth.uid()
  and achievement_id='ach_first_win'),'verified win belongs to actual participant');
select pg_temp.progress_check((select count(*)=0 from public.user_achievements where user_id=(select id from progress_users where n=1)),
  'other user achievements remain private');
select pg_temp.progress_expect_error($q$select public.ensure_verified_economy_progress((select id from progress_users where n=1))$q$,'permission denied');
reset role;
update public.ranked_progress set trophies=25 where user_id=(select id from progress_users where n=2);
set local role authenticated;
select public.get_economy_snapshot()->>'integrityVersion';
select pg_temp.progress_check((select progress=1 and completed and completed_at is not null and verified_at is not null
  from public.user_missions where user_id=auth.uid() and template_id='wm_reach_silver'),'exact Silver boundary');
reset role;

-- Full collection keeps ALL catalog items in its denominator, including rewards
-- with no earning path yet. A trusted fixture grant is distinct from migration certification.
insert into public.inventory_items(user_id,item_id,category,source)
  select u.id,c.key,c.value->>'category','fixture' from progress_users u cross join public.app_config a
  cross join lateral jsonb_each(a.value->'cosmetics') c where u.n=3 and a.id='economyCatalog'
  on conflict(user_id,item_id) do nothing;
update public.vip_entitlements set active=true,expires_at=now()+interval '1 day' where user_id=(select id from progress_users where n=3);
select set_config('request.jwt.claim.sub',(select id::text from progress_users where n=3),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from progress_users where n=3),
  'role','authenticated','is_anonymous',false)::text,true);
set local role authenticated;
select public.get_economy_snapshot()->>'integrityVersion';
select pg_temp.progress_check((select bool_and(progress=0) from public.user_achievements where user_id=auth.uid()
  and achievement_id in ('ach_first_win','ach_10_wins','ach_50_wins','ach_100_wins','ach_first_gold','ach_first_platinum')),
  'no wins or trophy evidence means zero win and rank progress');
select pg_temp.progress_check((select progress=53 and target=56 from public.user_achievements
  where user_id=auth.uid() and achievement_id='ach_100_collection'),'three uncertified earned-only items excluded, denominator unchanged');
select pg_temp.progress_check((select progress=10 and target=10 from public.user_achievements
  where user_id=auth.uid() and achievement_id='ach_all_tables'),'all ten usable tables qualify');
select pg_temp.progress_expect_error($q$select public.apply_economy_action('UNLOCK_ACHIEVEMENT',
  '{"achievementId":"ach_100_collection"}',gen_random_uuid())$q$,'not been verified');
select pg_temp.progress_expect_error($q$select public.apply_economy_action('COMPLETE_MISSION',
  jsonb_build_object('missionId',(select id from public.user_missions where user_id=auth.uid() and template_id='wm_weekend_champ'),
  'isWeekly',true),gen_random_uuid())$q$,'not been verified');
do $$ begin
  perform public.apply_economy_action('UNLOCK_ACHIEVEMENT','{"achievementId":"ach_10_cardbacks"}',gen_random_uuid());
  perform public.apply_economy_action('UNLOCK_ACHIEVEMENT','{"achievementId":"ach_all_tables"}',gen_random_uuid());
  perform public.apply_economy_action('UNLOCK_ACHIEVEMENT','{"achievementId":"ach_all_tables"}',gen_random_uuid());
  perform pg_temp.progress_check((public.get_economy_snapshot()#>>'{wallet,coins}')::integer=
    (select coins+100 from progress_baseline where user_id=auth.uid()),'collection reward and zero-coin Table Master claims');
end $$;
reset role;
update public.inventory_items set verified_at=now() where user_id=(select id from progress_users where n=3)
  and item_id in ('pf_master','pf_animated_gold','bn_champion');
set local role authenticated;
select public.get_economy_snapshot()->>'integrityVersion';
select pg_temp.progress_check((select progress=56 and target=56 from public.user_achievements
  where user_id=auth.uid() and achievement_id='ach_100_collection'),'trusted inventory grants count');
do $$ begin
  perform public.apply_economy_action('UNLOCK_ACHIEVEMENT','{"achievementId":"ach_100_collection"}',gen_random_uuid());
  perform public.apply_economy_action('UNLOCK_ACHIEVEMENT','{"achievementId":"ach_100_collection"}',gen_random_uuid());
end $$;
reset role;
select pg_temp.progress_check((select count(*)=3 from public.economy_reward_claims where user_id=(select id from progress_users where n=3)),
  'zero-coin collection rewards deduplicated');
-- Losing VIP access removes its seven items from usable collection progress.
update public.vip_entitlements set expires_at=now()-interval '1 second' where user_id=(select id from progress_users where n=3);
set local role authenticated;
select public.get_economy_snapshot()->>'integrityVersion';
select pg_temp.progress_check((select progress=49 and unlocked_at is not null from public.user_achievements
  where user_id=auth.uid() and achievement_id='ach_100_collection'),'expired VIP recomputes progress while preserving unlocked display');
select set_config('progress_test.write_count',(select count(*)::text from progress_write_log),true);
select public.get_economy_snapshot()->>'integrityVersion';
select pg_temp.progress_check((select count(*) from progress_write_log)=current_setting('progress_test.write_count')::bigint,
  'progress changes settle to zero-write snapshots');
reset role;

-- No JWT and a JWT without a wallet both fail before calling the old snapshot.
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
set local role authenticated;
select pg_temp.progress_expect_error('select public.get_economy_snapshot()','Sign in required');
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('request.jwt.claim.sub'),'role','authenticated')::text,true);
set local role authenticated;
select pg_temp.progress_expect_error('select public.get_economy_snapshot()','Wallet not found');
reset role;
set local role anon;
select pg_temp.progress_expect_error('select public.get_economy_snapshot()','permission denied');
reset role;
rollback;
\echo PASS verified achievement counts, rank eligibility, legacy forgery rejection, normal-user claims and idempotency; fixtures rolled back
