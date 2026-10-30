import { isConfigured, rpc } from "./supabase";
import { PROGRAMMES } from "./beginner";
import { parseClock } from "./paces";
import { goalsReport } from "./objectives";

/*
  Members-only sign-in, linked to the website.

  Runners fill in the questionnaire on the site (signups table); Sean ticks
  app_access on their row once they're an Essor member with RUN CLUB in
  Wodify. The app signs in with phone number + first name through the
  member_profile() function (supabase/members.sql) and gets back:
    { status: "ok", id, name, level, start_week, answers, vma }
    { status: "pending" }   questionnaire found, access not ticked yet
    { status: "none" }      no questionnaire with that phone + first name

  The same call runs again at each launch, so a level or start week Sean
  changes in Supabase reaches the runner's phone — and a runner whose
  access is removed goes back to the sign-in screen.
*/

export const SITE_URL = "https://sean-klein-64.github.io/essor-athletics/";

export const fetchProfile = (phone, firstName) => rpc("member_profile", { p_phone: phone, p_first: firstName });

/* Where week N of a Débuter programme starts, as a programme index (3 sessions a week) */
export const weekStartIndex = (week) => (Math.min(Math.max(week, 1), 6) - 1) * 3;

/*
  Copy a profile into the phone's preferences.
  Level and start week follow Supabase only when Sean has changed them since
  the last sync — so a runner who passed their Débuter test in the app isn't
  pulled back down at the next launch.
*/
export const applyProfile = async (profile, { preferences: p, setPreference, saveVma, saveRecord }, { first }) => {
  const a = profile.answers || {};
  if (profile.name) await setPreference("name", profile.name);

  const levelChanged = profile.level && profile.level !== p.member?.level;
  const weekChanged = (profile.start_week || null) !== (p.member?.startWeek ?? null);
  if (first || levelChanged) await setPreference("level", profile.level || "level3");
  const level = first || levelChanged ? profile.level : p.level;
  if (PROGRAMMES[level] && profile.start_week && (first || levelChanged || weekChanged)) {
    await setPreference("programme", { ...(p.programme || {}), [level]: weekStartIndex(profile.start_week) });
  }

  if (first) {
    for (const key of ["runContinuous", "runsPerWeek", "fiveK", "races", "goal"]) {
      if (a[key] != null && a[key] !== "") await setPreference(key, a[key]);
    }
    for (const [id, time] of Object.entries(a.bests || {})) {
      const seconds = parseClock(time || "");
      if (seconds && !(p.records?.[id] || []).length) await saveRecord(id, seconds, null);
    }
  }

  // VMA from the website: take it when it's newer than what the phone has
  // (a test logged in the app afterwards stays the current one)
  const v = profile.vma;
  if (v && v.vma != null && Number(v.vma) !== p.vma) {
    const last = (v.history || []).slice(-1)[0];
    const siteDate = last?.at ? String(last.at).slice(0, 10) : "";
    const phoneDate = (p.vmaHistory || []).slice(-1)[0]?.date || "";
    if (!p.vma || siteDate >= phoneDate) await saveVma(Number(v.vma), v.test_m ? "test" : "typed", siteDate || undefined);
  }
  if (v && v.hr_max && !p.hrMax) await setPreference("hrMax", v.hr_max);

  return { id: profile.id, level: profile.level, startWeek: profile.start_week || null };
};

/* Sign in, or re-check at launch. Returns the status; on "ok" the phone is up to date. */
export const syncMember = async (ctx, phone, firstName, { first = false } = {}) => {
  const profile = await fetchProfile(phone, firstName);
  if (profile.status !== "ok") return profile.status;
  const meta = await applyProfile(profile, ctx, { first });
  await ctx.setPreference("member", { ...meta, phone, first: firstName, checked: new Date().toISOString() });
  return "ok";
};

/*
  What the phone tells the coaches (member_progress(), supabase/coach.sql):
  sessions marked done, their goals (group race choice + own race + smaller
  objectives, packed into raceGoal — js/lib/objectives.js), their best
  time per distance and the VMA on the phone. Read in the Coach Session Hub.
  Fails quietly — it's a report, nothing on the phone depends on it.
*/
export const progressReport = (p) => ({
  done: p.done || {},
  raceGoal: goalsReport(p),
  records: Object.fromEntries(
    Object.entries(p.records || {})
      .map(([id, list]) => [id, Math.min(...(list || []).map((e) => e.seconds).filter(Boolean))])
      .filter(([, s]) => Number.isFinite(s)),
  ),
  vma: p.vma ? { value: p.vma, ...((p.vmaHistory || []).slice(-1)[0] || {}) } : null,
});

export const reportProgress = async (preferences) => {
  const m = preferences.member;
  if (!m?.phone || !isConfigured()) return false;
  try {
    await rpc("member_progress", { p_phone: m.phone, p_first: m.first, p_progress: progressReport(preferences) });
    return true;
  } catch {
    return false;
  }
};
