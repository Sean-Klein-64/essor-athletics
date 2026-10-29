-- Essor Athletics — "Le groupe ce cycle": the club's progress, in numbers.
-- Paste into Supabase → SQL Editor → New query → Run, once. Safe to run again.
-- Needs coach.sql (signups.progress) and vma.sql to have run first.
--
-- club_pulse(since) is what the Home card reads: how many runners are in,
-- how many sessions were logged since a date, how many VMA tests were
-- recorded, and who moved up a level (first name + new level). First names
-- only, app-access runners only, callable by anyone with the app.

create or replace function public.club_pulse(p_since date)
returns jsonb
language sql security definer stable set search_path = public as $$
  with members as (
    select distinct on (public.norm_phone(x.phone), public.norm_first(x.name)) x.*
    from public.signups x
    where x.app_access
    order by public.norm_phone(x.phone), public.norm_first(x.name), x.created_at desc
  ),
  logged as (
    select m.id, d.key as session_id, d.value as at
    from members m, jsonb_each_text(coalesce(m.progress->'done', '{}'::jsonb)) d
    where d.value::date >= p_since
  ),
  tests as (
    select count(*) as n
    from public.vma v, jsonb_array_elements(v.history) h
    where (h->>'at')::date >= p_since and (h->>'test_m') is not null
  ),
  passages as (
    select initcap(split_part(trim(m.name), ' ', 1)) as first_name, m.progress->>'level' as level
    from members m
    where (m.progress->>'level') is not null
      and (m.progress->>'level') is distinct from m.level
      and (m.progress->>'at')::date >= p_since
  )
  select jsonb_build_object(
    'runners',  (select count(*) from members),
    'sessions', (select count(*) from logged),
    'active',   (select count(distinct id) from logged),
    'tests',    (select n from tests),
    'passages', (select coalesce(jsonb_agg(jsonb_build_object('name', first_name, 'level', level) order by first_name), '[]'::jsonb) from passages)
  );
$$;

grant execute on function public.club_pulse(date) to anon;
