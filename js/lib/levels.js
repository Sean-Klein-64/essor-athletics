/*
  The run club levels. Beginners follow their own run/walk programme
  (A → B → C, building up to 30' of continuous running) and then move into
  Level 3. Levels 3, 2 and 1 do the same Friday session at the same
  intensity — Level 3 with the least volume, Level 1 with the most.

  `id` is what sessions use as keys (see js/lib/sessions.js).
  Listed in the order a runner climbs them.
*/

const levels = [
  {
    id: "beginnerA",
    name: "Beginner A",
    group: "beginner",
    description: "Je débute ou je reprends — on alterne marche et course",
  },
  {
    id: "beginnerB",
    name: "Beginner B",
    group: "beginner",
    description: "Je cours une dizaine de minutes sans m'arrêter",
  },
  {
    id: "beginnerC",
    name: "Beginner C",
    group: "beginner",
    description: "Je cours 20 minutes, je vise les 30",
  },
  {
    id: "level3",
    name: "Level 3",
    group: "club",
    description: "Je cours 30 minutes sans m'arrêter",
  },
  {
    id: "level2",
    name: "Level 2",
    group: "club",
    description: "Je cours régulièrement, plusieurs fois par semaine",
  },
  {
    id: "level1",
    name: "Level 1",
    group: "club",
    description: "Je m'entraîne beaucoup et je cherche la performance",
  },
];

export const levelById = (id) => levels.find((l) => l.id === id) || levels[3];

export default levels;
