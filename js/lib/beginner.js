import { levelById } from "./levels";

/*
  The three Débuter programmes, from "Essor Athletics — The Level System"
  (Notion). Walk-run plans that build up to 30' of continuous running.

  - 3 sessions a week: the Friday club session + 2 on your own, a day apart.
  - Each level is 6 weeks, but you only move on to the next session when
    you're ready — so the app keeps your place, it doesn't follow the calendar.
  - The last session of each level is a test; passing it moves you up.

  Session shorthand (how they're written below):
    rw(5, 1, 1)          5 × (1' run / 1' walk)
    run(15)              15' continuous
    run(15, "facile")    with a note
  Times in minutes; 0.5 = 30".
*/

const rw = (sets, run, walk, note) => ({ sets, run, walk, note });
const run = (minutes, note) => ({ sets: 1, run: minutes, walk: 0, note });
const test = (session, next) => ({ ...session, test: true, next });

export const PROGRAMMES = {
  beginnerA: {
    name: "Débuter A",
    weeks: [
      [rw(5, 1, 1), rw(6, 1, 1), rw(7, 1, 1)],
      [rw(8, 1, 1), rw(10, 1, 1), rw(5, 2, 1)],
      [rw(6, 2, 1), rw(7, 2, 1), rw(8, 2, 1)],
      [rw(5, 3, 1), rw(6, 3, 1), rw(7, 3, 1)],
      [rw(4, 4, 1), rw(5, 4, 1), rw(3, 5, 1)],
      [rw(4, 5, 1), rw(5, 5, 1), test(rw(2, 6, 1), "beginnerB")],
    ],
  },
  beginnerB: {
    name: "Débuter B",
    weeks: [
      [rw(4, 5, 1), rw(3, 6, 1), rw(3, 7, 1)],
      [rw(4, 7, 1), rw(3, 8, 1), rw(3, 9, 1)],
      [rw(2, 10, 1), rw(3, 10, 1), rw(2, 12, 1)],
      [rw(3, 8, 1, "Semaine plus facile"), rw(2, 14, 1), run(15)],
      [rw(2, 15, 1), run(16), run(18)],
      [run(15, "Facile"), rw(2, 10, 1), test(run(20), "beginnerC")],
    ],
  },
  beginnerC: {
    name: "Débuter C",
    weeks: [
      [rw(2, 10, 1), run(18), rw(2, 12, 1)],
      [run(20), rw(2, 12, 1), run(22)],
      [rw(2, 14, 1), run(22), run(24)],
      [run(20, "Semaine plus facile"), run(25), rw(2, 15, 1)],
      [run(26), rw(3, 9, 1), run(28)],
      [run(20, "Facile"), run(25), test(run(30), "level3")],
    ],
  },
};

export const isBeginner = (levelId) => !!PROGRAMMES[levelId];

const SESSION_NAMES = ["Vendredi", "Séance 2", "Séance 3"];

/*
  All sessions of a programme, flattened, each with its place (`index`
  0–17 is its position in the full programme). With 2 sessions a week the
  third of each week is skipped, except the test: it then takes the second
  slot of week 6. Slower, but the same path.
*/
export const programmeSessions = (levelId, perWeek = 3) =>
  (PROGRAMMES[levelId]?.weeks || []).flatMap((week, w) =>
    week
      .map((s, i) => ({ ...s, week: w + 1, slot: i, slotName: SESSION_NAMES[i], index: w * 3 + i }))
      .filter((s) => perWeek >= 3 || s.slot < 2 || s.test)
      .filter((s) => perWeek >= 3 || !(s.slot === 1 && week[2]?.test)),
  );

export const PER_WEEK_OPTIONS = [2, 3];
export const perWeekOf = (preferences) => (preferences.beginnerSessions === 2 ? 2 : 3);

const mins = (m) => (m < 1 ? `${Math.round(m * 60)}"` : `${m}'`);

/* "5×(1'/1')" or "15' continu" — how the Level System page writes them */
export const sessionLabel = (s) =>
  s.walk ? `${s.sets}×(${mins(s.run)}/${mins(s.walk)})` : `${mins(s.run)} continu`;

/* Total minutes of running in a session */
export const runMinutes = (s) => s.sets * s.run;

/* Steps in the same format as the club sessions (js/lib/sessions.js), so StepRow can draw them */
export const sessionPlan = (s) => {
  const t = (m) => `${Math.floor(m)}:${String(Math.round((m % 1) * 60)).padStart(2, "0")}`;
  const main = s.walk
    ? [{ repeat: s.sets, steps: [{ easy: t(s.run) }, { walk: t(s.walk) }] }]
    : [{ easy: t(s.run), note: s.test ? "Sans t'arrêter — c'est le test" : "Sans t'arrêter" }];
  return {
    warmup: [{ walk: "5:00", note: "Marche rapide" }],
    main,
    cooldown: [{ walk: "5:00", note: "Marche, puis étirements" }],
  };
};

/* The runner's next session: the first one not yet done (progress is saved per level as the full-programme index) */
export const currentIndex = (preferences, levelId) => Math.min(preferences.programme?.[levelId] ?? 0, 17);
export const nextSession = (preferences, levelId) => {
  const at = currentIndex(preferences, levelId);
  const list = programmeSessions(levelId, perWeekOf(preferences));
  return list.find((s) => s.index >= at) || list[list.length - 1];
};

/* The rules from the Level System page, shown before marking a session */
export const READY_RULES = [
  "Tu pouvais parler pendant les phases de course",
  "Rien ne faisait mal le lendemain matin",
  "Tu as fini la séance sans raccourcir une course",
];

/* ── Coming back after a gap ─────────────────────────────────────────────

  The programme waits for you — that's right for a missed session, wrong
  for a missed fortnight. Tendons lose tolerance faster than lungs, so
  after a gap the runner steps back before moving on. The rule, from the
  days since the last session they marked done:

    ≤ 7 days    nothing — carry on (a missed session is just done next time)
    8–14 days   repeat the last session done before going on
    15–28 days  go back one week (3 sessions)
    > 28 days   restart the level from week 1

  Dates come from preferences.programmeLog[levelId] = [{ index, at }],
  appended each time a Débuter session is marked done. The step back is
  proposed, not imposed: the runner confirms (or says they kept running
  on their own), and the coach sees it in the hub.
*/

export const GAP_RULES = [
  { maxDays: 7, action: "none" },
  { maxDays: 14, action: "repeat" },
  { maxDays: 28, action: "back" },
  { maxDays: Infinity, action: "restart" },
];

const daysBetween = (fromKey, toKey) => {
  const [y1, m1, d1] = fromKey.split("-").map(Number);
  const [y2, m2, d2] = toKey.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
};

/* The last Débuter session marked done on this level: { index, at } or null */
export const lastDone = (preferences, levelId) => {
  const log = preferences.programmeLog?.[levelId] || [];
  return log.length ? log[log.length - 1] : null;
};

/*
  What to do on coming back: { days, action, from, to, title, text } or null
  when there is nothing to propose (no session logged yet, gap ≤ 7 days, or
  the step back was already handled for this return).
*/
export const gapPlan = (preferences, levelId, today) => {
  const last = lastDone(preferences, levelId);
  if (!last?.at) return null;
  const days = daysBetween(last.at, today);
  const action = GAP_RULES.find((r) => days <= r.maxDays).action;
  if (action === "none") return null;
  const handled = preferences.programmeReturn?.[levelId];
  if (handled && handled.lastAt === last.at) return null; // already answered for this gap
  const from = currentIndex(preferences, levelId);
  const to = action === "repeat" ? Math.max(0, last.index) : action === "back" ? Math.max(0, from - 3) : 0;
  const texts = {
    repeat: { title: `${days} jours sans séance`, text: "On refait la dernière séance avant d'avancer. Même allure, tu dois pouvoir parler." },
    back: { title: `${days} jours sans séance`, text: "On recule d'une semaine dans le programme. Les tendons oublient plus vite que le souffle — c'est la règle, pas une punition." },
    restart: { title: `${days} jours sans séance`, text: `On repart du début de ${PROGRAMMES[levelId]?.name || "ton niveau"}, tranquillement. Tu remonteras vite.` },
  };
  return { days, action, from, to, ...texts[action] };
};

/* Where the step back lands, in words: "semaine 3, séance 2" */
export const indexLabel = (index) => `semaine ${Math.floor(index / 3) + 1}, séance ${(index % 3) + 1}`;

/* ── Mon test — the beginner's countdown ────────────────────────────────

  Levels 1–3 count down to the race; a Débuter runner counts down to the
  end-of-level test. From where they are and how often they actually run:
    { test, sessionsLeft, weeks, rhythm, minutesNow, target: 30, pct, next, unlock }
  rhythm = sessions/week over the last 3 weeks from programmeLog (falls
  back to the 2 or 3 they chose when nothing is logged yet).
*/
export const testCountdown = (preferences, today) => {
  const levelId = preferences.level;
  if (!PROGRAMMES[levelId]) return null;
  const perWeek = perWeekOf(preferences);
  const list = programmeSessions(levelId, perWeek);
  const at = currentIndex(preferences, levelId);
  const test = list.find((s) => s.test);
  const left = list.filter((s) => s.index >= at && s.index <= test.index);
  const now = list.find((s) => s.index >= at) || list[list.length - 1];

  const log = preferences.programmeLog?.[levelId] || [];
  const recent = log.filter((e) => {
    const [y1, m1, d1] = e.at.split("-").map(Number);
    const [y2, m2, d2] = today.split("-").map(Number);
    const days = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
    return days >= 0 && days < 21;
  }).length;
  const rhythm = recent ? Math.round((recent / 3) * 10) / 10 : perWeek;
  const weeks = Math.max(0, Math.ceil(left.length / Math.max(1, rhythm)));

  return {
    test: { label: sessionLabel(test), minutes: test.run, next: test.next },
    isTestNext: now.index === test.index,
    sessionsLeft: left.length,
    weeks,
    rhythm,
    minutesNow: now.run,
    target: 30,
    pct: Math.min(1, now.run / 30),
    unlock: levelById(test.next).name,
    levelName: PROGRAMMES[levelId].name,
  };
};

/* "Encore 11 séances · ≈ 4 semaines à ce rythme" / "Le test, c'est la prochaine" */
export const testCountdownLine = (c) => {
  if (!c) return "";
  if (c.isTestNext) return "Le test, c'est ta prochaine séance";
  return `Encore ${c.sessionsLeft} séance${c.sessionsLeft > 1 ? "s" : ""} · ≈ ${c.weeks} semaine${c.weeks > 1 ? "s" : ""} à ton rythme`;
};
