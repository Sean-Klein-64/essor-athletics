-- Essor Athletics — Wodify bookings and attendance for the coach page (docs/coach.html).
-- Paste into Supabase → SQL Editor → New query → Run, once. Safe to run again.
-- Needs coach.sql to have run first (coach_settings holds the coach code).
--
-- How it works
--   • Wodify has no feed the site can read, so a sync reads the Run Club class
--     in Wodify and stores one small snapshot here:
--       { "session_date": "2026-11-20",
--         "booked":   ["Prénom Nom", …],          -- reserved for that session
--         "attended": { "Prénom Nom": 3, … } }    -- Run Club sessions attended so far
--   • coach_wodify(code) hands the snapshot to the coach page.
--   • coach_wodify_set(code, data) replaces it. Wrong code → error.
--   • The table is unreadable with the public key: only the functions touch it.

create table if not exists public.coach_wodify (
  id         integer primary key default 1 check (id = 1),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.coach_wodify enable row level security;
-- no policies on purpose

create or replace function public.coach_wodify(p_code text)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
begin
  if not exists (select 1 from public.coach_settings c where c.key = 'code' and lower(c.value) = lower(trim(coalesce(p_code, '')))) then
    raise exception 'wrong coach code' using errcode = 'insufficient_privilege';
  end if;
  return (select jsonb_build_object('data', w.data, 'updated_at', w.updated_at) from public.coach_wodify w where w.id = 1);
end $$;

create or replace function public.coach_wodify_set(p_code text, p_data jsonb)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.coach_settings c where c.key = 'code' and lower(c.value) = lower(trim(coalesce(p_code, '')))) then
    raise exception 'wrong coach code' using errcode = 'insufficient_privilege';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or char_length(p_data::text) > 60000 then return false; end if;
  insert into public.coach_wodify (id, data, updated_at) values (1, p_data, now())
  on conflict (id) do update set data = excluded.data, updated_at = now();
  return true;
end $$;

grant execute on function public.coach_wodify(text) to anon;
grant execute on function public.coach_wodify_set(text, jsonb) to anon;
