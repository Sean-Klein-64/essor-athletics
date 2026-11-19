-- Essor Athletics — what the coach page (docs/coach.html) needs. Run once in Supabase → SQL Editor. Safe to run again.
-- The page's own code sits in coach_secrets under 'coach_page' (separate from the sign-up sync's code).
-- coach_athletes() here lists every questionnaire (no app_access filter: the app isn't out yet).
insert into public.coach_secrets (k, v) values ('coach_page', 'floride') on conflict (k) do update set v = excluded.v;

create or replace function public.coach_athletes(p_code text) returns jsonb
language plpgsql security definer stable set search_path = public as $$
begin
  if not exists (select 1 from public.coach_secrets c where c.k = 'coach_page' and lower(c.v) = lower(trim(coalesce(p_code, '')))) then
    raise exception 'wrong coach code' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((
    select jsonb_agg(r order by r->>'name') from (
      select jsonb_build_object(
        'id', s.id, 'name', s.name, 'level', s.level,
        'answers', jsonb_build_object('fiveK', s.answers->'fiveK', 'injury', s.answers->'injury', 'injuryDetail', s.answers->'injuryDetail', 'goal', s.answers->'goal', 'bests', s.answers->'bests', 'member', s.answers->'member', 'runContinuous', s.answers->'runContinuous', 'runsPerWeek', s.answers->'runsPerWeek', 'races', s.answers->'races'),
        'vma', (select jsonb_build_object('vma', v.vma, 'test_m', v.test_m, 'hr_max', v.hr_max, 'history', v.history, 'updated_at', v.updated_at)
                from public.vma v
                where v.signup_id = s.id
                   or (char_length(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g')) >= 9
                       and right(regexp_replace(coalesce(v.phone, ''), '\D', '', 'g'), 9) = right(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g'), 9))
                order by v.updated_at desc limit 1),
        'progress', '{}'::jsonb) as r
      from (
        select distinct on (right(regexp_replace(coalesce(x.phone, ''), '\D', '', 'g'), 9), lower(split_part(trim(x.name), ' ', 1))) x.*
        from public.signups x
        order by right(regexp_replace(coalesce(x.phone, ''), '\D', '', 'g'), 9), lower(split_part(trim(x.name), ' ', 1)), x.created_at desc
      ) s
    ) t), '[]'::jsonb);
end $$;
grant execute on function public.coach_athletes(text) to anon;

-- Wodify bookings / attendance snapshot shown on the page
create table if not exists public.coach_wodify (id integer primary key default 1 check (id = 1), data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
alter table public.coach_wodify enable row level security;

create or replace function public.coach_wodify(p_code text) returns jsonb
language plpgsql security definer stable set search_path = public as $$
begin
  if not exists (select 1 from public.coach_secrets c where c.k = 'coach_page' and lower(c.v) = lower(trim(coalesce(p_code, '')))) then
    raise exception 'wrong coach code' using errcode = 'insufficient_privilege';
  end if;
  return (select jsonb_build_object('data', w.data, 'updated_at', w.updated_at) from public.coach_wodify w where w.id = 1);
end $$;

create or replace function public.coach_wodify_set(p_code text, p_data jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.coach_secrets c where c.k = 'coach_page' and lower(c.v) = lower(trim(coalesce(p_code, '')))) then
    raise exception 'wrong coach code' using errcode = 'insufficient_privilege';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or char_length(p_data::text) > 60000 then return false; end if;
  insert into public.coach_wodify (id, data, updated_at) values (1, p_data, now())
  on conflict (id) do update set data = excluded.data, updated_at = now();
  return true;
end $$;
grant execute on function public.coach_wodify(text) to anon;
grant execute on function public.coach_wodify_set(text, jsonb) to anon;
