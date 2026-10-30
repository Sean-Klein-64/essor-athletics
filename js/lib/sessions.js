/*
  The run club sessions — written here, one entry per Friday.
  To add or change a session, edit this file, run `node scripts/test_paces.js`,
  then `node scripts/build_site_sessions.js` so the website shows the same
  thing, and ship a new build (README → "Each time the sessions change").
  A coach can also rewrite any Friday from the app (Mode coach); that version
  wins over this file for the same id.

  ── How a session is written ─────────────────────────────────────────────

    {
      id: "2026-11-06-vo2-10k",      unique, never reused
      date: "2026-11-06",            the Friday it happens
      title: "Pyramide",
      kind: "pyramid",               test | pyramid | vo2 | threshold | easy
      summary: "One line on what the session is for — the runner reads this first",
      warmup:   [steps],             shared by Levels 1–3
      cooldown: [steps],
      levels: {
        level1: [steps],             the main set for that level
        level2: [steps],
        level3: [steps],
        level1: { warmup, main, cooldown } ← an object replaces the shared warm-up/cool-down
      },
    }

  Débuter A/B/C don't appear here: beginners follow their walk-run
  programme (js/lib/beginner.js), and their Friday session is the next one in it.

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

  ── Cycle 1 — 8 Fridays, 30/10 → 18/12, towards the Course du Bout de l'An (Sun 20/12)

    Decided with Mel and Arthur on 23/10. Paces: 100 % VMA for the 30/30s,
    90 % VMA = "allure 10 km" for the VO2 max reps. Levels 1–3 run the same
    session at the same intensity; only the volume changes.

    S1  30/10  Test VMA            6' as far as possible — every pace in the app comes from it
    S2  06/11  VO2 max · 10 km     L3 3×800 · L2 4×1000 · L1 5×1000 @ 90 %, 2' walk (Sean)
    S3  13/11  VMA 30/30           2 × (4 / 6 / 8 × 30/30) @ 100 %, 3' jog between sets (Arthur)
    S4  20/11  VO2 max · 10 km     same reps as S2, recovery cut to 1'30 (Mel away — cover needed)
    S5  27/11  Pyramide            Mel's session. Below is a complete proposal for her to
                                   validate or replace before 20/11 — edit it in Mode coach
                                   or here.
    S6  04/12  VMA 30/30           2 × (5 / 7 / 10 × 30/30) — one more rep per set than S3
    S7  11/12  Allure course       long reps at 10 km pace, the rhythm of race day — last hard one
    S8  18/12  Séance légère       two days out: wake the legs, keep the freshness
*/

const DRILLS = "Montées de genoux, talons-fesses, pas chassés, foulées bondissantes";

/* VO2 max Fridays: 15' easy + drills, no strides (decided 23/10) */
const vo2Warmup = [{ easy: "15:00" }, { drills: DRILLS }];

/* 30/30 Fridays (Arthur's format): 15' easy, straight into it */
const thirtyWarmup = [{ easy: "15:00", note: "Les 2 dernières minutes un peu plus vite" }];

/* Where the session gets fast from the first rep, add three strides */
const stridesWarmup = [
  { easy: "15:00" },
  { drills: DRILLS },
  { repeat: 3, steps: [{ run: 80, vma: 95, note: "Accélération progressive, relâché" }, { walk: "0:45", note: "Retour en marchant" }] },
];

const cooldown = [{ easy: "10:00", note: "Très facile, puis étirements" }];
const shortCooldown = [{ easy: "10:00", note: "Très facile" }];

/* S2 / S4 / S7 share the same main-set builder: n × distance at 10 km pace */
const tenK = (repeat, metres, recovery) => [
  { repeat, steps: [{ run: metres, vma: 90, note: "Allure 10 km — la même sur toutes" }], rest: recovery },
];

/* S3 / S6: Arthur's 30/30 — 2 sets of n × (30" fast / 30" jog), 3' jog between */
const thirtyThirty = (reps) => [
  {
    repeat: 2,
    steps: [{ repeat: reps, steps: [{ run: "0:30", vma: 100 }, { jog: "0:30" }] }],
    rest: { jog: "3:00", note: "Entre les deux blocs, trottine vraiment lentement" },
  },
];

const sessions = [
  /* ── S1 ─────────────────────────────────────────────────────────────── */
  {
    id: "2026-10-30-test-vma",
    date: "2026-10-30",
    title: "Test VMA",
    kind: "test",
    summary:
      "6 minutes à fond, le plus loin possible. La distance donne ta VMA, et toutes tes allures du cycle en découlent. Pars vite mais pas à fond : tu dois tenir les 6 minutes.",
    warmup: stridesWarmup,
    cooldown,
    levels: {
      level1: [{ test: "6:00", note: "Compte tes tours : 1 tour = 400 m. Note ta distance à la fin." }],
      level2: [{ test: "6:00", note: "Compte tes tours : 1 tour = 400 m. Note ta distance à la fin." }],
      level3: [{ test: "6:00", note: "Compte tes tours : 1 tour = 400 m. Note ta distance à la fin." }],
    },
  },

  /* ── S2 ─────────────────────────────────────────────────────────────── */
  {
    id: "2026-11-06-vo2-10k",
    date: "2026-11-06",
    title: "VO2 max",
    kind: "vo2",
    summary:
      "Première vraie séance : des répétitions à ton allure 10 km, 2 minutes de récup en marchant. Toutes à la même vitesse — si la dernière est la plus lente, tu es parti·e trop vite.",
    warmup: vo2Warmup,
    cooldown,
    levels: {
      level1: tenK(5, 1000, { walk: "2:00" }),
      level2: tenK(4, 1000, { walk: "2:00" }),
      level3: tenK(3, 800, { walk: "2:00" }),
    },
  },

  /* ── S3 ─────────────────────────────────────────────────────────────── */
  {
    id: "2026-11-13-30-30",
    date: "2026-11-13",
    title: "VMA 30/30",
    kind: "vo2",
    summary:
      "30 secondes vite, 30 secondes trottinées, en deux blocs. Le 30/30 travaille ta VMA directement : la vitesse du test, par petites touches. On cherche la régularité — la dernière comme la première.",
    warmup: thirtyWarmup,
    cooldown: shortCooldown,
    levels: {
      level1: thirtyThirty(8),
      level2: thirtyThirty(6),
      level3: thirtyThirty(4),
    },
  },

  /* ── S4 ─────────────────────────────────────────────────────────────── */
  {
    id: "2026-11-20-vo2-10k",
    date: "2026-11-20",
    title: "VO2 max",
    kind: "vo2",
    summary:
      "La séance du 6 novembre, avec 30 secondes de récup en moins. Même allure, mêmes distances : c'est la récupération plus courte qui fait la progression. Compare tes temps avec il y a deux semaines.",
    warmup: vo2Warmup,
    cooldown,
    levels: {
      level1: tenK(5, 1000, { walk: "1:30" }),
      level2: tenK(4, 1000, { walk: "1:30" }),
      level3: tenK(3, 800, { walk: "1:30" }),
    },
  },

  /* ── S5 — Mel's session. Proposal below, to validate or replace before 20/11. */
  {
    id: "2026-11-27-pyramide",
    date: "2026-11-27",
    title: "Pyramide",
    kind: "pyramid",
    summary:
      "On monte, on redescend : des fractions de plus en plus longues, puis de plus en plus courtes. Les courtes se courent à VMA, les longues un cran en dessous. La descente doit être aussi propre que la montée.",
    warmup: stridesWarmup,
    cooldown,
    levels: {
      level1: [
        { run: 200, vma: 100 },
        { jog: "1:00" },
        { run: 400, vma: 100 },
        { jog: "1:30" },
        { run: 600, vma: 95 },
        { jog: "2:00" },
        { run: 800, vma: 95, note: "Le sommet — régulier, pas de sprint" },
        { jog: "2:00" },
        { run: 600, vma: 95 },
        { jog: "1:30" },
        { run: 400, vma: 100 },
        { jog: "1:00" },
        { run: 200, vma: 100, note: "Finis relâché·e, même temps qu'au départ" },
      ],
      level2: [
        { run: 200, vma: 100 },
        { jog: "1:00" },
        { run: 400, vma: 100 },
        { jog: "1:30" },
        { run: 600, vma: 95, note: "Le sommet — régulier, pas de sprint" },
        { jog: "1:30" },
        { run: 400, vma: 100 },
        { jog: "1:00" },
        { run: 200, vma: 100, note: "Finis relâché·e, même temps qu'au départ" },
      ],
      level3: [
        { run: 200, vma: 100 },
        { jog: "1:00" },
        { run: 300, vma: 100 },
        { jog: "1:30" },
        { run: 400, vma: 95, note: "Le sommet — régulier, pas de sprint" },
        { jog: "1:30" },
        { run: 300, vma: 100 },
        { jog: "1:00" },
        { run: 200, vma: 100, note: "Finis relâché·e, même temps qu'au départ" },
      ],
    },
  },

  /* ── S6 ─────────────────────────────────────────────────────────────── */
  {
    id: "2026-12-04-30-30",
    date: "2026-12-04",
    title: "VMA 30/30",
    kind: "vo2",
    summary:
      "Le 30/30 du 13 novembre, avec une répétition de plus par bloc. Tu connais la séance : cette fois, vise la même distance sur chaque 30 secondes du premier au dernier.",
    warmup: thirtyWarmup,
    cooldown: shortCooldown,
    levels: {
      level1: thirtyThirty(10),
      level2: thirtyThirty(7),
      level3: thirtyThirty(5),
    },
  },

  /* ── S7 ─────────────────────────────────────────────────────────────── */
  {
    id: "2026-12-11-allure-course",
    date: "2026-12-11",
    title: "Allure course",
    kind: "vo2",
    summary:
      "Dernière grosse séance, neuf jours avant la course. Des fractions longues à ton allure 10 km pour que le rythme du jour J soit dans les jambes. Pas plus vite que l'allure : on répète la course, on ne la court pas.",
    warmup: vo2Warmup,
    cooldown,
    levels: {
      level1: tenK(3, 2000, { jog: "2:00" }),
      level2: tenK(3, 1500, { jog: "2:00" }),
      level3: tenK(3, 1000, { jog: "2:00" }),
    },
  },

  /* ── S8 ─────────────────────────────────────────────────────────────── */
  {
    id: "2026-12-18-legere",
    date: "2026-12-18",
    title: "Séance légère",
    kind: "easy",
    summary:
      "Deux jours avant la course : juste de quoi réveiller les jambes et sentir l'allure une dernière fois. Courte exprès. On garde toute la fraîcheur pour dimanche.",
    warmup: [{ easy: "15:00" }],
    cooldown: shortCooldown,
    levels: {
      level1: [{ repeat: 4, steps: [{ run: "1:00", vma: 90, note: "Allure course, relâché·e" }, { jog: "1:00" }] }],
      level2: [{ repeat: 3, steps: [{ run: "1:00", vma: 90, note: "Allure course, relâché·e" }, { jog: "1:00" }] }],
      level3: [{ repeat: 3, steps: [{ run: "1:00", vma: 90, note: "Allure course, relâché·e" }, { jog: "1:00" }] }],
    },
  },
];

export default sessions;
