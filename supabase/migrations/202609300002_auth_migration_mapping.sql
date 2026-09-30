-- Preserve the relationship between legacy Firebase Auth UIDs and Supabase
-- Auth UUIDs. Firestore documents are keyed by Firebase UID; Supabase Auth
-- users are UUIDs, so every data migration needs this bridge.

alter table public.profiles
  add column if not exists legacy_firebase_uid text unique;

create table if not exists public.auth_migration_map (
  firebase_uid text primary key,
  supabase_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  providers text[] not null default '{}',
  migrated_at timestamptz not null default now()
);

alter table public.auth_migration_map enable row level security;

drop policy if exists "auth migration admin read" on public.auth_migration_map;
drop policy if exists "auth migration owner read" on public.auth_migration_map;
drop policy if exists "auth migration admin write" on public.auth_migration_map;

create policy "auth migration admin read"
  on public.auth_migration_map
  for select
  to authenticated
  using (public.is_admin());

create policy "auth migration owner read"
  on public.auth_migration_map
  for select
  to authenticated
  using (auth.uid() = supabase_user_id);

create policy "auth migration admin write"
  on public.auth_migration_map
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

