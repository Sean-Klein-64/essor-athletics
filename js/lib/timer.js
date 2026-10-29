import { toSeconds, formatDuration } from "./paces";

/*
  The guided timer behind a Débuter session: the walk-run plan flattened
  into one timeline of intervals, and where you are in it at a given
  second. Pure — no clock in here, the screen owns that — so
  scripts/test_paces.js can check it.

  An interval: { kind: "walk" | "run", seconds, phase, label, set, sets }
    kind    what the body does — "run" covers easy/run steps, "walk" the rest
    phase   "warmup" | "main" | "cooldown"
    label   "Marche rapide", "Cours", "Marche"
    set     1-based repetition number inside a repeat (null outside one)
*/

const intervalOf = (step, phase, set = null, sets = null) => {
  if (step.easy || step.run) {
    return { kind: "run", seconds: toSeconds(step.easy || step.run), phase, label: "Cours", set, sets };
  }
  const t = step.walk || step.jog;
  if (!t) return null;
  return { kind: "walk", seconds: toSeconds(t), phase, label: step.note || "Marche", set, sets };
};

const flatten = (steps = [], phase) =>
  steps.flatMap((s) => {
    if (s.repeat) {
      return Array.from({ length: s.repeat }, (_, i) =>
        s.steps.map((inner) => intervalOf(inner, phase, i + 1, s.repeat)).filter(Boolean),
      ).flat();
    }
    const one = intervalOf(s, phase);
    return one ? [one] : [];
  });

/* A session plan ({ warmup, main, cooldown }) → its intervals in order */
export const timeline = (plan) => [
  ...flatten(plan.warmup, "warmup"),
  ...flatten(plan.main, "main"),
  ...flatten(plan.cooldown, "cooldown"),
];

export const totalOf = (intervals) => intervals.reduce((t, i) => t + i.seconds, 0);

/*
  Where an elapsed number of seconds lands:
    { index, interval, remaining, elapsedIn, done }
  Past the end → done: true with the last interval and remaining 0.
*/
export const positionAt = (intervals, elapsed) => {
  let start = 0;
  for (let index = 0; index < intervals.length; index++) {
    const interval = intervals[index];
    if (elapsed < start + interval.seconds) {
      return { index, interval, remaining: start + interval.seconds - elapsed, elapsedIn: elapsed - start, done: false };
    }
    start += interval.seconds;
  }
  const index = intervals.length - 1;
  return { index, interval: intervals[index] || null, remaining: 0, elapsedIn: intervals[index]?.seconds || 0, done: true };
};

/* "3/5" for the third of five repetitions, "" outside a repeat */
export const setLabel = (interval) => (interval?.set ? `${interval.set}/${interval.sets}` : "");

/* "Ensuite : 1' marche" — the interval after this one, or "Fin" */
export const nextLabel = (intervals, index) => {
  const n = intervals[index + 1];
  if (!n) return "Ensuite : fin de séance";
  return `Ensuite : ${formatDuration(n.seconds)} ${n.kind === "run" ? "course" : "marche"}`;
};

/* "12:34" — a countdown with minutes and seconds */
export const formatCountdown = (seconds) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/*
  Test day: during the test's long run block, a check-in every 5' —
  "Tu peux encore parler ?". The moments, in seconds from the session
  start, strictly inside the block (not at its start, not at its end).
*/
export const TALK_CHECK_EVERY = 300;
export const talkChecks = (intervals, every = TALK_CHECK_EVERY) => {
  const out = [];
  let start = 0;
  intervals.forEach((i) => {
    if (i.kind === "run" && i.phase === "main" && i.seconds > every) {
      for (let t = every; t < i.seconds; t += every) out.push(start + t);
    }
    start += i.seconds;
  });
  return out;
};

/* The check that elapsed just crossed (the last one ≤ elapsed and > previous), or null */
export const crossedCheck = (checks, previousElapsed, elapsed) => checks.find((c) => c > previousElapsed && c <= elapsed) ?? null;

/* "5'" / "10'" — how far into the run block a check is */
export const checkLabel = (intervals, checkAt) => {
  let start = 0;
  for (const i of intervals) {
    if (checkAt < start + i.seconds) return formatDuration(checkAt - start);
    start += i.seconds;
  }
  return "";
};

