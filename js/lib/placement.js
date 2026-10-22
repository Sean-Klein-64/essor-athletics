/*
  From the sign-up questionnaire to a level — the placement rules from the
  run club launch page (Notion, "Draft questionnaire", to confirm with Mel):

    can't run 5' non-stop    → Débuter A
    5–15'                    → Débuter B
    15–30'                   → Débuter C
    30'+                     → Level 3, 2 or 1 from how often they run and
                               their 5 km — whichever points higher:
                                 0–1×/week or 5 km over 30'  → Level 3
                                 2×/week   or 5 km 25–30'    → Level 2
                                 3×/week+  or 5 km under 25' → Level 1

  The beginner cut-offs (5 / 15 / 30') follow the Level System page, which
  the Débuter programmes are built on. The VMA test at the first session
  confirms it.
  Answer ids match the options in js/lib/onboarding.js.
*/

const BY_FREQUENCY = { never: 3, once: 3, twice: 2, more: 1 };
const BY_FIVE_K = { none: 3, over30: 3, "25to30": 2, under25: 1 };

export const suggestLevel = ({ runContinuous, runsPerWeek, fiveK }) => {
  if (runContinuous === "under5") return "beginnerA";
  if (runContinuous === "5to15") return "beginnerB";
  if (runContinuous === "15to30") return "beginnerC";
  if (runContinuous !== "over30") return undefined;
  const level = Math.min(BY_FREQUENCY[runsPerWeek] ?? 3, BY_FIVE_K[fiveK] ?? 3);
  return `level${level}`;
};

/* Everything the coaches need from the questionnaire, in one object */
export const questionnaireAnswers = (p) => ({
  runContinuous: p.runContinuous,
  runsPerWeek: p.runsPerWeek,
  fiveK: p.fiveK,
  races: p.races || "",
  injury: p.injury,
  injuryDetail: p.injury === "yes" ? p.injuryDetail || "" : "",
  goal: p.goal,
});
