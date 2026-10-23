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

  Cycle 1 (30/10 → 18/12), towards the Course du Bout de l'An: VMA test /
  VO2 max / VMA / VO2 max / Pyramid (Mel) / VMA / VO2 max race pace / Light.
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
    title: "VMA 30/30",
    kind: "vo2",
    summary:
      "30 secondes vite, 30 secondes trottinées. On cherche la régularité : la dernière comme la première.",
    warmup: [{ easy: "15:00" }],
    cooldown: [{ easy: "10:00" }],
    levels: {
      level1: [
        { repeat: 2, steps: [{ repeat: 8, steps: [{ run: "0:30", vma: 100 }, { jog: "0:30" }] }], rest: { jog: "3:00" } },
      ],
      level2: [
        { repeat: 2, steps: [{ repeat: 6, steps: [{ run: "0:30", vma: 100 }, { jog: "0:30" }] }], rest: { jog: "3:00" } },
      ],
      level3: [
        { repeat: 2, steps: [{ repeat: 4, steps: [{ run: "0:30", vma: 100 }, { jog: "0:30" }] }], rest: { jog: "3:00" } },
      ],
    },
  },
  {
    id: "2026-11-20-vo2-10k",
    date: "2026-11-20",
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
    id: "2026-11-27-pyramide",
    date: "2026-11-27",
    title: "Pyramide",
    kind: "pyramid",
    summary: "Séance préparée par Mel : les détails arrivent bientôt.",
    warmup: [{ easy: "15:00" }, { drills: "Skipping, talons-fesses, montées de genoux" }],
    cooldown: sharedCooldown,
    levels: {
      level1: [{ note: "Séance préparée par Mel, détails à venir" }],
      level2: [{ note: "Séance préparée par Mel, détails à venir" }],
      level3: [{ note: "Séance préparée par Mel, détails à venir" }],
    },
  },
  {
    id: "2026-12-04-30-30",
    date: "2026-12-04",
    title: "VMA 30/30",
    kind: "vo2",
    summary:
      "Le 30/30 du 13/11, avec un peu plus de répétitions. Toujours la même régularité : la dernière comme la première.",
    warmup: [{ easy: "15:00" }],
    cooldown: [{ easy: "10:00" }],
    levels: {
      level1: [
        { repeat: 2, steps: [{ repeat: 10, steps: [{ run: "0:30", vma: 100 }, { jog: "0:30" }] }], rest: { jog: "3:00" } },
      ],
      level2: [
        { repeat: 2, steps: [{ repeat: 7, steps: [{ run: "0:30", vma: 100 }, { jog: "0:30" }] }], rest: { jog: "3:00" } },
      ],
      level3: [
        { repeat: 2, steps: [{ repeat: 5, steps: [{ run: "0:30", vma: 100 }, { jog: "0:30" }] }], rest: { jog: "3:00" } },
      ],
    },
  },
  {
    id: "2026-12-11-vo2-10k",
    date: "2026-12-11",
    title: "VO2 Max · allure course",
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
    id: "2026-12-18-legere",
    date: "2026-12-18",
    title: "Séance légère",
    kind: "easy",
    summary: "Deux jours avant la course : juste de quoi réveiller les jambes. On garde de la fraîcheur pour dimanche.",
    warmup: [{ easy: "15:00" }],
    cooldown: [{ easy: "10:00", note: "Très facile" }],
    levels: {
      level1: [{ repeat: 3, steps: [{ run: "1:00", vma: 90, note: "Allure course 10 km" }, { jog: "1:00" }] }],
      level2: [{ repeat: 3, steps: [{ run: "1:00", vma: 90, note: "Allure course 10 km" }, { jog: "1:00" }] }],
      level3: [{ repeat: 3, steps: [{ run: "1:00", vma: 90, note: "Allure course 10 km" }, { jog: "1:00" }] }],
    },
  },
];

export default sessions;
