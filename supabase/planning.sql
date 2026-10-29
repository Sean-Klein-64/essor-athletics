-- Essor — coach planning confirmations (docs/planning/index.html).
-- Paste into Supabase → SQL Editor → New query → Run, once. Safe to run again.
--
-- Each coach opens their own link (?c=lilou&k=code). Every tap on the page
-- (Indisponible / OK / Pas possible / commentaire) is saved straight away.
-- Nobody can read or write the tables with the public key: everything goes
-- through the functions below, which check the coach's code first.
-- Sean's overview (?c=sean&k=<admin code>) reads everything.

create table if not exists public.planning_coaches (
  coach      text primary key,          -- 'joffrey', 'lilou', ... and 'sean'
  code       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.planning_responses (
  month       text not null,            -- '2026-11'
  coach       text not null,
  session_key text not null,            -- '2026-11-09_1700_HYBRID', or '_confirmed'
  answer      text,                     -- 'indispo' | 'ok' | 'pas_possible' | 'confirmed' | null (cleared)
  comment     text,
  updated_at  timestamptz not null default now(),
  primary key (month, coach, session_key)
);

alter table public.planning_coaches enable row level security;
alter table public.planning_responses enable row level security;
-- no anon policies on purpose: only the functions below touch the tables

create or replace function public.planning_check(p_coach text, p_code text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.planning_coaches where coach = lower(p_coach) and code = p_code);
$$;

-- A coach's own answers for a month
create or replace function public.planning_mine(p_coach text, p_code text, p_month text)
returns table (session_key text, answer text, comment text, updated_at timestamptz)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.planning_check(p_coach, p_code) then raise exception 'bad code' using errcode = 'insufficient_privilege'; end if;
  return query select r.session_key, r.answer, r.comment, r.updated_at
    from public.planning_responses r where r.coach = lower(p_coach) and r.month = p_month;
end $$;

-- Save one answer (upsert). answer null = cleared.
create or replace function public.planning_answer(p_coach text, p_code text, p_month text, p_session text, p_answer text, p_comment text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.planning_check(p_coach, p_code) then raise exception 'bad code' using errcode = 'insufficient_privilege'; end if;
  if p_answer is not null and p_answer not in ('indispo', 'ok', 'pas_possible', 'confirmed') then raise exception 'bad answer' using errcode = 'check_violation'; end if;
  if char_length(coalesce(p_comment, '')) > 500 or char_length(coalesce(p_session, '')) not between 1 and 80 then raise exception 'too long' using errcode = 'check_violation'; end if;
  insert into public.planning_responses (month, coach, session_key, answer, comment)
  values (p_month, lower(p_coach), p_session, p_answer, nullif(p_comment, ''))
  on conflict (month, coach, session_key) do update set answer = excluded.answer, comment = excluded.comment, updated_at = now();
end $$;

-- Sean's overview: everything for a month
create or replace function public.planning_all(p_code text, p_month text)
returns table (coach text, session_key text, answer text, comment text, updated_at timestamptz)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.planning_check('sean', p_code) then raise exception 'bad code' using errcode = 'insufficient_privilege'; end if;
  return query select r.coach, r.session_key, r.answer, r.comment, r.updated_at
    from public.planning_responses r where r.month = p_month order by r.coach, r.updated_at;
end $$;

grant execute on function public.planning_check(text, text) to anon, authenticated;
grant execute on function public.planning_mine(text, text, text) to anon, authenticated;
grant execute on function public.planning_answer(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.planning_all(text, text) to anon, authenticated;

-- Access codes: run separately in the SQL editor (not kept in the repo).
-- insert into public.planning_coaches (coach, code) values ('joffrey', '<code>'), ... , ('sean', '<admin code>')
-- on conflict (coach) do update set code = excluded.code;
