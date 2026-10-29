import { planFor } from "./plan";
import levels from "./levels";
import { repDistance, repTime, toSeconds, formatClock, formatPace, parseClock } from "./paces";

/*
  Session logs — what actually happened, not just "done".

  When a runner marks a club session done they can add how it went:
    preferences.log[sessionId] = { at: "2026-11-06", pace: 252, feel: 4, note: "…" }
      at    the day they logged it (same as preferences.done[sessionId])
      pace  average pace on the main set, seconds per km (null if not given)
      feel  1–5, see FEELS (null if not given)
      note  a short free line (optional)
  preferences.done stays as it was — the log is extra detail on top of it.

  The phone reports `log` with the rest of its progress (js/lib/member.js →
  member_progress(), kept in signups.progress.logs), and the Coach Session
  Hub reads it back: for each runner, their logged pace next to the pace the
  session asked of them.

  Pure helpers — no React — checked by scripts/test_paces.js.
*/

export const FEELS = [
  { id: 1, name: "Facile", short: "Facile" },
  { id: 2, name: "Tranquille", short: "Tranq." },
  { id: 3, name: "Correct", short: "Correct" },
  { id: 4, name: "Dur", short: "Dur" },
  { id: 5, name: "Très dur", short: "Très dur" },
];

const isClubLevel = (id) => levels.some((l) => l.id === id && l.group === "club");

export const feelById =(id) => FEELS.find((f) => f.id === Number(id)) || null;

/* "4:12" / "4'12" / "4:12 /km" → 252 seconds per km; null when it isn't a pace a human runs */
export const parsePace = (text) => {
  const seconds = parseClock(String(text || "").replace(/\s*\/\s*km\s*$/i, "").trim());
  if (!seconds || seconds < 120 || seconds > 1200) return null; // 2:00 – 20:00 /km
  return seconds;
};

/* Every run step of a list with repeats opened up, same as the coach hub's targets */
const runSteps = (steps = []) =>
  steps.flatMap((s) => {
    if (s.repeat) return Array(s.repeat).fill(runSteps(s.steps)).flat();
    return s.run !== undefined ? [s] : [];
  });

/*
  The pace the main set asked of one runner, seconds per km: the average of
  every rep, weighted by distance (a timed rep counts for the distance their
  VMA predicts). null without a VMA, outside the club levels, or when the
  main set has no reps (the VMA test, a light run).
*/
export const targetPace = (session, levelId, vma) => {
  if (!session || !vma || !isClubLevel(levelId)) return null;
  let metres = 0;
  let seconds = 0;
  runSteps(planFor(session, levelId).main).forEach((s) => {
    if (typeof s.run === "number") {
      metres += s.run;
      seconds += repTime(s.run, vma, s.vma);
    } else {
      const t = toSeconds(s.run);
      metres += repDistance(t, vma, s.vma);
      seconds += t;
    }
  });
  return metres ? Math.round(seconds / (metres / 1000)) : null;
};

/*
  Logged pace against the target: { seconds, label } where seconds is
  logged − target (positive = slower) and label reads "+0:08 /km" or
  "−0:05 /km" ("à l'allure" within 3 s). null when either side is missing.
*/
export const paceGap = (loggedPace, target) => {
  if (!loggedPace || !target) return null;
  const diff = loggedPace - target;
  if (Math.abs(diff) <= 3) return { seconds: diff, label: "à l'allure" };
  return { seconds: diff, label: `${diff > 0 ? "+" : "−"}${formatClock(Math.abs(diff))} /km` };
};

/* "4:12 /km · Dur" — a log in one line; "Faite" when nothing but the tick was given */
export const logLine = (log) => {
  if (!log) return "";
  const parts = [log.pace ? formatPace(log.pace) : null, feelById(log.feel)?.name || null].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Faite";
};

/* The log a runner's phone sent for one session, or null */
export const logFor = (logs, sessionId) => (logs && sessionId && logs[sessionId]) || null;

/*
  Logs as the coach's athlete page lists them, newest first:
    [{ sessionId, at, pace, feel, note, title, date, target, gap }]
  `sessions` is the club list (store); sessions no longer in it keep their id as the title.
*/
export const logRows = (athlete, sessions = []) =>
  Object.entries(athlete.logs || {})
    .map(([sessionId, log]) => {
      const session = sessions.find((s) => s.id === sessionId);
      const target = session ? targetPace(session, athlete.level, athlete.vma) : null;
      return {
        sessionId,
        at: log.at || null,
        pace: log.pace || null,
        feel: log.feel || null,
        note: log.note || "",
        title: session?.title || sessionId,
        date: session?.date || log.at || "",
        target,
        gap: paceGap(log.pace, target),
      };
    })
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

/* How many of a group logged a session, for the hub's header: { done, total } */
export const doneCount = (athletes, sessionId) => ({
  done: athletes.filter((a) => a.done?.[sessionId] || a.logs?.[sessionId]).length,
  total: athletes.length,
});
