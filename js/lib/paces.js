/*
  All the running maths in one place: VMA → speed → pace → target time.
  Pure functions, no React — tested by scripts/test_paces.js.

  VMA is in km/h. A percentage of VMA gives a speed; a speed gives a pace
  (seconds per km); a pace and a distance give the time to aim for.
*/

/* Speed in km/h at a % of VMA */
export const speedAt = (vma, pct) => (vma * pct) / 100;

/* Seconds per km at a speed in km/h */
export const paceFromSpeed = (kmh) => 3600 / kmh;

/* Time (s) to cover `metres` at `pct` % of `vma` */
export const repTime = (metres, vma, pct) =>
  (metres / 1000) * paceFromSpeed(speedAt(vma, pct));

/* Distance (m) covered in `seconds` at `pct` % of `vma` */
export const repDistance = (seconds, vma, pct) =>
  (speedAt(vma, pct) * 1000 * seconds) / 3600;

/* The 6-minute test: metres covered ÷ 100 = VMA in km/h */
export const vmaFromSixMinutes = (metres) => Math.round((metres / 100) * 10) / 10;

/* 75 → "1:15", 3725 → "1:02:05"; rounds to the second */
export const formatClock = (seconds) => {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
};

/* Pace for display: 230 → "3:50 /km" */
export const formatPace = (secondsPerKm) => `${formatClock(secondsPerKm)} /km`;

/* A duration written the French way: 60 → 1', 90 → 1'30, 30 → 30" */
export const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (!m) return `${s}"`;
  return s ? `${m}'${String(s).padStart(2, "0")}` : `${m}'`;
};

/* 400 → "400 m", 1500 → "1,5 km" */
export const formatDistance = (metres) => {
  if (metres < 1000) return `${Math.round(metres)} m`;
  const km = Math.round(metres / 100) / 10;
  return `${String(km).replace(".", ",")} km`;
};

/* "15,5" or "15.5" → 15.5; nonsense → null */
export const parseDecimal = (text) => {
  const n = Number(String(text).trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/* "41:23", "1:32:10" or "41'23" → seconds; nonsense → null */
export const parseClock = (text) => {
  const parts = String(text).trim().replace(/['"h]/g, ":").replace(/:$/, "").split(":");
  if (!parts.length || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  if (nums.slice(1).some((n) => n > 59)) return null;
  const seconds = nums.reduce((total, n) => total * 60 + n, 0);
  return seconds > 0 ? seconds : null;
};

/* "3:00" (as written in sessions) → 180; a number is taken as seconds already */
export const toSeconds = (value) =>
  typeof value === "number" ? value : parseClock(value);

/*
  The paces every runner gets from their VMA, shown on the profile.

  Sean's zones, from the Training Zones table in his Running Progression
  Plan (Notion): Pfitzinger's categories with % HRmax. The paces there were
  written for his VMA (~18.3 km/h), so they're stored here as % VMA and
  scale to anyone's VMA; HR shows once the runner adds their max HR.

    vma: [low, high] % VMA  — null at one end = open ("slower than", "faster than")
    vma: null               — HR only, no pace
    hr:  [low, high] % HRmax — null at one end = open
*/
export const ZONES = [
  { id: "recovery", name: "Recovery", vma: [null, 62], hr: [null, 76], note: "Juste faire circuler le sang — le lendemain d'une séance dure" },
  { id: "zone2", name: "Zone 2", vma: null, hr: [60, 70], note: "Base aérobie facile, à la FC uniquement" },
  { id: "ga", name: "General Aerobic", vma: [63, 68], hr: [70, 81], note: "Le gros de la semaine : footing, base aérobie" },
  { id: "endurance", name: "Endurance", vma: [66, 72], hr: [74, 84], note: "Sorties longues et moyennes-longues" },
  { id: "mp", name: "Marathon Pace", vma: [77, 80], hr: [79, 88], note: "Allure marathon — rythme de course" },
  { id: "lt", name: "Lactate Threshold", vma: [87, 89], hr: [80, 91], note: "Seuil — tenable 30 à 60'" },
  { id: "vo2", name: "VO2max", vma: [93, 97], hr: [94, 98], note: "Répétitions de 2 à 6'" },
  { id: "speed", name: "Speed / Strides", vma: [98, null], hr: null, note: "Au ressenti, relâché, jamais crispé" },
];

export const zoneById = (id) => ZONES.find((z) => z.id === id);

/* Pace for a % VMA range: "4:49 – 5:12 /km", "> 5:15 /km", "< 3:21 /km", or "FC uniquement" */
export const zonePace = (vma, range) => {
  if (!range) return "FC uniquement";
  const [low, high] = range;
  const at = (pct) => paceFromSpeed(speedAt(vma, pct));
  if (low == null) return `> ${formatPace(at(high))}`;
  if (high == null) return `< ${formatPace(at(low))}`;
  return low === high ? formatPace(at(high)) : `${formatClock(at(high))} – ${formatPace(at(low))}`;
};

/* Heart rate for a % HRmax range: "141 – 164 bpm", "< 154 bpm"; null if no HR target */
export const zoneHeartRate = (hrMax, range) => {
  if (!range || !hrMax) return null;
  const [low, high] = range;
  const bpm = (pct) => Math.round((hrMax * pct) / 100);
  if (low == null) return `< ${bpm(high)} bpm`;
  if (high == null) return `> ${bpm(low)} bpm`;
  return `${bpm(low)} – ${bpm(high)} bpm`;
};

/* Average pace of a race: distance in metres, time in seconds */
export const racePace = (metres, seconds) => seconds / (metres / 1000);
