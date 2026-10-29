-- Essor Athletics — members-only sign-in for the app, and programme placement.
-- Paste into Supabase → SQL Editor → New query → Run, once. Safe to run again.
--
-- How it works
--   • Every runner fills in the questionnaire on the website (a row in signups).
--   • Sean ticks app_access on their row when he adds RUN CLUB to their Wodify
--     membership. Only ticked rows can sign in to the app.
--   • start_week (1–6) places a Débuter A/B/C runner at a chosen week of their
--     programme. Change level / start_week on the row and the app follows.
--   • The app signs in with phone number + first name, through member_profile()
--     below. The table itself stays unreadable with the public key.

alter table public.signups add column if not exists app_access boolean not null default false;
alter table public.signups add column if not exists start_week integer;
alter table public.signups drop constraint if exists signups_start_week_check;
alter table public.signups add constraint signups_start_week_check check (start_week is null or start_week between 1 and 6);

-- "Hélène Martin" → "helene"; "06 12 34 56 78" / "+33 6 12…" → "612345678"
create or replace function public.norm_first(t text) returns text
language sql immutable as $$
  select translate(lower(split_part(trim(coalesce(t, '')), ' ', 1)),
    'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ', 'aaaaaaceeeeiiiinooooouuuuyyoa');
$$;
create or replace function public.norm_phone(t text) returns text
language sql immutable as $$
  select right(regexp_replace(coalesce(t, ''), '\D', '', 'g'), 9);
$$;

-- The app's sign-in. Returns { status: "ok" | "pending" | "none", … }.
--   ok      → the runner's name, level, start_week, questionnaire answers, VMA
--   pending → their questionnaire is there but Sean hasn't ticked app_access yet
--   none    → no questionnaire with that phone + first name
create or replace function public.member_profile(p_phone text, p_first text)
returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare
  s public.signups%rowtype;
  v public.vma%rowtype;
  has_vma boolean;
begin
  if char_length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 9 or public.norm_first(p_first) = '' then
    return jsonb_build_object('status', 'none');
  end if;

  select * into s from public.signups x
  where public.norm_phone(x.phone) = public.norm_phone(p_phone)
    and public.norm_first(x.name) = public.norm_first(p_first)
  order by x.app_access desc, x.created_at desc
  limit 1;
  if not found then return jsonb_build_object('status', 'none'); end if;
  if not s.app_access then return jsonb_build_object('status', 'pending', 'name', s.name); end if;

  select * into v from public.vma y
  where public.norm_phone(y.phone) = public.norm_phone(p_phone)
  order by y.updated_at desc limit 1;
  has_vma := found;

  return jsonb_build_object(
    'status', 'ok',
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
      'goal', s.answers->'goal',
      'bests', s.answers->'bests'
    ),
    'vma', case when has_vma then jsonb_build_object('vma', v.vma, 'test_m', v.test_m, 'hr_max', v.hr_max, 'history', v.history) else null end
  );
end $$;

grant execute on function public.member_profile(text, text) to anon;
