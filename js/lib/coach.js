import { SUPABASE_URL, SUPABASE_ANON_KEY, COACH_CODE } from "./config";
import levels, { levelById } from "./levels";
import { programmeSessions, sessionLabel, PROGRAMMES } from "./beginner";
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
    phone: row.phone || null,
    level: row.level || null,
    startWeek: row.start_week || null,
    vma: vma?.value ?? null,
    vmaDate: vma?.date ?? null,
    vmaSource: vma?.source ?? null,
    vmaTestMetres: vma?.testMetres ?? null,
    hrMax: row.vma?.hr_max || null,
    bests: pickBests(a.bests || {}, p.records || {}),
    sessionsDone: reported ? Object.keys(p.done || {}).length : null,
    programme: p.programme || null, // Débuter: { index, lastAt, return } — see beginnerReport in js/lib/member.js
    done: p.done || {}, // { sessionId: "2026-11-06" }
    logs: p.logs || {}, // { sessionId: { at, pace, feel, note } } — js/lib/log.js
    raceGoal: p.raceGoal || null,
    myRace: p.raceGoal?.myRace || null,
    objectives: p.raceGoal?.objectives || [],
    goal: a.goal || null,
    kmWeek: a.kmWeek || null, // average km/week over the last 3 months, from the questionnaire
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

/* ── Débuter runners ─────────────────────────────────────────────────── */

const daysAgo = (key, today) => {
  if (!key) return null;
  const [y1, m1, d1] = key.split("-").map(Number);
  const [y2, m2, d2] = today.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
};

/*
  "Séance 7/18 · dernière il y a 12 j · a reculé d'une semaine" — where a
  Débuter runner is, for the hub card. "" for club levels or before the
  phone has reported.
*/
export const beginnerLine = (athlete, today) => {
  const p = athlete.programme;
  if (!p || isClubLevel(athlete.level)) return "";
  const parts = [`Séance ${Math.min(p.index, 17) + 1}/18`];
  const days = daysAgo(p.lastAt, today);
  if (days === null) parts.push("pas encore de séance marquée");
  else if (days === 0) parts.push("dernière aujourd'hui");
  else parts.push(`dernière il y a ${days} j`);
  const r = p.return;
  if (r && daysAgo(r.at, today) <= 14) {
    const what = { repeat: "a refait la dernière", back: "a reculé d'une semaine", restart: "a repris le niveau du début" }[r.action];
    parts.push(r.accepted ? `${what} après ${r.days} j` : `a continué malgré ${r.days} j sans séance`);
  }
  return parts.join(" · ");
};

/* Débuter runners who haven't marked a session for over a week — the coach's nudge list */
export const quietBeginners = (athletes, today, after = 7) =>
  athletes.filter((a) => a.programme && !isClubLevel(a.level) && a.programme.lastAt && daysAgo(a.programme.lastAt, today) > after);

/*
  The walk-run a Débuter runner does at the club tonight: their next
  programme session. { label: "5×(2'/1')", week, index, test } or null.
  (3 sessions a week assumed — the phone's 2/3 choice isn't reported.)
*/
export const beginnerTonight = (athlete) => {
  const p = athlete.programme;
  if (!p || !PROGRAMMES[athlete.level]) return null;
  const list = programmeSessions(athlete.level, p.perWeek === 2 ? 2 : 3);
  const s = list.find((x) => x.index >= Math.min(p.index, 17)) || list[list.length - 1];
  return s ? { label: sessionLabel(s), week: s.week, index: s.index, test: !!s.test, minutes: s.sets * s.run } : null;
};

/*
  One line of status for the Débutants view:
    "quiet"     no session marked for over 7 days (the nudge list)
    "back"      came back after a gap in the last 14 days
    "test"      their next session is the end-of-level test
    "new"       nothing marked yet
    "on"        training as planned
*/
export const beginnerStatus = (athlete, today) => {
  const p = athlete.programme;
  if (!p) return { id: "new", text: "Pas encore de séance marquée dans l'app" };
  const days = daysAgo(p.lastAt, today);
  if (days === null) return { id: "new", text: "Pas encore de séance marquée dans l'app" };
  if (days > 7) return { id: "quiet", text: `Silence depuis ${days} jours — un message ?` };
  const r = p.return;
  if (r && daysAgo(r.at, today) <= 14) return { id: "back", text: r.accepted ? `De retour après ${r.days} j, a repris plus bas` : `De retour après ${r.days} j, a continué` };
  const tonight = beginnerTonight(athlete);
  if (tonight?.test) return { id: "test", text: `Prêt·e pour le test de fin de ${levelById(athlete.level).name}` };
  return { id: "on", text: `Dans le rythme · dernière il y a ${days} j` };
};

/* The group in numbers: { total, active, quiet, tests, byLevel: { beginnerA: n, … } } */
export const beginnerSummary = (athletes, today) => {
  const list = athletes.filter((a) => PROGRAMMES[a.level]);
  const statuses = list.map((a) => beginnerStatus(a, today).id);
  return {
    total: list.length,
    active: statuses.filter((s) => s === "on" || s === "back" || s === "test").length,
    quiet: statuses.filter((s) => s === "quiet").length,
    tests: statuses.filter((s) => s === "test").length,
    byLevel: Object.fromEntries(Object.keys(PROGRAMMES).map((id) => [id, list.filter((a) => a.level === id).length])),
  };
};

/*
  The one number for a beginner: how long they run without stopping right
  now, against the 30' that ends Débuter C. From their next session's
  longest run block. { minutes, target: 30, pct } — null off the programmes.
*/
export const BEGINNER_TARGET = 30;
export const beginnerProgress = (athlete) => {
  const p = athlete.programme;
  if (!p || !PROGRAMMES[athlete.level]) return null;
  const list = programmeSessions(athlete.level, p.perWeek === 2 ? 2 : 3);
  const s = list.find((x) => x.index >= Math.min(p.index, 17)) || list[list.length - 1];
  const minutes = s ? s.run : 0; // the run block of the session they're on (1' … 30')
  return { minutes, target: BEGINNER_TARGET, pct: Math.min(1, minutes / BEGINNER_TARGET) };
};

/*
  Consistency over the last 3 weeks from the dates the phone reported:
  { perWeek: 2.3, weeks: [n, n, n] (oldest first), label }
*/
export const beginnerConsistency = (athlete, today) => {
  const recent = athlete.programme?.recent || [];
  const weeks = [0, 0, 0];
  recent.forEach((at) => {
    const d = daysAgo(at, today);
    if (d === null || d < 0 || d >= 21) return;
    weeks[2 - Math.floor(d / 7)] += 1;
  });
  const total = weeks.reduce((t, n) => t + n, 0);
  const perWeek = Math.round((total / 3) * 10) / 10;
  const wanted = athlete.programme?.perWeek || 3;
  const label = total === 0 ? "aucune séance sur 3 semaines" : `${perWeek.toString().replace(".", ",")} séance${perWeek >= 2 ? "s" : ""}/semaine sur 3 semaines (objectif ${wanted})`;
  return { perWeek, weeks, wanted, label };
};

/*
  At their current rhythm, how many weeks to the end of Débuter C (30'
  continuous). Sessions left across the remaining programmes ÷ sessions
  per week actually done (floor 1). null without a rhythm yet.
*/
export const weeksToThirty = (athlete, today) => {
  const p = athlete.programme;
  if (!p || !PROGRAMMES[athlete.level]) return null;
  const order = ["beginnerA", "beginnerB", "beginnerC"];
  const perWeek = p.perWeek === 2 ? 2 : 3;
  const here = order.indexOf(athlete.level);
  const left = programmeSessions(athlete.level, perWeek).filter((s) => s.index >= Math.min(p.index, 17)).length
    + order.slice(here + 1).reduce((t, id) => t + programmeSessions(id, perWeek).length, 0);
  const rhythm = beginnerConsistency(athlete, today).perWeek;
  if (!rhythm) return null;
  return Math.ceil(left / Math.max(1, rhythm));
};

/* The nudge, in Sean's voice — short, relaxed, French. { body, phone } — the screen builds the sms: link (iOS and Android differ). */
export const nudgeMessage = (athlete, today) => {
  const first = (athlete.name || "").trim().split(" ")[0] || "";
  const days = daysAgo(athlete.programme?.lastAt, today);
  const tonight = beginnerTonight(athlete);
  const body = `Salut ${first} ! ${days ? `Ça fait ${days} jours sans séance de ton côté, ` : ""}tout va bien ? ${tonight ? `La prochaine c'est ${tonight.label}, tranquille. ` : ""}Si tu as besoin d'adapter, dis-moi. Sean`;
  return { body, phone: athlete.phone ? String(athlete.phone).replace(/\s+/g, "") : null };
};

