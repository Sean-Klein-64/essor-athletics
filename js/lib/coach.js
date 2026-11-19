import { COACH_CODE } from "./config";
import { rpc } from "./supabase";
import levels, { levelById } from "./levels";
import { planFor, formatDay } from "./plan";
import { clubHistory, beginnerPosition, feelById } from "./history";
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
  let rows;
  try {
    rows = await rpc("coach_athletes", { p_code: code });
  } catch (e) {
    if (e.status === 404) throw new Error("setup"); // supabase/coach.sql not run yet
    throw e;
  }
  return rows.map(toAthlete);
};

/*
  Wodify, as the coach page on the site sees it: coach_wodify() in Supabase
  (supabase/coach_page.sql) holds one snapshot of the Run Club class,
    { sessions: { "2026-11-20": { booked: [names] }, "2026-11-13": { attended: [names] } } }
  read off Wodify ("Signed in" = present). Null when there's none yet.
*/
export const fetchWodify = async (code = COACH_CODE) => {
  try {
    const res = await rpc("coach_wodify", { p_code: code });
    const data = res?.data || null;
    if (!data) return null;
    const sessions = data.sessions || (data.session_date ? { [data.session_date]: { booked: data.booked || [] } } : {});
    return { sessions, updatedAt: res.updated_at || null };
  } catch {
    return null; // no snapshot (or not set up): the screens fall back to the roster
  }
};

/* Roster + Wodify together, kept for a minute so going back and forth doesn't refetch */
let cache = null;
export const loadCoachData = async ({ force } = {}) => {
  if (!force && cache && Date.now() - cache.at < 60000) return cache.data;
  const [roster, wodify] = await Promise.all([fetchRoster(), fetchWodify()]);
  cache = { at: Date.now(), data: { roster, wodify } };
  return cache.data;
};

/* ── Names: Wodify spells them its own way ───────────────────────────── */

/* "hugo DELPLAN" → "Hugo Delplan", "marie-laure" → "Marie-Laure", "d'addario" → "D'Addario" */
export const nameCase = (t) =>
  String(t || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|[\s\-'’(])([a-zà-öø-ÿœ])/g, (m, a, b) => a + b.toUpperCase()); // no \p{…}: keep the regex Hermes-safe

const keyOf = (t) =>
  String(t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/* The roster entry a Wodify name belongs to: exact, then first + last name, then a short first name ("Flo" = Florent) */
export const matchName = (athletes, name) => {
  const k = keyOf(name);
  if (!k) return null;
  const parts = k.split(" ");
  const first = parts[0];
  const last = parts[parts.length - 1];
  const words = (a) => keyOf(a.name).split(" ");
  return (
    athletes.find((a) => keyOf(a.name) === k) ||
    athletes.find((a) => { const p = words(a); return p[0] === first && p[p.length - 1] === last; }) ||
    athletes.find((a) => { const p = words(a); return parts.length > 1 && p.includes(first) && p.includes(last); }) ||
    athletes.find((a) => { const p = words(a); return parts.length > 1 && p[p.length - 1] === last && (p[0].startsWith(first) || first.startsWith(p[0])); }) ||
    null
  );
};

/* A session is "past" from 19:00 on its day */
export const isPastSession = (session, now = new Date()) => {
  const today = todayKeyOf(now);
  return session.date < today || (session.date === today && now.getHours() >= 19);
};
const todayKeyOf = (now) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

/* The Wodify list for one session: who was there once it's past (attended), who booked before */
export const wodifyList = (wodify, session) => {
  const rec = wodify?.sessions?.[session?.date];
  if (!rec) return null;
  const past = isPastSession(session);
  const list = past ? rec.attended || rec.booked : rec.booked;
  return Array.isArray(list) ? { names: list, kind: past && rec.attended ? "present" : "booked" } : null;
};

/*
  Who's coming to a session. The ONE place the list is decided.
  With a Wodify list for that date: the runners on it (and the Wodify names
  with no questionnaire, as `extras`). Without: every Level 1–3 runner.
  `source` tells the screen which list it is showing.
*/
export const getSessionAttendees = async (session, { roster, wodify } = {}) => {
  const data = roster ? { roster, wodify } : await loadCoachData();
  const list = wodifyList(data.wodify, session);
  if (list) {
    const athletes = [];
    const extras = [];
    list.names.forEach((n) => {
      const a = matchName(data.roster, n);
      if (a && !athletes.includes(a)) athletes.push(a);
      else if (!a) extras.push(nameCase(n));
    });
    return { athletes, extras, source: list.kind, roster: data.roster, wodify: data.wodify };
  }
  return { athletes: data.roster.filter((a) => isClubLevel(effectiveLevel(a))), extras: [], source: "roster", roster: data.roster, wodify: data.wodify };
};

/*
  One runner across the cycle, from Wodify:
    [{ session, status }]  status: present | absent | booked | notBooked | noList | future
*/
export const wodifyAttendance = (athlete, sessions, wodify) =>
  [...sessions]
    .sort((x, y) => (x.date < y.date ? -1 : 1))
    .map((session) => {
      const rec = wodify?.sessions?.[session.date] || {};
      const past = isPastSession(session);
      const on = (names) => names.some((n) => matchName([athlete], n));
      if (Array.isArray(rec.attended)) return { session, status: on(rec.attended) ? "present" : "absent" };
      if (!past && Array.isArray(rec.booked)) return { session, status: on(rec.booked) ? "booked" : "notBooked" };
      return { session, status: past ? "noList" : "future" };
    });

export const ATTENDANCE_LABEL = { present: "Présent", absent: "Absent", booked: "Réservé", notBooked: "Pas réservé", noList: "Pas de liste", future: "À venir" };

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
    name: nameCase(row.name),
    level: row.level || null,
    startWeek: row.start_week || null,
    vma: vma?.value ?? null,
    vmaDate: vma?.date ?? null,
    vmaSource: vma?.source ?? null,
    vmaTestMetres: vma?.testMetres ?? null,
    hrMax: row.vma?.hr_max || null,
    bests: pickBests(a.bests || {}, p.records || {}),
    sessionsDone: reported ? Object.keys(p.done || {}).length : null,
    done: p.done || {},
    beginnerDone: p.beginnerDone || {},
    programme: p.programme || {},
    phoneLevel: p.level || null, // the level the phone is on (a Débuter test passed in the app moves it up)
    beginnerSessions: p.beginnerSessions || null,
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

/* ── What a runner has done ──────────────────────────────────────────── */

/* The level to show the coach: what the phone reports if it has, else the roster's */
export const effectiveLevel = (athlete) => athlete.phoneLevel || athlete.level;

/*
  Club sessions for one runner, newest first, up to today:
    { session, entry: { at, feel, note } | null, status: "done" | "missed" }
*/
export const athleteSessions = (athlete, sessions, today) => clubHistory(sessions, athlete.done, today);

/* Where a Débuter runner is: beginnerPosition() from what their phone reported, or from start_week */
export const athleteBeginner = (athlete) => {
  const level = effectiveLevel(athlete);
  if (!isBeginnerLevel(level)) return null;
  const perWeek = athlete.beginnerSessions === 2 ? 2 : 3;
  const state = athlete.programme && Object.keys(athlete.programme).length ? athlete.programme : athlete.startWeek ? { [level]: (Math.min(Math.max(athlete.startWeek, 1), 6) - 1) * 3 } : {};
  return beginnerPosition(level, state, perWeek);
};

/* "3 / 4 séances · dernière le 13/11 (Juste bien)" — one line for a card */
export const attendanceLine = (athlete, sessions, today) => {
  if (!athlete.reportedAt) return "Rien reçu de son téléphone";
  const list = athleteSessions(athlete, sessions, today);
  const done = list.filter((x) => x.status === "done");
  if (!list.length) return "Première séance à venir";
  const last = done[0];
  const feel = last?.entry?.feel ? ` (${feelById(last.entry.feel)?.name})` : "";
  return `${done.length} / ${list.length} séances${last ? ` · dernière ${formatDay(last.session.date)}${feel}` : ""}`;
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
export const isBeginnerLevel = (id) => levels.some((l) => l.id === id && l.group === "beginner");

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

/* ── Pace groups: who can run the reps together ─────────────────────── */

/* The first fast rep of a level's main set: { run, vma } */
const firstRep = (session, levelId) => runSteps(planFor(session, levelId).main).find((s) => s.run !== undefined) || null;

/* "1:31" for 400 m, "130 m" for 30" — one rep at one VMA */
export const repTarget = (rep, vma) =>
  typeof rep.run === "number" ? formatClock(repTime(rep.run, vma, rep.vma)) : `${Math.round(repDistance(toSeconds(rep.run), vma, rep.vma) / 10) * 10} m`;
export const repLabel = (rep) => (typeof rep.run === "number" ? formatDistance(rep.run) : formatDuration(toSeconds(rep.run)));

/*
  Level 1–3 runners with a VMA, fastest first, cut into packs: a new pack when
  the gap to the pack's fastest passes 0.8 km/h.
    [{ athletes, vmaLow, vmaHigh, rep: "400 m", target: "1:30 – 1:32" }]
*/
export const paceGroups = (athletes, session) => {
  const packs = [];
  athletes
    .filter((a) => a.vma && isClubLevel(effectiveLevel(a)))
    .sort((x, y) => y.vma - x.vma || x.name.localeCompare(y.name, "fr"))
    .forEach((a) => {
      const g = packs[packs.length - 1];
      if (g && g[0].vma - a.vma <= 0.8) g.push(a);
      else packs.push([a]);
    });
  return packs.map((g) => {
    const rep = session ? firstRep(session, effectiveLevel(g[0])) || firstRep(session, "level2") : null;
    const fast = rep ? repTarget(rep, g[0].vma) : null;
    const slow = rep ? repTarget(rep, g[g.length - 1].vma) : null;
    return { athletes: g, vmaHigh: g[0].vma, vmaLow: g[g.length - 1].vma, rep: rep ? repLabel(rep) : null, target: fast ? (fast === slow ? fast : `${fast} – ${slow}`) : null };
  });
};

/*
  A level's main set as blocks for the session card:
    [{ reps: 5, what: "400 m", items: ["400 m", …], rec: "1' marche" } | { rest: "3' marche" }]
*/
export const sessionBlocks = (session, levelId) => {
  const main = planFor(session, levelId).main;
  const pause = (x) => toSeconds(x.walk || x.jog || 0) || 0;
  const recText = (x) => (x.walk ? `${formatDuration(toSeconds(x.walk))} marche` : x.jog ? `${formatDuration(toSeconds(x.jog))} trot` : "");
  const runs = (steps) => steps.filter((x) => x.run !== undefined);
  const recOf = (steps, rest) => { const r = rest || steps.find((x) => x.jog || x.walk); return r ? recText(r) : ""; };
  const block = (items, rec) => ({ reps: items.length, what: new Set(items).size === 1 ? items[0] : "répétitions", items, rec });
  const out = [];
  const loose = main.filter((x) => !x.repeat && x.run === undefined && pause(x));
  const short = loose.length ? Math.min(...loose.map(pause)) : 0;
  const hasLonger = loose.some((x) => pause(x) > short);
  let cur = null;
  main.forEach((st) => {
    if (!st.repeat) {
      if (st.run !== undefined) {
        if (!cur) out.push((cur = { items: [], rec: "" }));
        cur.items.push(repLabel(st));
      } else if (cur && pause(st) === short && (hasLonger || !main.some((x) => x.repeat))) cur.rec = recText(st);
      else if (st.test) out.push({ rest: `Test ${formatDuration(toSeconds(st.test))}` });
      else { cur = null; if (pause(st)) out.push({ rest: recText(st) }); }
      return;
    }
    cur = null;
    const inner = st.steps;
    const nested = inner.length === 1 && inner[0].repeat;
    if (nested || runs(inner).length > 1) {
      for (let i = 0; i < st.repeat; i++) {
        if (i && st.rest) out.push({ rest: recText(st.rest) });
        if (nested) out.push(block(Array(inner[0].repeat).fill(runs(inner[0].steps).map(repLabel).join(" + ")), recOf(inner[0].steps, inner[0].rest)));
        else out.push(block(runs(inner).map(repLabel), recOf(inner)));
      }
    } else out.push(block(Array(st.repeat).fill(runs(inner).map(repLabel).join(" + ")), recOf(inner, st.rest)));
  });
  return out.map((b) => (b.items && !b.reps ? block(b.items, b.rec) : b));
};

/* Fast volume of a level's main set, in metres */
export const fastVolume = (session, levelId) => runSteps(planFor(session, levelId).main).reduce((t, s) => t + (typeof s.run === "number" ? s.run : 0), 0);

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
