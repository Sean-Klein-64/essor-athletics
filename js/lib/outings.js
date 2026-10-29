import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import { todayKey } from "./plan";

/*
  The club's group runs around Friday — "Je viens".

  Friday is booked in Wodify. The other runs are easy group outings with a
  lead: nobody books, you just say you're coming so the lead knows who to
  wait for and everyone sees they won't be running alone. Said with one tap,
  kept in Supabase's attendance table (schema.sql §1: session_id, device_id,
  name, level), one row per phone per outing.

  OUTINGS is the weekly pattern; upcoming() turns it into dated outings
  (id "outing-tue-2026-11-03") for the days ahead. Pure helpers first, the
  two Supabase calls at the bottom.
*/

export const OUTINGS = [
  { key: "tue", weekday: 2, day: "Mardi", time: "7h00", title: "Footing du mardi", lead: "Sean", place: "Départ de la salle", note: "Facile, en groupe, 40 à 50 minutes. On adapte l'allure au groupe." },
  { key: "sat", weekday: 6, day: "Samedi", time: "10h00", title: "Sortie du samedi", lead: "Arthur", place: "Départ de la salle", note: "La sortie longue de la semaine, à allure tranquille. Tous niveaux." },
];

const addDays = (key, n) => {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d + n);
  return todayKey(date);
};

const weekdayOf = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};

/*
  The outings in the next `days` days (today included), in date order:
    [{ id, key, date, day, time, title, lead, place, note }]
*/
export const upcoming = (today = todayKey(), days = 7) => {
  const list = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    OUTINGS.filter((o) => o.weekday === weekdayOf(date)).forEach((o) => {
      list.push({ ...o, id: `outing-${o.key}-${date}`, date });
    });
  }
  return list;
};

/* "Mardi 3 novembre" — from the outing's date (same wording as formatDay, without the year) */
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const outingDay = (outing, today = todayKey()) => {
  if (outing.date === today) return "Aujourd'hui";
  if (outing.date === addDays(today, 1)) return "Demain";
  const [, m, d] = outing.date.split("-").map(Number);
  return `${outing.day} ${d} ${MONTHS[m - 1]}`;
};

/*
  The "who's coming" list for one outing, me first, then the others by name:
    { count, me: true | false, names: ["Sean", "Mel", …] }
  rows are attendance rows ({ session_id, device_id, name, level }).
*/
export const comingList = (rows = [], outingId, deviceId) => {
  const mine = rows.filter((r) => r.session_id === outingId);
  const me = mine.some((r) => r.device_id === deviceId);
  const names = mine
    .filter((r) => r.device_id !== deviceId)
    .map((r) => (r.name || "").trim() || "Quelqu'un")
    .sort((a, b) => a.localeCompare(b, "fr"));
  return { count: mine.length, me, names: me ? ["Moi", ...names] : names };
};

/* "Toi, Mel et 2 autres" / "Mel et Arthur" / "Personne pour l'instant" */
export const comingLabel = ({ count, me, names }) => {
  if (!count) return "Personne pour l'instant";
  const shown = names.slice(0, 3).map((n) => (n === "Moi" ? "Toi" : n));
  const rest = count - shown.length;
  if (rest > 0) return `${shown.join(", ")} et ${rest} ${rest > 1 ? "autres" : "autre"}`;
  if (shown.length === 1) return me ? "Toi, pour l'instant" : shown[0];
  return `${shown.slice(0, -1).join(", ")} et ${shown[shown.length - 1]}`;
};

/* ── Supabase ─────────────────────────────────────────────────────────── */

const headers = () => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
});

/* Every attendance row for these outings */
export const fetchComing = async (outingIds) => {
  if (!SUPABASE_URL || !outingIds.length) return [];
  const list = outingIds.map((id) => `"${id}"`).join(",");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/attendance?session_id=in.(${list})&select=session_id,device_id,name,level`, { headers: headers() });
  if (!res.ok) throw new Error(`attendance ${res.status}`);
  return res.json();
};

/* Say I'm coming (upsert my row) or that I'm not (delete it) */
export const setComing = async (outingId, { deviceId, name, level }, coming) => {
  if (!SUPABASE_URL || !deviceId) return false;
  const res = coming
    ? await fetch(`${SUPABASE_URL}/rest/v1/attendance?on_conflict=session_id,device_id`, {
        method: "POST",
        headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ session_id: outingId, device_id: deviceId, name: (name || "").slice(0, 60), level: level || null }),
      })
    : await fetch(`${SUPABASE_URL}/rest/v1/attendance?session_id=eq.${encodeURIComponent(outingId)}&device_id=eq.${encodeURIComponent(deviceId)}`, {
        method: "DELETE",
        headers: headers(),
      });
  return res.ok;
};
