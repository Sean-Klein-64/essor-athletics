-- The shared "Je viens" list for Essor Athletics.
-- Paste this into Supabase → SQL Editor → New query → Run, once.

create table if not exists public.attendance (
  session_id text not null,          -- the id from js/lib/sessions.js
  device_id  text not null,          -- random id per phone (no accounts yet)
  name       text not null default '',
  level      text,
  created_at timestamptz not null default now(),
  primary key (session_id, device_id)
);

alter table public.attendance enable row level security;

-- Anyone with the app can see who's coming, add themselves and remove themselves.
-- Without accounts the database can't check who a phone belongs to, so this is
-- trust-based — fine for a club list. Replace with auth-based rules when
-- sign-in arrives.
create policy "read list"   on public.attendance for select to anon using (true);
create policy "say coming"  on public.attendance for insert to anon with check (char_length(name) <= 60);
create policy "update self" on public.attendance for update to anon using (true) with check (char_length(name) <= 60);
create policy "not coming"  on public.attendance for delete to anon using (true);
