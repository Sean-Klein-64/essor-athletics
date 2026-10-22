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
