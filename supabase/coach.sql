-- Essor Athletics — the Coach Session Hub.
-- Paste into Supabase → SQL Editor → New query → Run, once. Safe to run again.
-- Needs members.sql (norm_phone / norm_first) and vma.sql to have run first.
--
-- How it works
--   • coach_athletes(code) gives the coach view every runner with app access:
--     level, questionnaire answers (injury notes included), latest VMA and
--     what their phone has reported. Wrong code → error, nothing returned.
--     The code lives in coach_settings (unreadable with the public key) —
--     change it there and in js/lib/config.js together.
--   • member_progress() is called by members' phones: sessions marked done
--     and how each went (logs: pace, feel, note — js/lib/log.js), their goal
--     for the group race, their best times and the VMA on the phone. Kept in
--     signups.progress.

create table if not exists public.coach_settings (
  key   text primary key,
  value text not null
);
alter table public.coach_settings enable row level security;
-- no policies on purpose: only the functions below read it
insert into public.coach_settings (key, value) values ('code', 'floride') on conflict (key) do nothing;

alter table public.signups add column if not exists progress jsonb not null default '{}'::jsonb;

-- The member app reports its progress (phone number + first name, same as sign-in)
create or replace function public.member_progress(p_phone text, p_first text, p_progress jsonb)
returns boolean
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  if p_progress is null or jsonb_typeof(p_progress) <> 'object' or char_length(p_progress::text) > 20000 then return false; end if;
  if char_length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 9 or public.norm_first(p_first) = '' then return false; end if;

  select x.id into sid from public.signups x
  where public.norm_phone(x.phone) = public.norm_phone(p_phone)
    and public.norm_first(x.name) = public.norm_first(p_first)
    and x.app_access
  order by x.created_at desc limit 1;
  if not found then return false; end if;

  update public.signups set progress = jsonb_build_object(
    'level',    p_progress->'level',
    'programme', p_progress->'programme',
    'done',     coalesce(p_progress->'done', '{}'::jsonb),
    'logs',     coalesce(p_progress->'logs', '{}'::jsonb),
    'raceGoal', p_progress->'raceGoal',
    'records',  coalesce(p_progress->'records', '{}'::jsonb),
    'vma',      p_progress->'vma',
    'at',       now()
  ) where id = sid;
  return true;
end $$;

-- The coach roster: one entry per runner with app access (newest questionnaire wins)
create or replace function public.coach_athletes(p_code text)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
begin
  if not exists (select 1 from public.coach_settings c where c.key = 'code' and lower(c.value) = lower(trim(coalesce(p_code, '')))) then
    raise exception 'wrong coach code' using errcode = 'insufficient_privilege';
  end if;

  return coalesce((
    select jsonb_agg(row order by row->>'name')
    from (
      select jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'level', s.level,
        'start_week', s.start_week,
        'answers', jsonb_build_object(
          'runContinuous', s.answers->'runContinuous',
          'runsPerWeek', s.answers->'runsPerWeek',
          'kmWeek', s.answers->'kmWeek',
          'fiveK', s.answers->'fiveK',
          'races', s.answers->'races',
          'injury', s.answers->'injury',
          'injuryDetail', s.answers->'injuryDetail',
          'goal', s.answers->'goal',
          'bests', s.answers->'bests'
        ),
        'vma', (
          select jsonb_build_object('vma', v.vma, 'test_m', v.test_m, 'hr_max', v.hr_max, 'history', v.history, 'updated_at', v.updated_at)
          from public.vma v
          where v.signup_id = s.id
             or (char_length(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g')) >= 9
                 and public.norm_phone(v.phone) = public.norm_phone(s.phone))
          order by v.updated_at desc limit 1
        ),
        'progress', s.progress
      ) as row
      from (
        select distinct on (public.norm_phone(x.phone), public.norm_first(x.name)) x.*
        from public.signups x
        where x.app_access
        order by public.norm_phone(x.phone), public.norm_first(x.name), x.created_at desc
      ) s
    ) t
  ), '[]'::jsonb);
end $$;

grant execute on function public.member_progress(text, text, jsonb) to anon;
grant execute on function public.coach_athletes(text) to anon;
