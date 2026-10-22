import levels from "./levels";

/*
  The first-run questions, one per screen (QuestionScreen walks this list).
  Each answer is saved under `field`; Profile reopens a question with
  { field } to change it.

  Types:
    "text"    — a typed answer
    "choice"  — one option from `options` ({ id, name, description })
    "vma"     — VMA in km/h; can be skipped (measured at the first session)
*/

const onboarding = [
  {
    field: "name",
    type: "text",
    title: "Prénom",
    prompt: "Comment tu t'appelles ?",
    placeholder: "Prénom",
    tip: "C'est ce que les autres verront dans la liste « Je viens ».",
    cta: "Continuer",
  },
  {
    field: "level",
    type: "choice",
    title: "Niveau",
    prompt: "Où tu en es aujourd'hui ?",
    options: levels,
    tip: "Pas sûr ? Prends le plus prudent — tu pourras changer quand tu veux.",
    cta: "Continuer",
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

export default onboarding;
