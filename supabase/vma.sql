-- Essor Athletics — VMA results from the website (docs/vma.html).
-- Paste into Supabase → SQL Editor → New query → Run, once. Safe to run again.
--
-- Each runner gets a private, unguessable token. The site keeps it on the
-- phone and in their personal link, so they can come back, see their zones
-- and change their result. Nobody can list the table with the public key:
-- everything goes through the three functions below. Sean reads the table in
-- the Supabase dashboard (Table Editor → vma).

create table if not exists public.vma (
  token      uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name       text not null,
  phone      text,
  signup_id  uuid,                       -- the questionnaire row, when the site knows it
  vma        numeric(4,1) not null,      -- km/h
  test_m     integer,                    -- metres in the 6' test (null if VMA typed directly)
  hr_max     integer,                    -- optional, for heart-rate zones
  history    jsonb not null default '[]' -- [{ at, vma, test_m }], newest last
);

alter table public.vma enable row level security;
-- no anon policies on purpose: only the functions below touch the table

-- Read one runner's result with their token
create or replace function public.vma_get(t uuid)
returns table (token uuid, name text, vma numeric, test_m integer, hr_max integer, history jsonb, updated_at timestamptz)
language sql security definer stable set search_path = public as $$
  select v.token, v.name, v.vma, v.test_m, v.hr_max, v.history, v.updated_at from public.vma v where v.token = t;
$$;

-- Save (new or change). Every change is added to the history.
create or replace function public.vma_save(t uuid, p_name text, p_phone text, p_vma numeric, p_test_m integer, p_hr_max integer, p_signup uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare entry jsonb;
begin
  if p_vma is null or p_vma < 6 or p_vma > 30 then raise exception 'vma out of range' using errcode = 'check_violation'; end if;
  if p_hr_max is not null and (p_hr_max < 120 or p_hr_max > 230) then raise exception 'hr out of range' using errcode = 'check_violation'; end if;
  if char_length(coalesce(p_name, '')) not between 1 and 80 or char_length(coalesce(p_phone, '')) > 30 then raise exception 'bad name' using errcode = 'check_violation'; end if;
  entry := jsonb_build_object('at', now(), 'vma', p_vma, 'test_m', p_test_m);
  insert into public.vma as v (token, name, phone, signup_id, vma, test_m, hr_max, history)
  values (coalesce(t, gen_random_uuid()), p_name, p_phone, p_signup, p_vma, p_test_m, p_hr_max, jsonb_build_array(entry))
  on conflict (token) do update set
    name = excluded.name,
    phone = coalesce(excluded.phone, v.phone),
    signup_id = coalesce(excluded.signup_id, v.signup_id),
    hr_max = excluded.hr_max,
    history = case when v.vma is distinct from excluded.vma or v.test_m is distinct from excluded.test_m
                   then (v.history || entry) else v.history end,
    vma = excluded.vma,
    test_m = excluded.test_m,
    updated_at = now()
  returning v.token into t;
  return t;
end $$;

-- "Retrouver mes zones" on another phone: phone number + first name must both match
create or replace function public.vma_find(p_phone text, p_first text)
returns uuid
language sql security definer stable set search_path = public as $$
  select v.token from public.vma v
  where right(regexp_replace(coalesce(v.phone, ''), '\D', '', 'g'), 9) = right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9)
    and char_length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 9
    and lower(split_part(trim(v.name), ' ', 1)) = lower(split_part(trim(p_first), ' ', 1))
  order by v.updated_at desc limit 1;
$$;

grant execute on function public.vma_get(uuid) to anon;
grant execute on function public.vma_save(uuid, text, text, numeric, integer, integer, uuid) to anon;
grant execute on function public.vma_find(text, text) to anon;

-- ── 26/10: the runner's level comes from their questionnaire (signups) ──────
-- Matched by the sign-up row the site knew about, otherwise by phone number.
drop function if exists public.vma_get(uuid);
create or replace function public.vma_get(t uuid)
returns table (token uuid, name text, vma numeric, test_m integer, hr_max integer, history jsonb, updated_at timestamptz, level text)
language sql security definer stable set search_path = public as $$
  select v.token, v.name, v.vma, v.test_m, v.hr_max, v.history, v.updated_at,
    coalesce(
      (select s.level from public.signups s where s.id = v.signup_id),
      (select s.level from public.signups s
        where char_length(regexp_replace(coalesce(v.phone, ''), '\D', '', 'g')) >= 9
          and right(regexp_replace(coalesce(s.phone, ''), '\D', '', 'g'), 9) = right(regexp_replace(coalesce(v.phone, ''), '\D', '', 'g'), 9)
        order by s.created_at desc limit 1)
    ) as level
  from public.vma v where v.token = t;
$$;
grant execute on function public.vma_get(uuid) to anon;
