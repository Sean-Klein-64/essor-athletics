/*
  Personal bests. Each distance keeps every time the runner has logged,
  so the profile can show the best one and how it has come down.

  Saved on the phone as preferences.records:
    { "10k": [{ seconds: 2483, date: "2026-11-15" }, …], … }
*/

export const DISTANCES = [
  { id: "5k", name: "5 km", metres: 5000, placeholder: "22:30" },
  { id: "10k", name: "10 km", metres: 10000, placeholder: "45:00" },
  { id: "half", name: "Semi-marathon", metres: 21097.5, placeholder: "1:40:00" },
  { id: "marathon", name: "Marathon", metres: 42195, placeholder: "3:30:00" },
];

export const distanceById = (id) => DISTANCES.find((d) => d.id === id);

/* Fastest entry for a distance, or undefined */
export const best = (records = {}, id) =>
  (records[id] || []).reduce(
    (fastest, entry) => (!fastest || entry.seconds < fastest.seconds ? entry : fastest),
    undefined,
  );

/* Newest first, for the history list */
export const history = (records = {}, id) =>
  [...(records[id] || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
