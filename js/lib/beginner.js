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
