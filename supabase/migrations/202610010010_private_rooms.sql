-- Room credentials and membership mutations are server-owned.
create schema if not exists room_private;
revoke all on schema room_private from public, anon, authenticated;

create table room_private.credentials (
  room_code text primary key references public.game_rooms(code) on delete cascade,
  password_hash text not null
);
create table room_private.join_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  attempts integer not null
);
alter table room_private.credentials enable row level security;
alter table room_private.join_attempts enable row level security;
revoke all on all tables in schema room_private from public, anon, authenticated;

alter table public.game_rooms add column has_password boolean not null default false;

create function room_private.require_user()
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists (
    select 1 from auth.users where id = v_uid and is_anonymous is false
  ) or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'Sign in with a permanent account to use private rooms' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

-- pgcrypto can live in public or extensions. Bind its actual schema explicitly.
-- SHA-256 prehashing avoids bcrypt's 72-byte truncation, including legacy passwords.
do $migration$
declare v_schema text;
begin
  select n.nspname into strict v_schema from pg_catalog.pg_extension e
    join pg_catalog.pg_namespace n on n.oid = e.extnamespace where e.extname = 'pgcrypto';
  execute format($sql$
    insert into room_private.credentials(room_code, password_hash)
    select code, %1$I.crypt(encode(%1$I.digest(password_hash, 'sha256'), 'hex'), %1$I.gen_salt('bf', 10))
    from public.game_rooms where coalesce(password_hash, '') <> ''
  $sql$, v_schema);
  execute format($sql$
    create function room_private.hash_password(p_password text, p_salt text default null)
    returns text language plpgsql security definer set search_path = '' as $body$
    begin
      perform room_private.require_user();
      return %1$I.crypt(encode(%1$I.digest(p_password, 'sha256'), 'hex'), coalesce(p_salt, %1$I.gen_salt('bf', 10)));
    end;
    $body$
  $sql$, v_schema);
end;
$migration$;
update public.game_rooms r set has_password = exists (
  select 1 from room_private.credentials c where c.room_code = r.code
);
alter table public.game_rooms drop column password_hash;

create function public.create_room(
  p_game_type public.game_type,
  p_password text default null,
  p_mode public.room_mode default 'casual',
  p_mindi_mode public.mindi_room_mode default 'team2v2'
)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := room_private.require_user();
  v_code text;
  v_hash text;
  v_name text;
  v_max integer;
begin
  if p_game_type is null or p_mode is null or (p_game_type = 'mindi' and p_mindi_mode is null) then
    raise exception 'Invalid room settings';
  end if;
  if p_mode = 'rankedDuo' and p_game_type <> 'mindi' then
    raise exception 'Ranked duo rooms require Mindi';
  end if;
  if octet_length(coalesce(p_password, '')) > 1024 then raise exception 'Room password is too long'; end if;
  if p_mode = 'casual' and not exists (
    select 1 from public.room_cards where user_id = v_uid
      and activated_at is not null and activated_at <= clock_timestamp()
      and expires_at > clock_timestamp()
  ) then
    raise exception 'Activate a room card before creating a private room' using errcode = '42501';
  end if;
  select display_name into strict v_name from public.profiles where id = v_uid;
  v_max := case when p_mode = 'rankedDuo' or p_game_type = 'gin_rummy' or p_mindi_mode = 'ffa1v1' then 2 else 4 end;
  if coalesce(p_password, '') <> '' then v_hash := room_private.hash_password(p_password); end if;
  for v_attempt in 1..5 loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      insert into public.game_rooms(code, game_type, owner_id, has_password, max_players, mode, mindi_mode)
      values (v_code, p_game_type, v_uid, v_hash is not null, v_max, p_mode,
        case when p_game_type = 'mindi' then case when p_mode = 'rankedDuo' then 'team2v2'::public.mindi_room_mode else p_mindi_mode end else null end);
      if v_hash is not null then
        insert into room_private.credentials(room_code, password_hash) values (v_code, v_hash);
      end if;
      insert into public.room_players(room_code, user_id, display_name, seat_index) values (v_code, v_uid, v_name, 0);
      return v_code;
    exception when unique_violation then
      if v_attempt = 5 then raise; end if;
    end;
  end loop;
  raise exception 'Could not generate a unique room code';
end;
$$;

-- Failed guesses must commit the attempt counter. Expected join failures are JSON
-- results, not SQL exceptions (which would roll back the counter in PostgREST).
drop function public.join_room(text, text, uuid);
create function public.join_room(p_code text, p_password text default '', p_invite uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := room_private.require_user();
  v_room public.game_rooms;
  v_invited boolean := false;
  v_hash text;
  v_seat integer;
  v_attempts integer;
  v_now timestamptz;
begin
  -- Locking this row also serializes joins with reorders, removals and trusted starts.
  select * into v_room from public.game_rooms where code = upper(trim(p_code)) for update;
  if not found then return jsonb_build_object('error', 'Room not found. The invite may have expired.'); end if;
  if exists (select 1 from public.room_bans where room_code = v_room.code and user_id = v_uid) then
    return jsonb_build_object('error', 'You have been banned from this room');
  end if;
  if v_room.status = 'closed' then return jsonb_build_object('error', 'This room has closed'); end if;
  if exists (select 1 from public.room_players where room_code = v_room.code and user_id = v_uid) then
    return jsonb_build_object('ok', true);
  end if;
  if v_room.status <> 'waiting' then return jsonb_build_object('error', 'This room has already started'); end if;

  v_now := clock_timestamp();
  insert into room_private.join_attempts as a(user_id, window_started_at, attempts) values (v_uid, v_now, 1)
  on conflict (user_id) do update set
    window_started_at = case when a.window_started_at <= v_now - interval '1 minute' then v_now else a.window_started_at end,
    attempts = case when a.window_started_at <= v_now - interval '1 minute' then 1 else least(a.attempts + 1, 13) end
  returning attempts into v_attempts;
  if v_attempts > 12 then return jsonb_build_object('error', 'Too many room join attempts. Try again in a minute.'); end if;
  if octet_length(coalesce(p_password, '')) > 1024 then return jsonb_build_object('error', 'Room password is too long'); end if;
  if p_invite is not null then
    v_invited := exists (select 1 from public.room_invites i where i.id = p_invite and i.room_code = v_room.code
      and i.to_user_id = v_uid and i.expires_at > v_now
      and exists (select 1 from public.room_players where room_code = v_room.code and user_id = i.from_user_id))
      or exists (select 1 from public.room_invite_links where id = p_invite and room_code = v_room.code and expires_at > v_now);
    if not v_invited then return jsonb_build_object('error', 'This invite has expired or is no longer valid. Ask the host for a new invite.'); end if;
  end if;
  if not v_invited and v_room.has_password then
    select password_hash into v_hash from room_private.credentials where room_code = v_room.code;
    if v_hash is null or room_private.hash_password(coalesce(p_password, ''), v_hash) is distinct from v_hash then
      return jsonb_build_object('error', 'Incorrect room password');
    end if;
  end if;
  if (select count(*) from public.room_players where room_code = v_room.code) >= v_room.max_players then
    return jsonb_build_object('error', 'This room is full');
  end if;
  select seat into v_seat from generate_series(0, v_room.max_players - 1) seat
    where not exists (select 1 from public.room_players where room_code = v_room.code and seat_index = seat)
    order by seat limit 1;
  insert into public.room_players(room_code, user_id, display_name, seat_index)
    select v_room.code, id, display_name, v_seat from public.profiles where id = v_uid;
  if not found then raise exception 'Player profile not found'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.create_room_invite_link(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := room_private.require_user(); v_id uuid; v_room public.game_rooms;
begin
  select * into v_room from public.game_rooms where code = upper(trim(p_code)) for update;
  if not found or v_room.status <> 'waiting' or not exists (
    select 1 from public.room_players where room_code = v_room.code and user_id = v_uid
  ) or exists (select 1 from public.room_bans where room_code = v_room.code and user_id = v_uid) then
    raise exception 'Join a waiting room before sharing an invite' using errcode = '42501';
  end if;
  insert into public.room_invite_links(room_code) values (v_room.code) returning id into v_id;
  return v_id;
end;
$$;

create function public.set_room_seat_order(p_code text, p_seat_order uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := room_private.require_user(); v_room public.game_rooms; v_count integer;
begin
  select * into v_room from public.game_rooms where code = upper(trim(p_code)) for update;
  if not found or v_room.owner_id <> v_uid then raise exception 'Only the room owner can reorder seats' using errcode = '42501'; end if;
  if v_room.status <> 'waiting' then raise exception 'Seats can only change while the room is waiting'; end if;
  select count(*) into v_count from public.room_players where room_code = v_room.code;
  if p_seat_order is null or cardinality(p_seat_order) <> v_count
    or (select count(distinct u) from unnest(p_seat_order) u) <> v_count
    or exists (select 1 from unnest(p_seat_order) u where not exists (
      select 1 from public.room_players where room_code = v_room.code and user_id = u
    )) then raise exception 'Seat order must contain exactly the current players'; end if;
  -- NULL staging preserves the existing immediate unique(room_code, seat_index).
  update public.room_players set seat_index = null where room_code = v_room.code;
  update public.room_players p set seat_index = s.position - 1
    from unnest(p_seat_order) with ordinality s(user_id, position)
    where p.room_code = v_room.code and p.user_id = s.user_id;
end;
$$;

create function public.remove_room_player(p_code text, p_target uuid, p_ban boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := room_private.require_user(); v_room public.game_rooms;
begin
  select * into v_room from public.game_rooms where code = upper(trim(p_code)) for update;
  if not found or v_room.owner_id <> v_uid then raise exception 'Only the room owner can remove players' using errcode = '42501'; end if;
  if p_target is null or p_target = v_uid then raise exception 'The host cannot remove themselves'; end if;
  if v_room.status <> 'waiting' then raise exception 'Players can only be removed while the room is waiting'; end if;
  if p_ban then
    insert into public.room_bans(room_code, user_id) values (v_room.code, p_target) on conflict do nothing;
  end if;
  delete from public.room_players where room_code = v_room.code and user_id = p_target;
end;
$$;

create function public.leave_room(p_code text, p_close boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := room_private.require_user(); v_room public.game_rooms;
begin
  select * into v_room from public.game_rooms where code = upper(trim(p_code)) for update;
  if not found then raise exception 'Room not found'; end if;
  if p_close and v_room.owner_id <> v_uid then raise exception 'Only the room owner can close the room' using errcode = '42501'; end if;
  if v_room.status = 'closed' then return; end if;
  if v_room.status <> 'waiting' then raise exception 'This room has already started'; end if;
  if v_room.owner_id = v_uid then
    update public.game_rooms set status = 'closed' where code = v_room.code;
  else
    delete from public.room_players where room_code = v_room.code and user_id = v_uid;
  end if;
end;
$$;

-- Restrict every direct mutation, including host writes that could otherwise
-- change eligibility, mark a room started, or race an atomic seat reorder.
drop policy if exists "rooms owner insert" on public.game_rooms;
drop policy if exists "room players self insert" on public.room_players;
drop policy if exists "room players host insert" on public.room_players;
revoke insert, update, delete, truncate, references, trigger on public.game_rooms, public.room_players, public.room_bans, public.room_invite_links from public, anon, authenticated;

revoke all on all functions in schema room_private from public, anon, authenticated;
revoke all on function public.create_room(public.game_type, text, public.room_mode, public.mindi_room_mode) from public, anon, authenticated;
revoke all on function public.join_room(text, text, uuid) from public, anon, authenticated;
revoke all on function public.create_room_invite_link(text) from public, anon, authenticated;
revoke all on function public.set_room_seat_order(text, uuid[]) from public, anon, authenticated;
revoke all on function public.remove_room_player(text, uuid, boolean) from public, anon, authenticated;
revoke all on function public.leave_room(text, boolean) from public, anon, authenticated;
grant execute on function public.create_room(public.game_type, text, public.room_mode, public.mindi_room_mode) to authenticated;
grant execute on function public.join_room(text, text, uuid) to authenticated;
grant execute on function public.create_room_invite_link(text) to authenticated;
grant execute on function public.set_room_seat_order(text, uuid[]) to authenticated;
grant execute on function public.remove_room_player(text, uuid, boolean) to authenticated;
grant execute on function public.leave_room(text, boolean) to authenticated;
notify pgrst, 'reload schema';
