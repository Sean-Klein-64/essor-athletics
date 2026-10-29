import goal from "./goal";
import { vmaRaceSeconds } from "./objectives";
import { formatClock, formatPace, racePace } from "./paces";

/*
  Mon plan de course, and Jour J.

  racePlan(race, vma): what to run on the day from the runner's goal time
  (or what their VMA says) — the pace, how to start (a touch slower),
  the km splits, the warm-up, and what to do if it goes wrong. Pure.

  raceDay(race, startTime): the day as a clock-following running order,
  counting back from the start — wake, breakfast, meet, dossard, warm-up,
  corral, start, finish, coffee. currentStep(steps, now) says where we
  are. Pure too; the screen owns the clock.
*/

/* ── The plan ────────────────────────────────────────────────────────── */

const EASE_IN_KM = 2; // the first kilometres, run a touch slower
const EASE_IN_SECONDS = 8; // per km

/*
  { seconds, source: "goal" | "vma" | null, pace, splits: [{ km, label, time, cumulative }],
    start, middle, finish, warmup: [...], ifWrong: [...] }
  seconds/pace null when there is neither a goal time nor a VMA.
*/
export const racePlan = (race, vma) => {
  const metres = race?.metres || null;
  const fromGoal = race?.seconds || null;
  const fromVma = metres ? vmaRaceSeconds(metres, vma) : null;
  const seconds = fromGoal || fromVma || null;
  const source = fromGoal ? "goal" : fromVma ? "vma" : null;
  if (!metres || !seconds) return { seconds: null, source, pace: null, splits: [], warmup: WARMUP, ifWrong: IF_WRONG, start: "", middle: "", finish: "" };

  const kms = metres / 1000;
  const pace = racePace(metres, seconds); // s/km, the average to hold
  const easeKm = Math.min(EASE_IN_KM, Math.floor(kms / 3));
  // the first kms a touch slower, the rest a touch faster so the total still lands on the goal
  const restKm = kms - easeKm;
  const fastBy = restKm > 0 ? (EASE_IN_SECONDS * easeKm) / restKm : 0;
  const splits = [];
  let cumulative = 0;
  for (let k = 1; k <= Math.ceil(kms); k++) {
    const length = Math.min(1, kms - (k - 1));
    const kmPace = k <= easeKm ? pace + EASE_IN_SECONDS : pace - fastBy;
    const time = kmPace * length;
    cumulative += time;
    splits.push({
      km: k,
      label: length < 1 ? `${kms.toFixed(1).replace(".", ",")} km` : `km ${k}`,
      time: formatClock(Math.round(time)),
      cumulative: formatClock(Math.round(cumulative)),
      pace: formatPace(Math.round(kmPace)),
      phase: k <= easeKm ? "start" : k > kms - Math.max(1, Math.round(kms * 0.2)) ? "finish" : "middle",
    });
  }
  return {
    seconds,
    source,
    pace: formatPace(Math.round(pace)),
    paceSeconds: pace,
    splits,
    start: `Les ${easeKm} premiers km à ${formatPace(Math.round(pace + EASE_IN_SECONDS))}, pas plus vite — tout le monde part trop vite.`,
    middle: `Puis ${formatPace(Math.round(pace - fastBy))} : régulier, relâché, tu doubles sans forcer.`,
    finish: `Les derniers ${Math.max(1, Math.round(kms * 0.2))} km : ce que tu as. Les bras, les genoux, la ligne.`,
    warmup: WARMUP,
    ifWrong: IF_WRONG,
  };
};

export const WARMUP = [
  { at: -45, text: "Arrivée sur place, dossard, dernières toilettes" },
  { at: -25, text: "10' de footing très facile" },
  { at: -12, text: "3 accélérations de 80 m, relâché, pas un sprint" },
  { at: -6, text: "Dans le sas, à ta place : derrière ceux qui visent plus vite que toi" },
];

export const IF_WRONG = [
  "Parti trop vite et ça pique au km 3 : ralentis de 10 s/km pendant 1 km, respire, repars.",
  "Point de côté : expire fort à chaque pose du pied du côté opposé, 30 s de marche si besoin.",
  "Un km raté n'annule pas la course. Tu recommences au suivant.",
  "Ça fait mal pour de vrai (pas « dur ») : tu t'arrêtes. Une course, ça se recourt.",
];

/* "Objectif 48:00 · 4:48 /km" with where it comes from */
export const planHeadline = (plan) => {
  if (!plan?.seconds) return "Ajoute ta VMA ou un objectif pour avoir ton plan d'allure.";
  return `${formatClock(plan.seconds)} · ${plan.pace}${plan.source === "vma" ? " · d'après ta VMA" : " · ton objectif"}`;
};

/* ── Jour J ──────────────────────────────────────────────────────────── */

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
};
const fromMinutes = (mins) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/* The club race's start time for a distance: published, or the placeholder (flagged) */
export const startTimeFor = (race) => {
  if (race?.kind !== "club") return { time: race?.start || null, confirmed: !!race?.start };
  const id = goal.distances.find((d) => d.metres === race.metres)?.id;
  const published = id ? goal.start?.[id] : null;
  return { time: published || goal.startPlaceholder, confirmed: !!published };
};

/*
  The running order for race day, counting back from the start:
    [{ at: "07:00", offset: -180, title, text, key }]
  `seconds` (goal time) places the finish; without it the finish is "~".
*/
export const raceDay = (race, startTime, seconds = null) => {
  const start = toMinutes(startTime);
  const finishMin = seconds ? Math.ceil(seconds / 60) : null;
  const steps = [
    { offset: -180, key: "wake", title: "Réveil", text: "Pas de grasse matinée : le corps aime savoir à quelle heure il court." },
    { offset: -170, key: "breakfast", title: "Petit-déjeuner", text: "Celui que tu connais, 3 h avant. Rien de nouveau aujourd'hui." },
    { offset: -75, key: "meet", title: "Rendez-vous Essor", text: goal.meet },
    { offset: -45, key: "arrive", title: "Sur place", text: "Dossard épinglé, toilettes, affaires au vestiaire. Un mot aux autres." },
    { offset: -25, key: "warmup", title: "Échauffement", text: "10' de footing très facile, tous ensemble, puis chacun ses 3 accélérations." },
    { offset: -6, key: "corral", title: "Dans le sas", text: "À ta place : derrière ceux qui visent plus vite. Montre à zéro." },
    { offset: 0, key: "start", title: "Départ", text: "Les 2 premiers km à ton allure de départ. Pas plus vite." },
  ];
  if (finishMin) {
    steps.push({ offset: finishMin, key: "finish", title: "Arrivée", text: "Marche 5 minutes. Ne t'assieds pas tout de suite. Trouve les autres." });
    steps.push({ offset: finishMin + 45, key: "coffee", title: "Café du club", text: "Tout le monde a fini : on raconte. Ajoute ton temps dans l'app." });
  } else {
    steps.push({ offset: 60, key: "finish", title: "Arrivée", text: "Marche 5 minutes. Ne t'assieds pas tout de suite. Trouve les autres." });
  }
  return steps.map((s) => ({ ...s, at: fromMinutes(start + s.offset) }));
};

/* Index of the step we're in at a clock time "HH:MM" (-1 before the first, last after the end) */
export const currentStep = (steps, nowHHMM) => {
  const now = toMinutes(nowHHMM);
  let index = -1;
  steps.forEach((s, i) => {
    if (toMinutes(s.at) <= now) index = i;
  });
  return index;
};

/* "dans 25 min" / "il y a 10 min" / "maintenant" */
export const relativeLabel = (stepAt, nowHHMM) => {
  const diff = toMinutes(stepAt) - toMinutes(nowHHMM);
  if (diff === 0) return "maintenant";
  const abs = Math.abs(diff);
  const text = abs >= 60 ? `${Math.floor(abs / 60)} h${abs % 60 ? ` ${String(abs % 60).padStart(2, "0")}` : ""}` : `${abs} min`;
  return diff > 0 ? `dans ${text}` : `il y a ${text}`;
};
