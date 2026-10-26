import { SUPABASE_URL, SUPABASE_ANON_KEY, COACH_CODE } from "./config";
import levels, { levelById } from "./levels";
import { planFor } from "./plan";
import goal from "./goal";
import { distanceName } from "./objectives";
import onboarding from "./onboarding";
import { DISTANCES } from "./records";
import {
  ZONES,
  zonePace,
  repTime,
  repDistance,
  toSeconds,
  parseClock,
  formatClock,
  formatPace,
  formatDuration,
  formatDistance,
  paceFromSpeed,
  speedAt,
} from "./paces";

/*
  The Coach Session Hub's data: who's coming to a session, and everything a
  coach wants to know about each runner.

  The roster comes from coach_athletes() in Supabase (supabase/coach.sql):
  every runner with app access, their questionnaire, their latest VMA from
  the website, and what their phone reported (sessions done, race goal,
  best times, VMA tested in the app — see reportProgress in js/lib/member.js).

  Pure helpers below the fetch — no React — so scripts/test_paces.js can
  check them.
*/

/* ── Fetching ─────────────────────────────────────────────────────────── */

export const fetchRoster = async (code = COACH_CODE) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/coach_athletes`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_code: code }),
  });
  if (res.status === 404) throw new Error("setup"); // supabase/coach.sql not run yet
  if (!res.ok) throw new Error(`coach_athletes ${res.status}`);
  return (await res.json()).map(toAthlete);
};

/*
  Who's coming to a session. The ONE place the list is decided.

  Today: every runner with app access (the whole club is expected on Friday).
  Wodify bookings plug in here later — fetch the Run Club class reservations
  for session.date and keep only the athletes who booked, e.g.
    const booked = await fetchWodifyBookings(session.date);   // names / phones
    return roster.filter((a) => booked.has(a.matchKey));
  `source` tells the screen which list it is showing.
*/
export const getSessionAttendees = async (session, { roster } = {}) => {
  const athletes = roster || (await fetchRoster());
  return { athletes, source: "roster" };
};

/* ── One runner, from a coach_athletes() row ─────────────────────────── */

const dateOf = (iso) => (iso ? String(iso).slice(0, 10) : null);

/* The newer of the website VMA and the one the phone reported */
const pickVma = (site, phone) => {
  const fromSite = site?.vma != null
    ? {
        value: Number(site.vma),
        date: dateOf((site.history || []).slice(-1)[0]?.at || site.updated_at),
        source: site.test_m ? "test" : "typed",
        testMetres: site.test_m || null,
      }
    : null;
  const fromPhone = phone?.value != null
    ? { value: Number(phone.value), date: phone.date || null, source: phone.source || "typed", testMetres: null }
    : null;
  if (!fromSite) return fromPhone;
  if (!fromPhone) return fromSite;
  return (fromPhone.date || "") >= (fromSite.date || "") ? fromPhone : fromSite;
};

/* Best time per distance: the questionnaire's, or a faster one logged in the app */
const pickBests = (typed = {}, logged = {}) => {
  const out = {};
  DISTANCES.forEach(({ id }) => {
    const times = [parseClock(typed[id] || ""), Number(logged[id]) || null].filter(Boolean);
    if (times.length) out[id] = Math.min(...times);
  });
  return out;
};

export const toAthlete = (row) => {
  const a = row.answers || {};
  const p = row.progress || {};
  const reported = !!p.at;
  const vma = pickVma(row.vma, p.vma);
  return {
    id: row.id,
    name: row.name || "",
    level: row.level || null,
    startWeek: row.start_week || null,
    vma: vma?.value ?? null,
    vmaDate: vma?.date ?? null,
    vmaSource: vma?.source ?? null,
    vmaTestMetres: vma?.testMetres ?? null,
    hrMax: row.vma?.hr_max || null,
    bests: pickBests(a.bests || {}, p.records || {}),
    sessionsDone: reported ? Object.keys(p.done || {}).length : null,
    raceGoal: p.raceGoal || null,
    myRace: p.raceGoal?.myRace || null,
    objectives: p.raceGoal?.objectives || [],
    goal: a.goal || null,
    races: a.races || "",
    injury: a.injury || null,
    injuryDetail: a.injuryDetail || "",
    reportedAt: dateOf(p.at),
  };
};

/* ── Grouping ────────────────────────────────────────────────────────── */

/* The order the session page lists them in */
export const LEVEL_ORDER = ["level1", "level2", "level3", "beginnerA", "beginnerB", "beginnerC"];

/* [{ id, name, athletes }] — empty levels left out; no level → "Sans niveau" at the end */
export const groupByLevel = (athletes) => {
  const groups = LEVEL_ORDER.map((id) => ({
    id,
    name: levelById(id).name,
    athletes: athletes.filter((a) => a.level === id),
  }));
  const known = new Set(LEVEL_ORDER);
  groups.push({ id: "none", name: "Sans niveau", athletes: athletes.filter((a) => !known.has(a.level)) });
  return groups
    .filter((g) => g.athletes.length)
    .map((g) => ({ ...g, athletes: [...g.athletes].sort((x, y) => x.name.localeCompare(y.name, "fr")) }));
};

export const isClubLevel = (id) => levels.some((l) => l.id === id && l.group === "club");

/* ── What a session asks of one runner ───────────────────────────────── */

/* Every run (or test) step of a list, repeats opened up (a 2 × 8 × rep appears 16 times) */
const runSteps = (steps = []) =>
  steps.flatMap((s) => {
    if (s.repeat) {
      const once = runSteps(s.steps);
      const rests = runSteps(s.rest ? [s.rest] : []);
      return [...Array(s.repeat).fill(once).flat(), ...Array(Math.max(s.repeat - 1, 0)).fill(rests).flat()];
    }
    return s.run !== undefined || s.test ? [s] : [];
  });

/*
  The targets for one runner in a session's main set, worked out from their VMA:
    [{ label: "1 km", reps: 5, target: "4:00", pace: "4:00 /km", pct: 90 }]
  One entry per different rep, with how many times it comes round. A VMA test
  shows the distance their current VMA predicts (the one to beat). Empty when
  there's no VMA or no reps.
*/
export const sessionTargets = (session, levelId, vma) => {
  if (!vma || !session || !isClubLevel(levelId)) return [];
  const counts = new Map();
  runSteps(planFor(session, levelId).main).forEach((s) => {
    const key = s.test ? `test@${s.test}` : `${s.run}@${s.vma}`;
    const seen = counts.get(key);
    if (seen) seen.reps += 1;
    else counts.set(key, { step: s, reps: 1 });
  });
  return [...counts.values()].map(({ step: s, reps }) => {
    if (s.test) {
      const seconds = toSeconds(s.test);
      return { label: `Test ${formatDuration(seconds)}`, reps: 1, target: `${Math.round(repDistance(seconds, vma, 100) / 10) * 10} m`, pace: "à battre", pct: 100 };
    }
    const pace = formatPace(paceFromSpeed(speedAt(vma, s.vma)));
    if (typeof s.run === "number") {
      return { label: formatDistance(s.run), reps, target: formatClock(repTime(s.run, vma, s.vma)), pace, pct: s.vma };
    }
    const seconds = toSeconds(s.run);
    return { label: formatDuration(seconds), reps, target: `${Math.round(repDistance(seconds, vma, s.vma) / 5) * 5} m`, pace, pct: s.vma };
  });
};

/* ── A session's structure in a line ─────────────────────────────────── */

const stepText = (step) => {
  if (step.repeat) {
    const inner = step.steps.map(stepText).join(" + ");
    const body = step.steps.length > 1 ? `(${inner})` : inner;
    return `${step.repeat} × ${body}${step.rest ? `, entre les séries ${stepText(step.rest)}` : ""}`;
  }
  if (step.run !== undefined) {
    const what = typeof step.run === "number" ? formatDistance(step.run) : formatDuration(toSeconds(step.run));
    return `${what} à ${step.vma} %`;
  }
  if (step.easy) return `${formatDuration(toSeconds(step.easy))} footing`;
  if (step.jog) return `${formatDuration(toSeconds(step.jog))} trot`;
  if (step.walk) return `${formatDuration(toSeconds(step.walk))} marche`;
  if (step.test) return `Test ${formatDuration(toSeconds(step.test))}`;
  if (step.drills) return "Gammes";
  return step.note || "";
};

/* "5 × 1000 m à 90 %, 2' marche" — a list of steps as one readable line */
export const structureLine = (steps = []) => steps.map(stepText).filter(Boolean).join(" · ") || "—";

/*
  The session laid out for the coach: shared warm-up, each club level's main
  set, cool-down. A level with its own warm-up gets it written in its line.
*/
export const sessionStructure = (session) => {
  const club = LEVEL_ORDER.filter(isClubLevel);
  const rows = [{ key: "warmup", label: "Échauffement", text: structureLine(session.warmup) }];
  club.forEach((id) => {
    const plan = planFor(session, id);
    const ownWarmup = plan.warmup !== session.warmup && plan.warmup?.length ? `${structureLine(plan.warmup)} · ` : "";
    rows.push({ key: id, label: levelById(id).name, text: `${ownWarmup}${structureLine(plan.main)}` });
  });
  rows.push({ key: "cooldown", label: "Retour au calme", text: structureLine(session.cooldown) });
  rows.push({ key: "beginner", label: "Débuter A/B/C", text: "Leur prochaine séance de marche-course (programme Débuter)" });
  return rows;
};

/* ── Athlete page helpers ────────────────────────────────────────────── */

export const formatVma = (vma) => (vma ? `${String(vma).replace(".", ",")} km/h` : "—");

/* "Test du 30/10/2026" / "Saisie le 12/10/2026" / "—" */
export const vmaDateLabel = (athlete) => {
  if (!athlete.vmaDate) return athlete.vma ? "Date inconnue" : "—";
  const [y, m, d] = athlete.vmaDate.split("-");
  const date = `${d}/${m}/${y}`;
  return athlete.vmaSource === "test" ? `Test du ${date}` : `Saisie le ${date}`;
};

const GOALS = Object.fromEntries((onboarding.find((q) => q.field === "goal")?.options || []).map((o) => [o.id, o.name]));

/* The runner's goal race: what they picked in the app, else their questionnaire goal */
export const goalLabel = (athlete) => {
  const g = athlete.raceGoal;
  if (g?.distance) {
    const d = goal.distances.find((x) => x.id === g.distance);
    const time = g.seconds ? ` en ${formatClock(g.seconds)}` : "";
    return `${goal.name} · ${d?.name || g.distance}${time}`;
  }
  return GOALS[athlete.goal] || "—";
};

/* The runner's own race: "Marathon de Rome · 22/03/2027 · Marathon en 3:30:00", or "—" */
export const myRaceLabel = (athlete) => {
  const r = athlete.myRace;
  if (!r?.name) return "—";
  const [y, m, d] = String(r.date || "").split("-");
  const date = d ? `${d}/${m}/${y}` : "";
  const time = r.seconds ? ` en ${formatClock(r.seconds)}` : "";
  return [r.name, date, r.metres ? `${distanceName(r.metres)}${time}` : ""].filter(Boolean).join(" · ");
};

/* Smaller objectives, one per line, ✓ when done; "—" when none */
export const objectivesLabel = (athlete) =>
  (athlete.objectives || []).length ? athlete.objectives.map((o) => `${o.done ? "✓ " : ""}${o.text}`).join("\n") : "—";

/* Personal bests as rows, "—" where unknown */
export const bestRows = (athlete) =>
  DISTANCES.map((d) => ({ id: d.id, name: d.name, time: athlete.bests[d.id] ? formatClock(athlete.bests[d.id]) : "—" }));

/* Training paces from the VMA — the profile's zones; empty without a VMA */
export const trainingPaces = (vma) =>
  vma ? ZONES.filter((z) => z.vma).map((z) => ({ id: z.id, name: z.name, pace: zonePace(vma, z.vma) })) : [];

export const injuryLabel = (athlete) => {
  if (athlete.injury === "yes") return athlete.injuryDetail || "Oui (pas de détail)";
  if (athlete.injury === "no") return "Aucune douleur signalée";
  return "—";
};
