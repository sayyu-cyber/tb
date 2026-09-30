alter table public.profiles
  add column if not exists last_seen timestamptz;
