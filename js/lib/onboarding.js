import levels from "./levels";
import { suggestLevel } from "./placement";
import { levelById } from "./levels";

/*
  The first-run questions, one per screen (QuestionScreen walks this list).
  It's the run club sign-up questionnaire: the answers suggest a level
  (js/lib/placement.js), which the runner confirms on the Niveau screen.
  Each answer is saved under `field`; Profile reopens a question with
  { field } to change it.

  Types:
    "text"    — a typed answer (`optional: true` lets it be skipped)
    "choice"  — one option from `options` ({ id, name, description? })
    "vma"     — VMA in km/h; can be skipped (measured at the first session)
    "records" — best times over 5 km / 10 km / semi / marathon, each optional
    "bpm"     — a heart rate

  `showIf(answers)` shows a question only after a certain answer.
  `suggest(answers)` pre-selects an option and says why in the tip.
*/

const onboarding = [
  {
    field: "name",
    type: "text",
    title: "Prénom et nom",
    prompt: "Comment tu t'appelles ?",
    placeholder: "Prénom Nom",
    tip: "Ton prénom apparaît dans la liste « Je viens ».",
    cta: "Continuer",
  },
  {
    field: "runContinuous",
    type: "choice",
    title: "Course",
    prompt: "Aujourd'hui, combien de temps peux-tu courir sans t'arrêter ?",
    options: [
      { id: "under5", name: "Moins de 5 min" },
      { id: "5to15", name: "5 à 15 min" },
      { id: "15to30", name: "15 à 30 min" },
      { id: "over30", name: "30 min ou plus" },
    ],
    tip: "Réponds pour aujourd'hui, pas pour ta meilleure période.",
    cta: "Continuer",
  },
  {
    field: "runsPerWeek",
    type: "choice",
    title: "Fréquence",
    prompt: "Combien de fois cours-tu par semaine en ce moment ?",
    options: [
      { id: "never", name: "Jamais" },
      { id: "once", name: "1 fois" },
      { id: "twice", name: "2 fois" },
      { id: "more", name: "3 fois ou plus" },
    ],
    tip: "Le run club du vendredi compte à partir de maintenant.",
    cta: "Continuer",
  },
  {
    field: "fiveK",
    type: "choice",
    title: "5 km",
    prompt: "Ton temps récent sur 5 km ?",
    options: [
      { id: "none", name: "Jamais couru 5 km" },
      { id: "over30", name: "Plus de 30 min" },
      { id: "25to30", name: "25 à 30 min" },
      { id: "under25", name: "Moins de 25 min" },
    ],
    tip: "Une estimation suffit.",
    cta: "Continuer",
  },
  {
    field: "races",
    type: "text",
    optional: true,
    title: "Courses",
    prompt: "As-tu déjà fait une course ? Laquelle ?",
    placeholder: "10 km, semi, marathon, HYROX…",
    tip: "Laisse vide si ce n'est pas encore le cas.",
    cta: "Continuer",
    skip: "Pas encore",
  },
  {
    field: "injury",
    type: "choice",
    title: "Douleurs",
    prompt: "As-tu une douleur ou une blessure quand tu cours en ce moment ?",
    options: [
      { id: "no", name: "Non" },
      { id: "yes", name: "Oui" },
    ],
    tip: "Si oui, on en parle avant que tu coures.",
    cta: "Continuer",
  },
  {
    field: "injuryDetail",
    type: "text",
    title: "Douleurs",
    prompt: "Laquelle ?",
    placeholder: "Genou droit depuis 2 semaines…",
    tip: "Seuls les coachs voient cette réponse.",
    cta: "Continuer",
    showIf: (a) => a.injury === "yes",
  },
  {
    field: "goal",
    type: "choice",
    title: "Objectif",
    prompt: "Ton objectif avec le run club ?",
    options: [
      { id: "run30", name: "Courir 30 min sans m'arrêter" },
      { id: "faster", name: "Gagner en vitesse" },
      { id: "race", name: "Préparer une course" },
      { id: "fun", name: "Courir en groupe pour le plaisir" },
    ],
    tip: "Premier objectif pour tout le monde : la Course du Bout de l'An en décembre.",
    cta: "Continuer",
  },
  {
    field: "records",
    type: "records",
    title: "Tes records",
    prompt: "Tes meilleurs temps, si tu les connais",
    tip: "Laisse vide ce que tu n'as jamais couru. Tu pourras les ajouter ou les améliorer plus tard.",
    cta: "Continuer",
    skip: "Je ne les connais pas",
  },
  {
    field: "level",
    type: "choice",
    title: "Niveau",
    prompt: "Ton niveau pour commencer",
    options: levels,
    suggest: suggestLevel,
    tip: "Pas sûr ? Prends le plus prudent — tu pourras changer quand tu veux.",
    suggestTip: (id) =>
      `D'après tes réponses : ${levelById(id).name}. Le test VMA du premier vendredi le confirme.`,
    cta: "Continuer",
  },
  {
    field: "beginnerSessions",
    type: "choice",
    title: "Rythme",
    prompt: "Combien de séances par semaine ?",
    options: [
      { id: 3, name: "3 par semaine", description: "Le vendredi au club + 2 seul·e — le programme tel qu'il est écrit" },
      { id: 2, name: "2 par semaine", description: "Le vendredi + 1 seul·e — même chemin, un peu plus long" },
    ],
    tip: "Au moins un jour entre deux séances. Tu pourras changer dans ton profil.",
    cta: "Continuer",
    showIf: (a) => String(a.level || "").startsWith("beginner"),
  },
  {
    field: "vma",
    type: "vma",
    title: "VMA",
    prompt: "Tu connais ta VMA ?",
    placeholder: "km/h",
    tip: "Pas de souci si non : on la mesure à la première séance et toutes tes allures se calculent dessus.",
    cta: "C'est parti",
    skip: "Je ne la connais pas encore",
  },
];

/*
  Asked only from Profile, never during first run.
*/
export const extraQuestions = [
  {
    field: "hrMax",
    type: "bpm",
    title: "FC max",
    prompt: "Ta fréquence cardiaque max ?",
    placeholder: "bpm",
    tip: "Celle que ta montre a vue de plus haut en fin de course à fond. Elle ajoute la FC à côté de chaque allure.",
  },
];

export const findQuestion = (field) =>
  [...onboarding, ...extraQuestions].find((q) => q.field === field);

/* Index of the next question to show after `from`, skipping ones whose showIf fails */
export const nextIndex = (from, answers) => {
  let i = from + 1;
  while (i < onboarding.length && onboarding[i].showIf && !onboarding[i].showIf(answers)) i++;
  return i;
};

export default onboarding;
