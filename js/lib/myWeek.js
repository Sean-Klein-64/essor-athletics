/*
  Sean's own training week — coach view only, members never see this.
  Snapshot of the cycle running up to the Bordeaux Marathon (8 Nov 2026),
  from the Running hub in Notion (Training Week + Sessions). Edit here or,
  later, pull it from Notion.
*/

const myWeek = [
  {
    day: "Lundi",
    title: "Strength A",
    kind: "strength",
    lines: [
      "Bench + banded pull-up superset",
      "DB press",
      "Landmine row",
    ],
  },
  {
    day: "Mardi",
    title: "Run — Zone 2",
    kind: "run",
    lines: ["1:15 continu, Zone 2 tout du long (121–141 bpm)", "Garmin : Run 1:15, plage FC 121–141", "L'allure n'a pas d'importance — si la FC monte, ralentir"],
  },
  {
    day: "Mercredi",
    title: "Run — Endurance Steady",
    kind: "run",
    lines: ["3 km facile", "12 km Endurance Steady — 4:35–5:00/km, FC 149–170", "3 km facile · 18 km, ~1:15"],
  },
  {
    day: "Jeudi",
    title: "Strength B",
    kind: "strength",
    lines: ["Feet-elevated deadlift", "Bulgarian split squat", "RDL", "Weighted pull-up"],
  },
  {
    day: "Vendredi",
    title: "Run — Threshold",
    kind: "run",
    lines: ["Seuil (Hyrox threshold work)", "Puis run club 16:30, piste de Floride"],
  },
  { day: "Samedi", title: "Off", kind: "rest", lines: ["Le seul jour sans entraînement"] },
  {
    day: "Dimanche",
    title: "Long Run",
    kind: "run",
    lines: ["Comme écrit dans la feuille de prep (Long Run Design)"],
  },
];

export default myWeek;
