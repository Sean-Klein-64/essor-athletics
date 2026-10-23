/*
  The run club sessions — written here, one entry per Friday.
  To add or change a session, edit this file and ship it (an over-the-air
  update is enough, see README → "Updating the sessions").

  ── How a session is written ─────────────────────────────────────────────

    {
      id: "2026-11-06-vo2-10k",      unique, never reused
      date: "2026-11-06",            the Friday it happens
      title: "Pyramide",
      kind: "pyramid",               test | pyramid | vo2 | threshold | easy
      summary: "One line on what the session is for",
      warmup:   [steps],             shared by Levels 1–3
      cooldown: [steps],
      levels: {
        level1: [steps],             the main set for that level
        level2: [steps],
        level3: [steps],
        level1: { warmup, main, cooldown } ← an object replaces the shared warm-up/cool-down
      },

  Débuter A/B/C don't appear here: beginners follow their walk-run
  programme (js/lib/beginner.js), and their Friday session is the next one in it.
    }

  ── Steps ────────────────────────────────────────────────────────────────

    { run: 400, vma: 100 }           400 m at 100 % VMA → the app shows the target time
    { run: "0:30", vma: 105 }        30 seconds at 105 % VMA → the app shows the distance
    { easy: "15:00" }                footing (EF pace from the runner's VMA)
    { jog: "1:00" }                  recovery jog
    { walk: "1:00" }                 walk
    { test: "6:00" }                 the 6-minute VMA test (as far as possible)
    { drills: "Montées de genoux, talons-fesses, pas chassés" }
    { repeat: 3, steps: [steps], rest: { jog: "3:00" } }
                                     a set repeated 3 times, `rest` between sets
    Any step can carry `note: "…"`.

  Durations are "m:ss" strings, distances are metres. Keep steps in this
  shape — it maps one-to-one onto Garmin structured workouts for later.

  The three below are DRAFTS of cycle 1 (VMA test, then pyramid and VO2max
  alternating) — to rewrite with Mel before launch.
*/

const sharedWarmup = [
  { easy: "15:00" },
  { drills: "Montées de genoux, talons-fesses, pas chassés, foulées bondissantes" },
  { repeat: 3, steps: [{ run: 80, vma: 90, note: "Accélération progressive" }, { walk: "0:45", note: "Retour en marchant" }] },
];

const sharedCooldown = [{ easy: "10:00", note: "Très facile, puis étirements" }];

const sessions = [
  {
    id: "2026-10-30-test-vma",
    date: "2026-10-30",
    title: "Test VMA",
    kind: "test",
    summary:
      "6 minutes à fond : la distance parcourue donne ta VMA, et toutes tes allures en découlent.",
    warmup: sharedWarmup,
    cooldown: sharedCooldown,
    levels: {
      level1: [{ test: "6:00" }],
      level2: [{ test: "6:00" }],
      level3: [{ test: "6:00" }],
    },
  },
  {
    id: "2026-11-06-vo2-10k",
    date: "2026-11-06",
    title: "VO2 Max",
    kind: "vo2",
    summary:
      "Des répétitions à ton allure 10 km, 2' de récup en marchant. Toutes à la même vitesse : si la dernière est la plus lente, tu es parti·e trop vite.",
    warmup: [
      { easy: "15:00" },
      { drills: "Skipping, talons-fesses, montées de genoux" },
    ],
    cooldown: sharedCooldown,
    levels: {
      level1: [{ repeat: 5, steps: [{ run: 1000, vma: 90 }], rest: { walk: "2:00" } }],
      level2: [{ repeat: 4, steps: [{ run: 1000, vma: 90 }], rest: { walk: "2:00" } }],
      level3: [{ repeat: 3, steps: [{ run: 800, vma: 90 }], rest: { walk: "2:00" } }],
    },
  },
  {
    id: "2026-11-13-30-30",
    date: "2026-11-13",
    title: "30/30",
    kind: "vo2",
    summary:
      "30 secondes vite, 30 secondes trottinées. On cherche la régularité : la dernière comme la première.",
    warmup: sharedWarmup,
    cooldown: sharedCooldown,
    levels: {
      level1: [
        { repeat: 2, steps: [{ repeat: 10, steps: [{ run: "0:30", vma: 105 }, { jog: "0:30" }] }], rest: { jog: "3:00" } },
      ],
      level2: [
        { repeat: 2, steps: [{ repeat: 8, steps: [{ run: "0:30", vma: 105 }, { jog: "0:30" }] }], rest: { jog: "3:00" } },
      ],
      level3: [
        { repeat: 2, steps: [{ repeat: 6, steps: [{ run: "0:30", vma: 100 }, { jog: "0:30" }] }], rest: { jog: "3:00" } },
      ],
    },
  },
  {
    id: "2026-11-27-pyramide",
    date: "2026-11-27",
    title: "Pyramide",
    kind: "pyramid",
    summary:
      "On monte puis on redescend : plus c'est court, plus c'est rapide. Récup trottinée entre chaque.",
    warmup: sharedWarmup,
    cooldown: sharedCooldown,
    levels: {
      level1: [
        { run: 200, vma: 105 }, { jog: "1:00" },
        { run: 400, vma: 100 }, { jog: "1:00" },
        { run: 600, vma: 95 }, { jog: "1:30" },
        { run: 800, vma: 95 }, { jog: "1:30" },
        { run: 600, vma: 95 }, { jog: "1:30" },
        { run: 400, vma: 100 }, { jog: "1:00" },
        { run: 200, vma: 105 },
      ],
      level2: [
        { run: 200, vma: 105 }, { jog: "1:00" },
        { run: 400, vma: 100 }, { jog: "1:00" },
        { run: 600, vma: 95 }, { jog: "1:30" },
        { run: 400, vma: 100 }, { jog: "1:00" },
        { run: 200, vma: 105 },
      ],
      level3: [
        { run: 200, vma: 105 }, { jog: "1:00" },
        { run: 400, vma: 100 }, { jog: "1:00" },
        { run: 400, vma: 100 }, { jog: "1:00" },
        { run: 200, vma: 105 },
      ],
    },
  },
];

export default sessions;
