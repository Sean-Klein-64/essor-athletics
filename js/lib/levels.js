/*
  The run club levels, from "Essor Athletics — The Level System" (Notion).
  Débuter A → B → C are walk-run programmes (js/lib/beginner.js) building
  up to 30' of continuous running; then Level 3. Levels 3, 2 and 1 do the same Friday session at the same
  intensity — Level 3 with the least volume, Level 1 with the most.

  `id` is what sessions use as keys (see js/lib/sessions.js).
  Listed in the order a runner climbs them.
*/

const levels = [
  {
    id: "beginnerA",
    name: "Débuter A",
    group: "beginner",
    description: "Tu ne cours pas encore 5 minutes sans t'arrêter",
  },
  {
    id: "beginnerB",
    name: "Débuter B",
    group: "beginner",
    description: "Tu cours 5 minutes, c'est dur vers 15",
  },
  {
    id: "beginnerC",
    name: "Débuter C",
    group: "beginner",
    description: "Tu cours 15 minutes, c'est dur vers 30",
  },
  {
    id: "level3",
    name: "Level 3",
    group: "club",
    description: "Tu cours 30 minutes sans t'arrêter",
  },
  {
    id: "level2",
    name: "Level 2",
    group: "club",
    description: "À l'aise avec le fractionné",
  },
  {
    id: "level1",
    name: "Level 1",
    group: "club",
    description: "Expérimenté, gros volume",
  },
];

export const levelById = (id) => levels.find((l) => l.id === id) || levels[3];

export default levels;
