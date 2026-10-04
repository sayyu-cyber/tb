-- Requires 008 and 009. Evidence is refreshed under the economy wallet lock.
-- Champion eligibility and weekly rank payouts still require trusted finalizers.
begin;

create function public.ensure_verified_economy_progress(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_wins bigint; v_trophies integer; v_peak integer; v_catalog jsonb;
  v_cardbacks integer; v_tables integer; v_collection integer;
  v_table_target integer; v_collection_target integer;
  v_week date := date_trunc('week', now() at time zone 'UTC')::date;
begin
  perform 1 from public.wallets where user_id = p_user_id for update;
  if not found then raise exception 'Wallet not found'; end if;
  perform public.ensure_economy_missions(p_user_id);

  -- A legacy stats total or a match player row alone is not win evidence.
  -- Team winners are represented by each participant's settled result in 009.
  select count(*) into v_wins
    from public.match_players mp join public.match_results mr on mr.match_id = mp.match_id
    where mp.user_id = p_user_id and mp.result = 'win' and mr.result->>'verified' = 'true';
  select coalesce((select trophies from public.ranked_progress where user_id = p_user_id), 0),
    coalesce((select peak_trophies from public.player_stats where user_id = p_user_id), 0)
    into v_trophies, v_peak;
  v_peak := greatest(v_peak, v_trophies);

  select value into v_catalog from public.app_config where id = 'economyCatalog';
  select count(*) filter (where item->>'category' = 'tableTheme'), count(*)
    into v_table_target, v_collection_target
    from jsonb_each(v_catalog->'cosmetics') as c(id,item);
  if v_table_target = 0 or v_collection_target = 0 then raise exception 'Missing cosmetic catalog'; end if;
  -- Count actual inventory with the same category, VIP and earned-only checks as
  -- equipment. Never certify an earned-only legacy row as a side effect of reading.
  select count(*) filter (where i.category = 'cardBack'),
    count(*) filter (where i.category = 'tableTheme'), count(*)
    into v_cardbacks, v_tables, v_collection
    from public.inventory_items i
    where i.user_id = p_user_id and public.economy_cosmetic_usable(p_user_id, i.item_id, i.category);

  -- These tables drive realtime snapshot refreshes. An unchanged read must not
  -- emit an UPDATE (including a verified_at-only UPDATE) and refresh itself.
  insert into public.user_achievements as existing
    (user_id,achievement_id,progress,target,verified_at)
    select p_user_id, a.id, least(a.progress,a.target)::integer, a.target, now()
    from (values
      ('ach_first_win', v_wins, 1),
      ('ach_10_wins', v_wins, 10),
      ('ach_50_wins', v_wins, 50),
      ('ach_100_wins', v_wins, 100),
      ('ach_first_gold', (v_peak >= 50)::integer, 1),
      ('ach_first_platinum', (v_peak >= 75)::integer, 1),
      ('ach_10_cardbacks', v_cardbacks, 10),
      ('ach_all_tables', v_tables, v_table_target),
      ('ach_100_collection', v_collection, v_collection_target)
    ) as a(id,progress,target) where true
    on conflict (user_id,achievement_id) do update set
      progress = excluded.progress, target = excluded.target, verified_at = excluded.verified_at
    where (existing.progress,existing.target) is distinct from (excluded.progress,excluded.target)
      or existing.verified_at is null;
  -- unlocked_at is deliberately preserved, but never used as eligibility proof.
  -- ach_weekend_champ has no trusted evidence source here and is not certified.

  with eligibility as (
    select m.id,
      (v_trophies >= case m.template_id when 'wm_reach_silver' then 25
        when 'wm_reach_gold' then 50 when 'wm_reach_platinum' then 75 end
        or (m.verified_at is not null and m.completed and m.progress >= m.target
          and m.completed_at is not null)) as eligible
    from public.user_missions m
    where m.user_id = p_user_id and m.cadence = 'weekly' and m.period_start = v_week
      and m.generated_at >= (v_week::timestamp at time zone 'UTC') and m.generated_at <= now()
      and m.template_id in ('wm_reach_silver','wm_reach_gold','wm_reach_platinum')
  )
  -- Like achievements, retain the first verification timestamp on no-op reads.
  update public.user_missions m set
    target = 1, progress = e.eligible::integer, completed = e.eligible,
    completed_at = case when e.eligible then
      case when m.verified_at is not null then coalesce(m.completed_at,now()) else now() end
      else null end,
    verified_at = now()
    from eligibility e where m.id = e.id
      and (m.target <> 1 or m.progress <> e.eligible::integer or m.completed <> e.eligible
        or (m.completed_at is not null) <> e.eligible or m.verified_at is null);
end;
$$;
revoke all on function public.ensure_verified_economy_progress(uuid) from public, anon, authenticated;
grant execute on function public.ensure_verified_economy_progress(uuid) to service_role;

alter function public.get_economy_snapshot() rename to economy_snapshot_v8_internal;
revoke all on function public.economy_snapshot_v8_internal() from public, anon, authenticated, service_role;
create function public.get_economy_snapshot()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  perform 1 from public.wallets where user_id = v_uid for update;
  if not found then raise exception 'Wallet not found'; end if;
  perform public.ensure_verified_economy_progress(v_uid);
  -- Keep the complete 008 response contract, including integrityVersion = 1.
  return public.economy_snapshot_v8_internal();
end;
$$;
revoke all on function public.get_economy_snapshot() from public, anon, authenticated;
grant execute on function public.get_economy_snapshot() to authenticated;

commit;
notify pgrst, 'reload schema';
