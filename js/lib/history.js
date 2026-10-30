import { PROGRAMMES, programmeSessions, sessionLabel, perWeekOf } from "./beginner";
import { formatShortDate } from "./plan";

/*
  Mes séances — what a runner has done, and what the coaches see of it.

  Club sessions (Levels 1–3) are kept in preferences.done, one entry per
  session id. An entry used to be just the date; it's now
    { at: "2026-11-06", feel: "easy" | "right" | "hard", note: "…" }
  and doneEntry() reads both shapes.

  Débuter sessions are kept in preferences.beginnerDone, one entry per
  "level:index" ("beginnerB:7"): { at }. The runner's place in the
  programme stays in preferences.programme (js/lib/beginner.js); this log
  only adds the dates, so the history and the coach can show them.

  Pure functions — tested by scripts/test_paces.js.
*/

export const FEELS = [
  { id: "easy", name: "Facile", hint: "J'en avais encore sous le pied" },
  { id: "right", name: "Juste bien", hint: "Dur mais tenu — c'est le but" },
  { id: "hard", name: "Trop dur", hint: "Allures à revoir avec le coach" },
];

export const feelById = (id) => FEELS.find((f) => f.id === id) || null;

/* One done entry, whatever shape it was saved in; null when not done */
export const doneEntry = (done, id) => {
  const v = done?.[id];
  if (!v) return null;
  if (typeof v === "string") return { at: v };
  return { at: v.at, feel: v.feel || null, note: v.note || "" };
};

/* A new `done` map with this session marked (patch merges into the entry) or unmarked */
export const withDone = (done = {}, id, patch) => {
  const map = { ...done };
  if (patch === null) {
    delete map[id];
    return map;
  }
  const current = doneEntry(done, id) || {};
  map[id] = { ...current, ...patch };
  return map;
};

/* ── Club sessions ──────────────────────────────────────────────────────── */

/*
  Past club sessions, newest first, each with its entry:
    { session, entry, status: "done" | "missed" }
*/
export const clubHistory = (sessions, done, today) =>
  [...sessions]
    .filter((s) => s.date < today)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((session) => {
      const entry = doneEntry(done, session.id);
      return { session, entry, status: entry ? "done" : "missed" };
    });

/* { done: 3, past: 4, total: 8, streak: 2 } for a list of sessions (the cycle) */
export const clubStats = (sessions, done, today) => {
  const list = [...sessions].sort((a, b) => (a.date < b.date ? -1 : 1));
  const past = list.filter((s) => s.date < today);
  const doneCount = past.filter((s) => doneEntry(done, s.id)).length;
  let streak = 0;
  for (let i = past.length - 1; i >= 0 && doneEntry(done, past[i].id); i--) streak++;
  return { done: doneCount, past: past.length, total: list.length, streak };
};

/* ── Débuter sessions ───────────────────────────────────────────────────── */

export const beginnerKey = (levelId, index) => `${levelId}:${index}`;

/* The runner's done Débuter sessions, newest first: { levelId, index, at, label, week, slotName } */
export const beginnerHistory = (beginnerDone = {}) =>
  Object.entries(beginnerDone)
    .map(([key, v]) => {
      const [levelId, idx] = key.split(":");
      const index = Number(idx);
      const programme = PROGRAMMES[levelId];
      if (!programme) return null;
      const s = programmeSessions(levelId, 3).find((x) => x.index === index);
      if (!s) return null;
      return { levelId, index, at: v?.at || "", label: sessionLabel(s), week: s.week, slotName: s.slotName, test: !!s.test, programme: programme.name };
    })
    .filter(Boolean)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : b.index - a.index));

/*
  Where a beginner is in their programme — for the runner's history header
  and for the coach: { programme, week, doneCount, total, next: { label, week, slotName } | null }
  `programme` here is preferences.programme ({ levelId: index }).
*/
export const beginnerPosition = (levelId, programmeState = {}, perWeek = 3) => {
  if (!PROGRAMMES[levelId]) return null;
  const list = programmeSessions(levelId, perWeek);
  const at = Math.min(programmeState?.[levelId] ?? 0, 17);
  const next = list.find((s) => s.index >= at) || null;
  const doneCount = list.filter((s) => s.index < at).length;
  return {
    programme: PROGRAMMES[levelId].name,
    week: next ? next.week : 6,
    doneCount,
    total: list.length,
    next: next ? { label: sessionLabel(next), week: next.week, slotName: next.slotName, test: !!next.test, index: next.index } : null,
  };
};

/* The same, from a runner's preferences */
export const myBeginnerPosition = (p) => beginnerPosition(p.level, p.programme, perWeekOf(p));

/* "Débuter B · semaine 3 · prochaine : 4×(7'/1')" — one line for the coach */
export const beginnerLine = (position) => {
  if (!position) return "";
  const next = position.next ? ` · prochaine : ${position.next.label}${position.next.test ? " (test)" : ""}` : " · programme terminé";
  return `${position.programme} · semaine ${position.week}${next}`;
};

/* ── Dates ─────────────────────────────────────────────────────────────── */

/* "il y a 3 jours", "hier", "aujourd'hui", else the date */
export const sinceLabel = (dateKey, today) => {
  if (!dateKey) return "";
  const [y, m, d] = dateKey.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const days = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 14) return `il y a ${days} jours`;
  return formatShortDate(dateKey);
};

