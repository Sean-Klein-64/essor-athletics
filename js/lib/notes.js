import { SUPABASE_URL, SUPABASE_ANON_KEY, COACH_CODE } from "./config";

/*
  A coach's word on a runner's session, and who was there.

  Coach side (Coach Session Hub → runner → a logged session): one line,
  saved with coach_note(). Member side: member_notes() at launch and when a
  session page opens, kept in preferences.coachNotes = { sessionId: { note,
  coach, at } } so the page reads even offline. session_attendees() gives
  the first names behind "Ils étaient là" on a past session.
  SQL in supabase/notes.sql. Every call fails quietly — nothing on the
  phone depends on them.
*/

const rpc = async (fn, body) => {
  if (!SUPABASE_URL) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 404) throw new Error("setup"); // notes.sql not run yet
  if (!res.ok) throw new Error(`${fn} ${res.status}`);
  return res.json();
};

/* Coach: save (or clear, with an empty note) one line on a runner's session */
export const saveCoachNote = (signupId, sessionId, note, coach, code = COACH_CODE) =>
  rpc("coach_note", { p_code: code, p_signup: signupId, p_session: sessionId, p_note: note || "", p_coach: coach || "" });

/* Coach: every note, { signupId: { sessionId: { note, coach, at } } } */
export const fetchAllNotes = async (code = COACH_CODE) => (await rpc("coach_notes_all", { p_code: code })) || {};

/* Member: my notes, { sessionId: { note, coach, at } } */
export const fetchMyNotes = async (member) => {
  if (!member?.phone) return {};
  return (await rpc("member_notes", { p_phone: member.phone, p_first: member.first })) || {};
};

/* Everyone: first names of who logged a session */
export const fetchAttendees = async (sessionId) => (await rpc("session_attendees", { p_session: sessionId })) || [];

/* "Kamel, Mel et Théo" / "Kamel et 4 autres" — me left out when `me` is given */
export const attendeesLabel = (names = [], me = null) => {
  const others = names.filter((n) => !me || n.toLowerCase() !== String(me).trim().split(" ")[0].toLowerCase());
  if (!others.length) return "";
  if (others.length <= 3) return others.length === 1 ? others[0] : `${others.slice(0, -1).join(", ")} et ${others[others.length - 1]}`;
  return `${others.slice(0, 2).join(", ")} et ${others.length - 2} autres`;
};
