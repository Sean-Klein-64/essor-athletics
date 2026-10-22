import sessions from "./sessions";
import {
  repTime,
  repDistance,
  toSeconds,
  formatClock,
  formatPace,
  formatDuration,
  formatDistance,
  paceFromSpeed,
  speedAt,
  zonePace,
  zoneById,
} from "./paces";

/*
  Turns a session (js/lib/sessions.js) into what one runner sees:
  their level's warm-up / main set / cool-down, with every rep worked out
  from their VMA. Pure functions — tested by scripts/test_paces.js.
*/

const DRILLS_SECONDS = 5 * 60; // what "Gammes" counts for in the total
const FALLBACK_VMA = 12; // only for estimating a total when there's no VMA yet

/* The three parts of a session for one level */
export const planFor = (session, levelId) => {
  const own = session.levels?.[levelId];
  if (own && !Array.isArray(own)) {
    return {
      warmup: own.warmup ?? session.warmup ?? [],
      main: own.main ?? [],
      cooldown: own.cooldown ?? session.cooldown ?? [],
    };
  }
  return {
    warmup: session.warmup ?? [],
    main: own ?? [],
    cooldown: session.cooldown ?? [],
  };
};

/* Seconds a step takes (estimated for distance reps) */
export const stepSeconds = (step, vma) => {
  const v = vma || FALLBACK_VMA;
  if (step.repeat) {
    const once = step.steps.reduce((t, s) => t + stepSeconds(s, vma), 0);
    const rest = step.rest ? stepSeconds(step.rest, vma) : 0;
    return step.repeat * once + (step.repeat - 1) * rest;
  }
  if (step.drills) return DRILLS_SECONDS;
  if (step.run !== undefined) {
    return typeof step.run === "number" ? repTime(step.run, v, step.vma) : toSeconds(step.run);
  }
  const timed = step.easy ?? step.jog ?? step.walk ?? step.test;
  return timed ? toSeconds(timed) : 0;
};

/* Whole session for a level, in seconds */
export const totalSeconds = (session, levelId, vma) => {
  const { warmup, main, cooldown } = planFor(session, levelId);
  return [...warmup, ...main, ...cooldown].reduce((t, s) => t + stepSeconds(s, vma), 0);
};

/* "≈ 55 min" */
export const totalLabel = (session, levelId, vma) =>
  `≈ ${Math.round(totalSeconds(session, levelId, vma) / 300) * 5} min`;

/*
  One step → one row for the screen:
    { kind, title, meta?, target?, sub?, note?, children?, rest? }
  `target` is the big number on the right (time or distance to hit).
*/
export const describeStep = (step, vma) => {
  const note = step.note;
  if (step.repeat) {
    return {
      kind: "repeat",
      title: `${step.repeat} ×`,
      children: step.steps.map((s) => describeStep(s, vma)),
      rest: step.rest ? describeStep(step.rest, vma) : undefined,
      note,
    };
  }
  if (step.run !== undefined) {
    const meta = `${step.vma} % VMA`;
    const pace = vma ? formatPace(paceFromSpeed(speedAt(vma, step.vma))) : undefined;
    if (typeof step.run === "number") {
      return {
        kind: "run",
        title: formatDistance(step.run),
        meta,
        target: vma ? formatClock(repTime(step.run, vma, step.vma)) : undefined,
        sub: pace,
        note,
      };
    }
    const seconds = toSeconds(step.run);
    return {
      kind: "run",
      title: formatDuration(seconds),
      meta,
      target: vma ? `${Math.round(repDistance(seconds, vma, step.vma) / 5) * 5} m` : undefined,
      sub: pace,
      note,
    };
  }
  if (step.easy) {
    return {
      kind: "easy",
      title: `${formatDuration(toSeconds(step.easy))} footing`,
      sub: vma ? `General Aerobic · ${zonePace(vma, zoneById("ga").vma)}` : "Allure facile, tu peux parler",
      note,
    };
  }
  if (step.jog) {
    return { kind: "jog", title: `${formatDuration(toSeconds(step.jog))} récup trottinée`, note };
  }
  if (step.walk) {
    return { kind: "walk", title: `${formatDuration(toSeconds(step.walk))} marche`, note };
  }
  if (step.test) {
    return {
      kind: "test",
      title: `${formatDuration(toSeconds(step.test))} test`,
      sub: "Le plus loin possible — note ta distance",
      note,
    };
  }
  if (step.drills) return { kind: "drills", title: "Gammes", sub: step.drills, note };
  return { kind: "note", title: note || "" };
};

/* ── Dates ─────────────────────────────────────────────────────────────── */

const DAYS = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/* Today as "YYYY-MM-DD" in local time */
export const todayKey = (now = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/* "2026-10-30" → "Ven. 30 oct." */
export const formatDay = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAYS[date.getDay()]} ${d} ${MONTHS[m - 1]}`;
};

/* "2026-10-30" → "30/10/2026" */
export const formatShortDate = (key) => {
  if (!key) return "date inconnue";
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
};

/* Next session (today counts), the ones after it, and past ones newest first */
export const splitSessions = (today = todayKey(), list = sessions) => {
  const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : 1));
  const coming = sorted.filter((s) => s.date >= today);
  return {
    next: coming[0],
    upcoming: coming.slice(1),
    past: sorted.filter((s) => s.date < today).reverse(),
  };
};

/* Built-in sessions only — the app uses useSessions().byId (js/lib/store.js) */
export const sessionById = (id) => sessions.find((s) => s.id === id);
