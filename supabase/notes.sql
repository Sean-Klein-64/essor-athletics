-- Essor Athletics — a coach's word on a runner's session, and "Ils étaient là".
-- Paste into Supabase → SQL Editor → New query → Run, once. Safe to run again.
-- Needs members.sql (norm_phone / norm_first) and coach.sql (coach_settings) first.
--
-- How it works
--   • In the Coach Session Hub a coach writes one line on a runner's logged
--     session ("bonne gestion de la 4e"). coach_note() saves it, gated by the
--     coach code. The runner sees it on that session's page the next time the
--     app loads (member_notes(), same phone + first name as sign-in).
--   • session_attendees() gives the first names of everyone who logged a
--     session — "Ils étaient là" under a past session. First names only,
--     and only for runners with app access.

create table if not exists public.coach_notes (
  signup_id  uuid not null references public.signups(id) on delete cascade,
  session_id text not null,
  note       text not null,
  coach      text not null default '',
  updated_at timestamptz not null default now(),
  primary key (signup_id, session_id)
);
alter table public.coach_notes enable row level security;
-- no anon policies on purpose: only the functions below touch the table

-- Coach: write (or rewrite) the note on one runner's session. Empty note → removed.
create or replace function public.coach_note(p_code text, p_signup uuid, p_session text, p_note text, p_coach text)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.coach_settings c where c.key = 'code' and lower(c.value) = lower(trim(coalesce(p_code, '')))) then
    raise exception 'wrong coach code' using errcode = 'insufficient_privilege';
  end if;
  if p_signup is null or coalesce(p_session, '') = '' then return false; end if;
  if trim(coalesce(p_note, '')) = '' then
    delete from public.coach_notes where signup_id = p_signup and session_id = p_session;
    return true;
  end if;
  insert into public.coach_notes (signup_id, session_id, note, coach, updated_at)
  values (p_signup, p_session, left(trim(p_note), 280), left(coalesce(p_coach, ''), 40), now())
  on conflict (signup_id, session_id) do update
    set note = excluded.note, coach = excluded.coach, updated_at = now();
  return true;
end $$;

-- Coach: every note, { "<signup_id>": { "<session_id>": { note, coach, at } } } — read with the roster
create or replace function public.coach_notes_all(p_code text)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
begin
  if not exists (select 1 from public.coach_settings c where c.key = 'code' and lower(c.value) = lower(trim(coalesce(p_code, '')))) then
    raise exception 'wrong coach code' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((
    select jsonb_object_agg(signup_id, per_session)
    from (
      select n.signup_id, jsonb_object_agg(n.session_id, jsonb_build_object('note', n.note, 'coach', n.coach, 'at', n.updated_at)) as per_session
      from public.coach_notes n group by n.signup_id
    ) t
  ), '{}'::jsonb);
end $$;

-- Member: my notes, { session_id: { note, coach, at } }
create or replace function public.member_notes(p_phone text, p_first text)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare sid uuid;
begin
  if char_length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 9 or public.norm_first(p_first) = '' then return '{}'::jsonb; end if;
  select x.id into sid from public.signups x
  where public.norm_phone(x.phone) = public.norm_phone(p_phone)
    and public.norm_first(x.name) = public.norm_first(p_first)
    and x.app_access
  order by x.created_at desc limit 1;
  if not found then return '{}'::jsonb; end if;
  return coalesce((
    select jsonb_object_agg(n.session_id, jsonb_build_object('note', n.note, 'coach', n.coach, 'at', n.updated_at))
    from public.coach_notes n where n.signup_id = sid
  ), '{}'::jsonb);
end $$;

-- Everyone: first names of the runners who logged this session
create or replace function public.session_attendees(p_session text)
returns jsonb
language sql security definer stable set search_path = public as $$
  select coalesce(jsonb_agg(first_name order by first_name), '[]'::jsonb)
  from (
    select distinct initcap(split_part(trim(s.name), ' ', 1)) as first_name
    from public.signups s
    where s.app_access
      and coalesce(p_session, '') <> ''
      and ((s.progress->'done') ? p_session or (s.progress->'logs') ? p_session)
  ) t;
$$;

grant execute on function public.coach_note(text, uuid, text, text, text) to anon;
grant execute on function public.coach_notes_all(text) to anon;
grant execute on function public.member_notes(text, text) to anon;
grant execute on function public.session_attendees(text) to anon;
