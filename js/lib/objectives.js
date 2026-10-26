import goal from "./goal";
import { repTime, formatClock, racePace, formatPace } from "./paces";
import { todayKey } from "./plan";

/*
  Personal objectives — on top of the club's race, each runner can set:
    preferences.myRace      their own race: { name, place, date, metres, seconds, photoQuery }
                            (seconds = goal time, optional; photoQuery = words for the photo search, optional)
    preferences.objectives  smaller goals: [{ id, text, done }]  ("Courir 30' sans m'arrêter", "Sub 25 au 5 km"…)

  The club race (js/lib/goal.js) stays everyone's default. The countdown on
  Home follows the runner's own race when they have one coming up.
  Club sessions don't change — an objective changes the targets, not the programme.
*/

export const RACE_DISTANCES = [
  { id: "5k", name: "5 km", metres: 5000, record: "5k" },
  { id: "10k", name: "10 km", metres: 10000, record: "10k" },
  { id: "half", name: "Semi", metres: 21097.5, record: "half" },
  { id: "marathon", name: "Marathon", metres: 42195, record: "marathon" },
];

export const distanceName = (metres) => {
  const known = RACE_DISTANCES.find((d) => Math.abs(d.metres - metres) < 1);
  if (known) return known.id === "half" ? "Semi-marathon" : known.name;
  return `${String(Math.round(metres / 100) / 10).replace(".", ",")} km`;
};

/* The record distance a race time counts for (js/lib/records.js), or null */
export const recordIdFor = (metres) => RACE_DISTANCES.find((d) => Math.abs(d.metres - metres) < 1)?.record || null;

/*
  % VMA a runner can hold over a distance — the Profile's predictions
  (5 km 95, 10 km 90, semi 85, marathon 80), joined in a line between them.
*/
const CURVE = [
  [3000, 98],
  [5000, 95],
  [10000, 90],
  [21097.5, 85],
  [42195, 80],
];
export const vmaShare = (metres) => {
  if (metres <= CURVE[0][0]) return CURVE[0][1];
  for (let i = 1; i < CURVE.length; i++) {
    const [m1, p1] = CURVE[i - 1];
    const [m2, p2] = CURVE[i];
    if (metres <= m2) return Math.round((p1 + ((metres - m1) / (m2 - m1)) * (p2 - p1)) * 10) / 10;
  }
  return 75; // past the marathon
};

/* What the VMA says for a race distance — seconds, or null */
export const vmaRaceSeconds = (metres, vma) => (vma && metres ? repTime(metres, vma, vmaShare(metres)) : null);

/* "45:00 · 4:30 /km" */
export const goalLine = (metres, seconds) => (seconds ? `${formatClock(seconds)} · ${formatPace(racePace(metres, seconds))}` : "");

/* "15/11/2026" → "2026-11-15" (any date, past or future), or null */
export const parseDayKey = (text) => {
  const m = String(text || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

/* Whole days from today to a "YYYY-MM-DD" (negative once it's gone) */
export const daysBetween = (today, date) => {
  const [y, m, d] = date.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
};

/* How long a race stays on Home after it's run — time to log the result */
export const AFTER_DAYS = 14;

/*
  The race the countdown follows:
    the runner's own race if it's coming up (or just run),
    else the club race (club levels only — Débuter runners have their 30' first).
  { kind: "mine" | "club", name, place, date, metres, seconds, photoQuery, days }
*/
export const countdownRace = (p, today = todayKey(), { clubLevel = true } = {}) => {
  const mine = p.myRace;
  if (mine?.date && daysBetween(today, mine.date) >= -AFTER_DAYS) {
    return { kind: "mine", ...mine, days: daysBetween(today, mine.date) };
  }
  if (!clubLevel) return null;
  const days = daysBetween(today, goal.date);
  if (days < -AFTER_DAYS) return null;
  const chosen = goal.distances.find((d) => d.id === p.raceGoal?.distance);
  return {
    kind: "club",
    name: goal.name,
    place: goal.place,
    date: goal.date,
    metres: chosen?.metres || null,
    seconds: chosen ? p.raceGoal?.seconds || null : null,
    photoQuery: goal.photoQuery,
    days,
  };
};

/*
  Where the runner is with the race:
    "build"     more than a week to go
    "raceweek"  the last 7 days — taper and checklist
    "raceday"   today
    "after"     run in the last two weeks — log the time, pick the next goal
*/
export const racePhase = (days) => (days < 0 ? "after" : days === 0 ? "raceday" : days <= 7 ? "raceweek" : "build");

/*
  The club Fridays leading to the race, as dots on the card.
  [{ id, date, passed }] — sessions on or before race day; passed = before today.
  Empty for a race more than 12 Fridays away (dots stop meaning anything).
*/
export const cycleDots = (sessions, race, today = todayKey()) => {
  if (!race) return [];
  const list = (sessions || [])
    .filter((s) => s.date && s.date <= race.date && daysBetween(s.date, race.date) <= 84)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((s) => ({ id: s.id, date: s.date, passed: s.date < today }));
  return list.length >= 2 && list.length <= 12 ? list : [];
};

/* "semaine 3/8" from the dots, or "" */
export const cycleLabel = (dots) => {
  if (!dots.length) return "";
  const passed = dots.filter((d) => d.passed).length;
  return `semaine ${Math.min(passed + 1, dots.length)}/${dots.length}`;
};

/* "dans 8 semaines" for a race too far away for dots */
export const weeksLabel = (days) => (days >= 14 ? `dans ${Math.floor(days / 7)} semaines` : days > 1 ? `dans ${days} jours` : "");

/* Race week */
export const TAPER_NOTE =
  "Semaine d'affûtage : moins de volume, un peu de rythme pour garder les jambes vives, rien de nouveau. Dors, mange comme d'habitude, bois bien.";

export const RACE_CHECKLIST = [
  { id: "bib", text: "Dossard retiré (et les épingles)" },
  { id: "kit", text: "Tenue et chaussures déjà testées à l'entraînement" },
  { id: "plan", text: "Allure de départ notée — partir sur l'objectif, pas plus vite" },
  { id: "travel", text: "Trajet et heure d'arrivée prévus (30' avant le départ)" },
  { id: "warmup", text: "Échauffement : 10' footing + 3 accélérations" },
  { id: "breakfast", text: "Petit-déjeuner connu, 3 h avant" },
];

/* Key for "this race" in per-race state (checklist ticks, photos) */
export const raceKey = (race) => (race ? `${race.kind}:${race.date}:${race.name}` : "");

/* Ideas shown when the list of objectives is empty */
export const OBJECTIVE_IDEAS = [
  "Courir 30' sans m'arrêter",
  "Passer sous les 25' au 5 km",
  "Courir 3 fois par semaine",
  "Gagner 1 km/h de VMA",
];

export const newObjective = (text) => ({
  id: `o-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  text: text.trim(),
  done: false,
});

/*
  What goes to the coaches with the progress report (js/lib/member.js).
  Sent inside raceGoal so it reaches the Coach Session Hub with no change to
  the database: { distance, seconds, myRace, objectives }.
*/
export const goalsReport = (p) => {
  const myRace = p.myRace || null;
  const objectives = (p.objectives || []).map(({ text, done }) => ({ text, done: !!done }));
  if (!p.raceGoal && !myRace && !objectives.length) return null;
  return { ...(p.raceGoal || {}), myRace, objectives };
};
