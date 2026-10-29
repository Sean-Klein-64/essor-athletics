import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import { levelById } from "./levels";

/*
  "Le groupe ce cycle" — the club's progress since the cycle began, for the
  Home card: runners in, sessions logged (by how many), VMA tests recorded,
  and who moved up a level. One call, club_pulse() in supabase/club.sql;
  first names only. Fails quietly — the card just doesn't show.
*/

/* The first club session's date, or 8 weeks ago when there is none yet */
export const cycleStart = (sessions = [], today) => {
  const dates = sessions.map((s) => s.date).filter(Boolean).sort();
  if (dates[0]) return dates[0];
  const [y, m, d] = today.split("-").map(Number);
  const back = new Date(y, m - 1, d - 56);
  return `${back.getFullYear()}-${String(back.getMonth() + 1).padStart(2, "0")}-${String(back.getDate()).padStart(2, "0")}`;
};

export const fetchPulse = async (since) => {
  if (!SUPABASE_URL) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/club_pulse`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_since: since }),
  });
  if (!res.ok) throw new Error(`club_pulse ${res.status}`);
  return res.json();
};

/* The card's lines from a pulse — [] when there is nothing worth saying yet */
export const pulseLines = (pulse) => {
  if (!pulse) return [];
  const lines = [];
  if (pulse.runners) lines.push({ key: "runners", value: String(pulse.runners), label: pulse.runners > 1 ? "coureurs dans le club" : "coureur dans le club" });
  if (pulse.sessions) {
    lines.push({
      key: "sessions",
      value: String(pulse.sessions),
      label: `${pulse.sessions > 1 ? "séances faites" : "séance faite"}${pulse.active ? ` par ${pulse.active}` : ""}`,
    });
  }
  if (pulse.tests) lines.push({ key: "tests", value: String(pulse.tests), label: pulse.tests > 1 ? "tests VMA enregistrés" : "test VMA enregistré" });
  return lines;
};

/* "Mehdi → Level 3" for each runner who moved up */
export const passageLines = (pulse) => (pulse?.passages || []).map((p) => `${p.name} → ${levelById(p.level).name}`);
