-- Run ONLY in the parent's isolated local PostgreSQL test database, after migrations.
-- No connection or credentials are read by this file. All fixtures roll back.
\set ON_ERROR_STOP on
begin;

create temporary table social_test_users(n integer primary key, id uuid not null);
insert into social_test_users select n,gen_random_uuid() from generate_series(1,32) n;
insert into auth.users(id,email,raw_user_meta_data)
  select id,'social-' || id || '@example.invalid',jsonb_build_object('name','Social fixture ' || n) from social_test_users;
grant select on social_test_users to authenticated;

create function pg_temp.social_expect_failure(p_sql text, p_message text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_message in sqlerrm) = 0 then raise exception 'Unexpected rejection: %',sqlerrm; end if;
    return;
  end;
  raise exception 'Expected rejection containing %',p_message;
end;
$$;

update auth.users set is_anonymous=true where id=(select id from social_test_users where n=32);
select set_config('request.jwt.claim.sub',(select id::text from social_test_users where n=32),true);
set local role authenticated;
select pg_temp.social_expect_failure('select public.social_mutate(''club_create'',''{"name":"Guest club","tag":"GUEST"}''::jsonb)','permanent account');
select pg_temp.social_expect_failure(format('select public.social_mutate(''friend_send'',jsonb_build_object(''other'',%L))',(select id from social_test_users where n=1)),'permanent account');
reset role;
update auth.users set is_anonymous=false where id=(select id from social_test_users where n=32);

-- Room setup uses only local fixtures; the social trigger also checks fixture writes.
select set_config('request.jwt.claim.sub',(select id::text from social_test_users where n=1),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from social_test_users where n=1),'is_anonymous',false)::text,true);
select set_config('social.test_room',upper(substr(md5(gen_random_uuid()::text),1,6)),true);
insert into public.game_rooms(code,game_type,owner_id,max_players,status)
  select current_setting('social.test_room'),'mindi',id,4,'waiting' from social_test_users where n=1;
insert into public.room_players(room_code,user_id,display_name,seat_index)
  select current_setting('social.test_room'),id,'Social fixture 1',0 from social_test_users where n=1;

set local role authenticated;
do $$
#variable_conflict use_variable
declare
  a uuid := (select id from social_test_users where n=1);
  b uuid := (select id from social_test_users where n=2);
  c uuid := (select id from social_test_users where n=3);
  room_id uuid;
  request_id uuid;
  club_id uuid;
  invite_id uuid;
  initial_count integer;
  page_ids uuid[];
  older_ids uuid[];
  cursor_time timestamptz;
  cursor_id uuid;
  i integer;
  person uuid;
begin
  if has_function_privilege('anon','public.social_mutate(text,jsonb)','EXECUTE')
    or has_function_privilege('anon','public.social_chat_member(uuid)','EXECUTE')
    or has_function_privilege('authenticated','public.social_room_entry_guard()','EXECUTE') then
    raise exception 'Unexpected helper grants';
  end if;
  room_id := (public.social_mutate('dm_ensure',jsonb_build_object('other',b)) #>> '{}')::uuid;
  if (public.social_mutate('dm_ensure',jsonb_build_object('other',b)) #>> '{}')::uuid <> room_id then raise exception 'Duplicate DM'; end if;
  if (select count(*) from public.chat_participants p where p.room_id = room_id) <> 2 then raise exception 'Missing DM members'; end if;
  perform pg_temp.social_expect_failure(format('select public.social_mutate(''dm_ensure'',%L::jsonb)',jsonb_build_object('actor',b,'other',c)), 'Caller mismatch');
  perform pg_temp.social_expect_failure(format('insert into public.messages(room_id,sender_id,text) values(%L,%L,''forged'')',room_id,a),'permission denied');
  perform pg_temp.social_expect_failure(format('update public.chat_participants set last_read_at = now() where user_id=%L',b),'permission denied');
  for i in 1..500 loop perform public.social_mutate('dm_send',jsonb_build_object('id',room_id,'text','message ' || i)); end loop;
  if not exists(select 1 from public.chat_rooms r where r.id=room_id and r.last_message='message 500' and r.last_sender_id=a) then raise exception 'Preview not updated'; end if;
  select array_agg(p.id order by p.created_at desc,p.id desc) into page_ids from public.social_message_page('dm',room_id) p;
  if cardinality(page_ids) <> 200 then raise exception 'Latest page is not 200 messages'; end if;
  if (select p.text from public.social_message_page('dm',room_id) p limit 1) <> 'message 500' then raise exception 'Newest message missing'; end if;
  select p.created_at,p.id into cursor_time,cursor_id from public.social_message_page('dm',room_id) p order by p.created_at,p.id limit 1;
  select array_agg(p.id) into older_ids from public.social_message_page('dm',room_id,cursor_time,cursor_id) p;
  if cardinality(older_ids) <> 200 or page_ids && older_ids then raise exception 'Invalid older page'; end if;
  perform pg_temp.social_expect_failure(format('select * from public.social_message_page(''dm'',%L,now(),null)',room_id),'Incomplete cursor');
  perform public.social_mutate('dm_read',jsonb_build_object('id',room_id));
  if not exists(select 1 from public.chat_participants p where p.room_id=room_id and p.user_id=a and p.last_read_at is not null) then raise exception 'Own read marker missing'; end if;
  if exists(select 1 from public.chat_participants p where p.room_id=room_id and p.user_id=b and p.last_read_at is not null) then raise exception 'Other read marker changed'; end if;

  perform public.social_mutate('friend_send',jsonb_build_object('other',b));
  select id into request_id from public.friend_requests where from_user_id=a and to_user_id=b;
  perform pg_temp.social_expect_failure(format('select public.social_mutate(''friend_respond'',%L::jsonb)',jsonb_build_object('id',request_id,'accept',true)),'Only the recipient');
  perform pg_temp.social_expect_failure(format('insert into public.friend_requests(from_user_id,to_user_id,status) values(%L,%L,''accepted'')',a,c),'permission denied');
  perform pg_temp.social_expect_failure(format('update public.friend_requests set to_user_id=%L where id=%L',c,request_id),'permission denied');
  perform public.social_mutate('invite_send',jsonb_build_object('other',b,'code',current_setting('social.test_room')));
  select id into invite_id from public.room_invites where from_user_id=a and to_user_id=b;
  if invite_id is null then raise exception 'Invite missing'; end if;

  perform set_config('request.jwt.claim.sub',b::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'is_anonymous',false)::text,true);
  if (public.social_mutate('dm_ensure',jsonb_build_object('other',a)) #>> '{}')::uuid <> room_id then raise exception 'Reversed pair duplicate'; end if;
  perform public.social_mutate('friend_respond',jsonb_build_object('id',request_id,'accept',true));
  if not exists(select 1 from public.friend_requests where id=request_id and status='accepted') then raise exception 'Recipient could not accept'; end if;
  perform pg_temp.social_expect_failure(format('select public.social_mutate(''friend_respond'',%L::jsonb)',jsonb_build_object('id',request_id,'accept',false)),'Only the recipient');
  perform public.social_mutate('block',jsonb_build_object('other',a));
  if not public.social_blocked(a) then raise exception 'Own block not detected'; end if;
  perform pg_temp.social_expect_failure(format('select public.social_mutate(''dm_send'',%L::jsonb)',jsonb_build_object('id',room_id,'text','blocked')),'Contact unavailable');
  -- A link/password join must also be denied when a blocked player is already present.
  perform pg_temp.social_expect_failure(format('select public.join_room(%L,'''',null)',current_setting('social.test_room')),'Contact unavailable');

  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'is_anonymous',false)::text,true);
  if not public.social_blocked(b) then raise exception 'Reverse block not detected'; end if;
  if exists(select 1 from public.blocks where blocker_id=b) then raise exception 'Private block list leaked'; end if;
  if exists(select 1 from public.room_invites where id=invite_id) then raise exception 'Blocked invite survived'; end if;
  perform pg_temp.social_expect_failure(format('select public.social_mutate(''dm_send'',%L::jsonb)',jsonb_build_object('id',room_id,'text','blocked')),'Contact unavailable');
  perform pg_temp.social_expect_failure(format('select public.social_mutate(''friend_send'',%L::jsonb)',jsonb_build_object('other',b)),'Contact unavailable');
  perform pg_temp.social_expect_failure(format('select public.social_mutate(''invite_send'',%L::jsonb)',jsonb_build_object('other',b,'code',current_setting('social.test_room'))),'Contact unavailable');

  perform set_config('request.jwt.claim.sub',c::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',c,'is_anonymous',false)::text,true);
  if exists(select 1 from public.chat_rooms where id=room_id) or exists(select 1 from public.messages m where m.room_id=room_id) then raise exception 'Outsider read DM'; end if;
  perform pg_temp.social_expect_failure(format('select * from public.social_message_page(''dm'',%L)',room_id),'Conversation unavailable');

  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'is_anonymous',false)::text,true);
  club_id := (public.social_mutate('club_create','{"name":"Social test","tag":"ST","description":"fixture"}') #>> '{}')::uuid;
  select count(*) into initial_count from public.clubs;
  perform pg_temp.social_expect_failure('select public.social_mutate(''club_create'',''{"name":"Duplicate membership","tag":"DM"}'')','duplicate key');
  if (select count(*) from public.clubs) <> initial_count then raise exception 'Failed club create left an orphan'; end if;
  perform pg_temp.social_expect_failure(format('insert into public.club_members(club_id,user_id,role) values(%L,%L,''owner'')',club_id,c),'permission denied');
  for i in 1..500 loop perform public.social_mutate('club_send',jsonb_build_object('id',club_id,'text','club ' || i)); end loop;
  if (select p.text from public.social_message_page('club',club_id) p limit 1) <> 'club 500' then raise exception 'Newest club message missing'; end if;
  for i in 2..30 loop
    select id into person from social_test_users where n=i;
    perform set_config('request.jwt.claim.sub',person::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',person,'is_anonymous',false)::text,true);
    perform public.social_mutate('club_join',jsonb_build_object('id',club_id));
  end loop;
  select id into person from social_test_users where n=31;
  perform set_config('request.jwt.claim.sub',person::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',person,'is_anonymous',false)::text,true);
  perform pg_temp.social_expect_failure(format('select public.social_mutate(''club_join'',%L::jsonb)',jsonb_build_object('id',club_id)),'club is full');
  if (select count(*) from public.club_members m where m.club_id=club_id) <> 30 then raise exception 'Capacity exceeded'; end if;

  perform set_config('request.jwt.claim.sub',a::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'is_anonymous',false)::text,true);
  perform public.social_mutate('club_transfer',jsonb_build_object('id',club_id,'other',b));
  perform pg_temp.social_expect_failure(format('select public.social_mutate(''club_kick'',%L::jsonb)',jsonb_build_object('id',club_id,'other',c)),'Owner permission required');
  perform set_config('request.jwt.claim.sub',b::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'is_anonymous',false)::text,true);
  perform public.social_mutate('club_leave',jsonb_build_object('id',club_id));
  if not exists(select 1 from public.clubs cl join public.club_members m on m.club_id=cl.id and m.user_id=cl.owner_id where cl.id=club_id and m.role='owner') then raise exception 'Owner departure orphaned club'; end if;
  if (select count(*) from public.club_members m where m.club_id=club_id and m.role='owner') <> 1 then raise exception 'Owner role not unique'; end if;
  perform pg_temp.social_expect_failure(format('select * from public.social_message_page(''club'',%L)',club_id),'Club membership required');
  if exists(select 1 from public.club_messages m where m.club_id=club_id) then raise exception 'Departed member reads club history'; end if;
  -- The departed owner may create another club; leaving it deletes the empty club.
  club_id := (public.social_mutate('club_create','{"name":"Empty test","tag":"ET"}') #>> '{}')::uuid;
  perform public.social_mutate('club_leave',jsonb_build_object('id',club_id));
  if exists(select 1 from public.clubs where id=club_id) then raise exception 'Empty club survived owner departure'; end if;
end;
$$;
reset role;
rollback;
\echo Social integrity SQL regressions passed; all fixtures rolled back.
