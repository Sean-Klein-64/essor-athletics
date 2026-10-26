import { repTime, formatClock } from "./paces";
import { todayKey } from "./plan";

/*
  The group goal — the race the whole club builds towards. Shown to
  Levels 1–3 (Débuter runners are working towards 30' continuous first).
  Edit here when the next goal is set. `confirmed: false` shows "date à
  confirmer" until the organisers publish it.
*/

const goal = {
  name: "Course du Bout de l'An",
  place: "Bayonne",
  date: "2026-12-20",
  confirmed: true, // Dimanche 20 décembre 2026 — "date confirmée" on Miles Republic (22/10/2026); registration dates not yet announced
  distances: [
    { id: "10k", name: "10 km", metres: 10000, vma: 90 },
    { id: "5k", name: "5 km", metres: 5000, vma: 95 },
  ],
  blurb: "L'objectif de tout le groupe pour finir l'année. Chacun à son allure, tous sur la même ligne.",
  register: "http://www.courseduboutdelan.com/fr/", // inscriptions pas encore ouvertes au 22/10/2026
  // The countdown photo. The app searches Wikimedia Commons with photoQuery;
  // a coach's own photo wins: photo: require("../../assets/goal/bayonne.jpg")
  photoQuery: "Bayonne Nive quais",
  photo: null,
};

/* Whole days from today to the race (negative once it's gone) */
export const daysToGo = (today = todayKey()) => {
  const [y, m, d] = goal.date.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000);
};

/* "48:00" — what a runner's VMA says they can aim for over a distance */
export const targetTime = (distance, vma) => (vma ? formatClock(repTime(distance.metres, vma, distance.vma)) : null);

export default goal;
