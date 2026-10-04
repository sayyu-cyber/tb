-- Social writes are commands: callers cannot bypass consent or capacity via REST.
begin;

create or replace function public.social_blocked(p_other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.blocks b where
      (b.blocker_id = auth.uid() and b.blocked_id = p_other)
      or (b.blocker_id = p_other and b.blocked_id = auth.uid())
  );
$$;

create or replace function public.social_chat_member(p_room uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.chat_participants where room_id = p_room and user_id = auth.uid()
  );
$$;

-- Remove ALL legacy policies on owned social tables, including permissive writes.
do $$ declare p record; begin
  for p in select tablename, policyname from pg_policies where schemaname = 'public'
    and tablename in ('chat_rooms','chat_participants','messages','friend_requests',
      'room_invites','blocks','clubs','club_members','club_messages')
  loop execute format('drop policy %I on public.%I', p.policyname, p.tablename); end loop;
end $$;
create policy social_chat_read on public.chat_rooms for select to authenticated using (public.social_chat_member(id));
create policy social_participants_read on public.chat_participants for select to authenticated using (public.social_chat_member(room_id));
create policy social_messages_read on public.messages for select to authenticated using (public.social_chat_member(room_id));
create policy social_friends_read on public.friend_requests for select to authenticated using (auth.uid() in (from_user_id,to_user_id));
create policy social_invites_read on public.room_invites for select to authenticated using (
  auth.uid() in (from_user_id,to_user_id) and not public.social_blocked(case when auth.uid() = from_user_id then to_user_id else from_user_id end)
);
create policy social_blocks_read on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy social_clubs_read on public.clubs for select to authenticated using (true);
create policy social_members_read on public.club_members for select to authenticated using (true);
create policy social_club_messages_read on public.club_messages for select to authenticated using (
  exists (select 1 from public.club_members where club_id = club_messages.club_id and user_id = auth.uid())
);
revoke insert, update, delete, truncate, references, trigger on public.chat_rooms, public.chat_participants,
  public.messages, public.friend_requests, public.room_invites, public.blocks, public.clubs,
  public.club_members, public.club_messages from public, authenticated, anon;
grant select on public.chat_rooms, public.chat_participants, public.messages, public.friend_requests,
  public.room_invites, public.blocks, public.clubs, public.club_members, public.club_messages to authenticated;

-- Abort on ambiguous pre-existing pairs instead of silently deleting history.
create unique index social_dm_pair_unique on public.chat_rooms ((metadata->>'dm_key')) where type = 'dm';
create index social_dm_history on public.messages (room_id, created_at desc, id desc);
create index social_club_history on public.club_messages (club_id, created_at desc, id desc);

create or replace function public.social_mutate(p_action text, p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_other uuid := nullif(p_payload->>'other', '')::uuid;
  v_id uuid := nullif(p_payload->>'id', '')::uuid;
  v_room uuid;
  v_key text;
  v_text text := btrim(p_payload->>'text');
  v_club public.clubs;
  v_friend public.friend_requests;
  v_invite public.room_invites;
  v_game public.game_rooms;
  v_next uuid;
  v_time timestamptz;
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  -- Anonymous sessions also carry the authenticated role; enforce account type here.
  -- Blocking remains available as a safety control, including for existing guests.
  if p_action not in ('block','unblock') and not exists(select 1 from auth.users where id=v_uid and is_anonymous is false) then
    raise exception 'Sign in with a permanent account to use social features' using errcode = '42501';
  end if;
  if p_payload ? 'actor' and (p_payload->>'actor')::uuid is distinct from v_uid then
    raise exception 'Caller mismatch' using errcode = '42501';
  end if;
  if p_action in ('dm_ensure','friend_send','block','unblock','invite_send') then
    if v_other is null or v_other = v_uid then raise exception 'Invalid recipient'; end if;
    -- Same lock is used by block and contact commands, in either direction.
    v_key := least(v_uid::text,v_other::text) || '_' || greatest(v_uid::text,v_other::text);
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_key, 7));
    if p_action not in ('block','unblock') and public.social_blocked(v_other) then
      raise exception 'Contact unavailable' using errcode = '42501';
    end if;
  end if;

  case p_action
  when 'block' then
    insert into public.blocks(blocker_id,blocked_id) values(v_uid,v_other) on conflict do nothing;
    delete from public.room_invites where (from_user_id = v_uid and to_user_id = v_other) or (from_user_id = v_other and to_user_id = v_uid);
    delete from public.friend_requests where (from_user_id = v_uid and to_user_id = v_other) or (from_user_id = v_other and to_user_id = v_uid);
  when 'unblock' then
    delete from public.blocks where blocker_id = v_uid and blocked_id = v_other;
  when 'dm_ensure' then
    select id into v_room from public.chat_rooms where type = 'dm' and metadata->>'dm_key' = v_key;
    if v_room is not null then
      if not public.social_chat_member(v_room) or
        (select count(*) from public.chat_participants where room_id = v_room) <> 2 or
        not exists(select 1 from public.chat_participants where room_id = v_room and user_id = v_other) then
        raise exception 'Invalid conversation membership' using errcode = '42501';
      end if;
    else
      insert into public.chat_rooms(type,metadata) values('dm',jsonb_build_object('dm_key',v_key)) returning id into v_room;
      insert into public.chat_participants(room_id,user_id,display_name)
        select v_room,id,display_name from public.profiles where id in (v_uid,v_other);
      if (select count(*) from public.chat_participants where room_id = v_room) <> 2 then raise exception 'Player not found'; end if;
    end if;
    return to_jsonb(v_room);
  when 'dm_send', 'dm_read' then
    if not public.social_chat_member(v_id) then raise exception 'Conversation unavailable' using errcode = '42501'; end if;
    select user_id into v_other from public.chat_participants where room_id = v_id and user_id <> v_uid;
    if v_other is null or (select count(*) from public.chat_participants where room_id = v_id) <> 2 then raise exception 'Invalid DM'; end if;
    v_key := least(v_uid::text,v_other::text) || '_' || greatest(v_uid::text,v_other::text);
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_key, 7));
    perform 1 from public.chat_rooms where id = v_id and type = 'dm' for update;
    if not found then raise exception 'Conversation unavailable'; end if;
    v_time := clock_timestamp();
    if p_action = 'dm_send' then
      if public.social_blocked(v_other) then raise exception 'Contact unavailable' using errcode = '42501'; end if;
      if v_text is null or char_length(v_text) not between 1 and 1000 then raise exception 'Message must be 1-1000 characters'; end if;
      insert into public.messages(room_id,sender_id,text,created_at) values(v_id,v_uid,v_text,v_time);
      update public.chat_rooms set last_message = v_text, last_message_at = v_time, last_sender_id = v_uid where id = v_id;
    else
      update public.chat_participants set last_read_at = greatest(last_read_at,v_time) where room_id = v_id and user_id = v_uid;
    end if;
  when 'friend_send' then
    insert into public.friend_requests(from_user_id,to_user_id,status) values(v_uid,v_other,'pending') on conflict do nothing;
  when 'friend_respond', 'friend_remove' then
    select * into v_friend from public.friend_requests where id = v_id;
    if not found or v_uid not in (v_friend.from_user_id,v_friend.to_user_id) then raise exception 'Request unavailable' using errcode = '42501'; end if;
    v_other := case when v_uid = v_friend.from_user_id then v_friend.to_user_id else v_friend.from_user_id end;
    v_key := least(v_uid::text,v_other::text) || '_' || greatest(v_uid::text,v_other::text);
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_key, 7));
    select * into v_friend from public.friend_requests where id = v_id for update;
    if not found then raise exception 'Request unavailable'; end if;
    if p_action = 'friend_remove' then
      delete from public.friend_requests where id = v_id;
    else
      if v_friend.to_user_id <> v_uid or v_friend.status <> 'pending' or public.social_blocked(v_other) then
        raise exception 'Only the recipient can respond to a pending request' using errcode = '42501';
      end if;
      update public.friend_requests set status = case when (p_payload->>'accept')::boolean then 'accepted'::public.friend_request_status else 'declined'::public.friend_request_status end,
        updated_at = clock_timestamp() where id = v_id;
    end if;
  when 'invite_send' then
    select * into v_game from public.game_rooms where code = upper(btrim(p_payload->>'code'));
    if not found or v_game.status <> 'waiting' or not exists(select 1 from public.room_players where room_code = v_game.code and user_id = v_uid) then
      raise exception 'Join an open room before inviting' using errcode = '42501';
    end if;
    insert into public.room_invites(from_user_id,to_user_id,room_code,game_type) values(v_uid,v_other,v_game.code,v_game.game_type);
  when 'invite_remove' then
    select * into v_invite from public.room_invites where id = v_id;
    if found and v_uid not in (v_invite.from_user_id,v_invite.to_user_id) then raise exception 'Invite unavailable' using errcode = '42501'; end if;
    delete from public.room_invites where id = v_id;
  when 'club_create' then
    insert into public.clubs(name,tag,description,owner_id)
      values(btrim(p_payload->>'name'),upper(btrim(p_payload->>'tag')),coalesce(btrim(p_payload->>'description'),''),v_uid) returning id into v_id;
    insert into public.club_members(club_id,user_id,display_name,trophies,role)
      select v_id,p.id,p.display_name,coalesce(r.trophies,0),'owner' from public.profiles p
      left join public.ranked_progress r on r.user_id = p.id where p.id = v_uid;
    if not found then raise exception 'Player not found'; end if;
    return to_jsonb(v_id);
  when 'club_join', 'club_leave', 'club_kick', 'club_transfer', 'club_send' then
    select * into v_club from public.clubs where id = v_id for update;
    if not found then raise exception 'Club not found'; end if;
    if p_action = 'club_join' then
      if exists(select 1 from public.club_members where club_id = v_id and user_id = v_uid) then return 'null'::jsonb; end if;
      if (select count(*) from public.club_members where club_id = v_id) >= 30 then raise exception 'This club is full (max 30 members)'; end if;
      insert into public.club_members(club_id,user_id,display_name,trophies,role)
        select v_id,p.id,p.display_name,coalesce(r.trophies,0),'member' from public.profiles p
        left join public.ranked_progress r on r.user_id = p.id where p.id = v_uid;
      if not found then raise exception 'Player not found'; end if;
    else
      if not exists(select 1 from public.club_members where club_id = v_id and user_id = v_uid) then raise exception 'Club membership required' using errcode = '42501'; end if;
      if p_action in ('club_kick','club_transfer') then
        if v_club.owner_id is distinct from v_uid or v_other is null or v_other = v_uid then raise exception 'Owner permission required' using errcode = '42501'; end if;
        if not exists(select 1 from public.club_members where club_id = v_id and user_id = v_other) then raise exception 'Member not found'; end if;
        if p_action = 'club_kick' then
          delete from public.club_members where club_id = v_id and user_id = v_other;
        else
          update public.club_members set role = case when user_id = v_other then 'owner' else 'member' end where club_id = v_id;
          update public.clubs set owner_id = v_other where id = v_id;
        end if;
      elsif p_action = 'club_leave' then
        if v_club.owner_id = v_uid then
          select user_id into v_next from public.club_members where club_id = v_id and user_id <> v_uid order by joined_at,user_id limit 1;
          if v_next is null then delete from public.clubs where id = v_id; return 'null'::jsonb; end if;
          update public.club_members set role = case when user_id = v_next then 'owner' else 'member' end where club_id = v_id;
          update public.clubs set owner_id = v_next where id = v_id;
        end if;
        delete from public.club_members where club_id = v_id and user_id = v_uid;
      else
        if v_text is null or char_length(v_text) not between 1 and 1000 then raise exception 'Message must be 1-1000 characters'; end if;
        insert into public.club_messages(club_id,sender_id,sender_name,text,created_at)
          select v_id,id,display_name,v_text,clock_timestamp() from public.profiles where id = v_uid;
      end if;
    end if;
  else raise exception 'Unknown social action';
  end case;
  return 'null'::jsonb;
end;
$$;

-- Also enforce blocks when an older invite/link is redeemed through join_room.
-- A trigger composes with future room-authority RPCs without replacing them.
create or replace function public.social_room_entry_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_other uuid; v_key text;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then raise exception 'Caller mismatch' using errcode = '42501'; end if;
  for v_other in select user_id from public.room_players where room_code = new.room_code and user_id <> new.user_id order by user_id loop
    v_key := least(new.user_id::text,v_other::text) || '_' || greatest(new.user_id::text,v_other::text);
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_key, 7));
    if public.social_blocked(v_other) then raise exception 'Contact unavailable' using errcode = '42501'; end if;
  end loop;
  return new;
end;
$$;
create trigger social_room_entry before insert on public.room_players for each row execute function public.social_room_entry_guard();

create or replace function public.social_message_page(p_kind text, p_id uuid, p_before_time timestamptz default null, p_before_id uuid default null, p_limit integer default 200)
returns table(id uuid,sender_id uuid,sender_name text,text text,created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if (p_before_time is null) <> (p_before_id is null) then raise exception 'Incomplete cursor'; end if;
  if p_kind = 'dm' then
    if not public.social_chat_member(p_id) then raise exception 'Conversation unavailable' using errcode = '42501'; end if;
    return query select m.id,m.sender_id,''::text,m.text,m.created_at from public.messages m where m.room_id = p_id
      and (p_before_time is null or (m.created_at,m.id) < (p_before_time,p_before_id)) order by m.created_at desc,m.id desc limit greatest(1,least(coalesce(p_limit,200),200));
  elsif p_kind = 'club' then
    if not exists(select 1 from public.club_members where club_id = p_id and user_id = auth.uid()) then raise exception 'Club membership required' using errcode = '42501'; end if;
    return query select m.id,m.sender_id,m.sender_name,m.text,m.created_at from public.club_messages m where m.club_id = p_id
      and (p_before_time is null or (m.created_at,m.id) < (p_before_time,p_before_id)) order by m.created_at desc,m.id desc limit greatest(1,least(coalesce(p_limit,200),200));
  else raise exception 'Unknown message kind'; end if;
end;
$$;

revoke all on function public.social_blocked(uuid), public.social_chat_member(uuid), public.social_mutate(text,jsonb),
  public.social_room_entry_guard(), public.social_message_page(text,uuid,timestamptz,uuid,integer) from public, anon, authenticated;
grant execute on function public.social_blocked(uuid), public.social_chat_member(uuid), public.social_mutate(text,jsonb),
  public.social_message_page(text,uuid,timestamptz,uuid,integer) to authenticated;

do $$ declare t text; begin
  foreach t in array array['blocks','reports','ranked_progress','player_stats'] loop
    if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;
notify pgrst, 'reload schema';
commit;
