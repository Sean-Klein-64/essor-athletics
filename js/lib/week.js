import { zoneById, zonePace } from "./paces";

/*
  The rest of the week for Levels 1–3: Friday is the club session, the
  other runs are suggested from how many runs the runner wants and their
  level, with paces from their VMA zones. Rules from the Running hub:
  easy runs truly easy, one quality day (Friday), the long run on its own,
  never two hard days back to back.

  Runs per week counts Friday. The runner picks 1–5 (preferences.runsWeek);
  the questionnaire answer sets a first guess.
*/

export const RUNS_OPTIONS = [1, 2, 3, 4, 5];

export const guessRuns = (preferences) =>
  preferences.runsWeek || { never: 2, once: 2, twice: 3, more: 4 }[preferences.runsPerWeek] || 3;

/* Duration scale by level: Level 3 shorter, Level 1 longer */
const SCALE = { level3: 0.8, level2: 1, level1: 1.2 };

const FRIDAY = { day: "Vendredi", kind: "club", title: "Run club", note: "La séance de la semaine — fractionné sur la piste de Floride, 16h30" };

const TEMPLATES = {
  1: [FRIDAY],
  2: [FRIDAY, { day: "Dimanche", kind: "easy", minutes: 45, title: "Footing", zone: "ga", note: "Facile du début à la fin : tu dois pouvoir parler" }],
  3: [
    { day: "Mardi", kind: "easy", minutes: 40, title: "Footing + lignes droites", zone: "ga", note: "Finis par 4 × 80 m en accélérant, relâché" },
    FRIDAY,
    { day: "Dimanche", kind: "long", minutes: 60, title: "Sortie longue", zone: "endurance", note: "La plus longue de la semaine, allure régulière" },
  ],
  4: [
    { day: "Mardi", kind: "easy", minutes: 45, title: "Footing + lignes droites", zone: "ga", note: "Finis par 4 × 80 m en accélérant, relâché" },
    { day: "Jeudi", kind: "easy", minutes: 30, title: "Footing court", zone: "ga", note: "Très facile — la veille du club" },
    FRIDAY,
    { day: "Dimanche", kind: "long", minutes: 70, title: "Sortie longue", zone: "endurance", note: "La plus longue de la semaine, allure régulière" },
  ],
  5: [
    { day: "Lundi", kind: "easy", minutes: 30, title: "Récup", zone: "recovery", note: "Juste faire circuler, aucune allure à tenir" },
    { day: "Mardi", kind: "easy", minutes: 50, title: "Footing + lignes droites", zone: "ga", note: "Finis par 6 × 80 m en accélérant, relâché" },
    { day: "Jeudi", kind: "easy", minutes: 30, title: "Footing court", zone: "ga", note: "Très facile — la veille du club" },
    FRIDAY,
    { day: "Dimanche", kind: "long", minutes: 75, title: "Sortie longue", zone: "endurance", note: "La plus longue de la semaine, allure régulière" },
  ],
};

/* The week as a list of days with everything worked out */
export const weekPlan = (preferences) => {
  const runs = Math.min(5, Math.max(1, guessRuns(preferences)));
  const scale = SCALE[preferences.level] || 1;
  return TEMPLATES[runs].map((r) => {
    if (r.kind === "club") return r;
    const zone = zoneById(r.zone);
    const minutes = Math.round((r.minutes * scale) / 5) * 5;
    return {
      ...r,
      minutes,
      zoneName: zone.name,
      pace: preferences.vma ? zonePace(preferences.vma, zone.vma) : null,
      hr: null,
    };
  });
};

export const RULES = [
  "Le vendredi est la seule séance dure : tout le reste est facile.",
  "Un footing doit rester une conversation. Si tu ne peux pas parler, ralentis.",
  "La sortie longue monte doucement : jamais plus de 10 minutes de plus que la semaine d'avant.",
  "Un jour sans courir avant et après le club si tu peux.",
];
