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
  Ranges are min–max % of VMA.
*/
export const ZONES = [
  { id: "ef", name: "Footing (EF)", range: [65, 75], note: "Tu peux parler en courant" },
  { id: "seuil", name: "Seuil", range: [85, 85], note: "Dur mais tenable 20 à 30'" },
  { id: "10k", name: "Allure 10 km", range: [90, 90], note: "Ce que tu tiens sur 10 km" },
  { id: "vma", name: "VMA", range: [100, 100], note: "Tenable 4 à 6' — fractionné court" },
];

/* "4:10 – 4:49 /km" for a range, "3:50 /km" for a single % */
export const zonePace = (vma, [low, high]) => {
  const slow = paceFromSpeed(speedAt(vma, low));
  const fast = paceFromSpeed(speedAt(vma, high));
  return low === high
    ? formatPace(fast)
    : `${formatClock(fast)} – ${formatPace(slow)}`;
};

/* Average pace of a race: distance in metres, time in seconds */
export const racePace = (metres, seconds) => seconds / (metres / 1000);
