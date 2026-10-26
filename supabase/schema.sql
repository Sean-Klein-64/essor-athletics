-- Essor Athletics — shared data.
-- Paste this into Supabase → SQL Editor → New query → Run, once.

-- 1. The "Je viens" list
create table if not exists public.attendance (
  session_id text not null,          -- the session id
  device_id  text not null,          -- random id per phone (no accounts yet)
  name       text not null default '',
  level      text,
  created_at timestamptz not null default now(),
  primary key (session_id, device_id)
);

alter table public.attendance enable row level security;

create policy "read list"   on public.attendance for select to anon using (true);
create policy "say coming"  on public.attendance for insert to anon with check (char_length(name) <= 60);
create policy "update self" on public.attendance for update to anon using (true) with check (char_length(name) <= 60);
create policy "not coming"  on public.attendance for delete to anon using (true);

-- 2. Sessions written by coaches in the app
--    `body` holds { warmup, cooldown, levels } in the format of js/lib/sessions.js
create table if not exists public.sessions (
  id         text primary key,
  date       date not null,
  title      text not null,
  kind       text,
  summary    text,
  body       jsonb not null default '{}'::jsonb,
  author     text,
  hidden     boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

-- Everyone reads. Writes are trust-based for now (the coach code in the app
-- is the gate) — swap for auth-based rules when sign-in arrives.
create policy "read sessions"  on public.sessions for select to anon using (true);
create policy "write sessions" on public.sessions for insert to anon with check (char_length(title) <= 80);
create policy "edit sessions"  on public.sessions for update to anon using (true) with check (char_length(title) <= 80);

-- 3. Sign-ups from the web questionnaire (web/questionnaire.html)
create table if not exists public.signups (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null,
  phone      text,
  level      text,
  answers    jsonb not null default '{}'::jsonb,
  summary    text
);
alter table public.signups enable row level security;
create policy "sign up" on public.signups for insert to anon with check (char_length(name) <= 80);
-- nobody reads sign-ups with the anon key: Sean reads them in the Supabase dashboard

-- how many are signed up for the launch (callable with the anon key; exposes only a number)
create or replace function public.launch_count() returns integer
language sql security definer stable as $$
  select count(*)::int from public.signups where (answers->>'launch') = 'yes' and (answers->>'member') = 'yes';
$$;
grant execute on function public.launch_count() to anon;

-- the cap: 15 for the first session
create or replace function public.enforce_launch_cap() returns trigger
language plpgsql security definer as $$
begin
  if (new.answers->>'launch') = 'yes' and (new.answers->>'member') = 'yes' and (select count(*) from public.signups where (answers->>'launch') = 'yes' and (answers->>'member') = 'yes') >= 15 then
    raise exception 'launch full' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists signups_cap on public.signups;
create trigger signups_cap before insert on public.signups for each row execute function public.enforce_launch_cap();

-- "Modifier mes réponses": the phone that created a row may update it (ids are unguessable uuids)
create policy "edit own" on public.signups for update to anon using (true) with check (char_length(name) <= 80);
-- cap also enforced on updates, except for a row that already held a place
create or replace function public.enforce_launch_cap() returns trigger
language plpgsql security definer as $$
begin
  if (new.answers->>'launch') = 'yes' and (new.answers->>'member') = 'yes'
     and not (TG_OP = 'UPDATE' and (old.answers->>'launch') = 'yes' and (old.answers->>'member') = 'yes')
     and (select count(*) from public.signups where (answers->>'launch') = 'yes' and (answers->>'member') = 'yes') >= 15 then
    raise exception 'launch full' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists signups_cap on public.signups;
create trigger signups_cap before insert or update on public.signups for each row execute function public.enforce_launch_cap();

-- 4. VMA results from the website (docs/vma.html) — see supabase/vma.sql
