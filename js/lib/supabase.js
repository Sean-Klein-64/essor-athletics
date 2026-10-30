import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

/*
  The one place the app talks to Supabase. Plain REST over fetch — no
  client library, the anon key ships with the app and the SQL functions
  decide what it may do (supabase/*.sql).

    rpc("member_profile", { p_phone, p_first })   → the function's JSON result
    rest("sessions?select=*&order=date")           → GET on a table
    rest("sessions?on_conflict=id", { method: "POST", body, prefer: "…" })
*/

export const isConfigured = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);

const headers = (prefer) => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  ...(prefer ? { Prefer: prefer } : {}),
});

/* Call a Postgres function. Throws `Error("<name> <status>")` on a non-2xx reply. */
export const rpc = async (name, args = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const err = new Error(`${name} ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
};

/* A table request. Returns the Response so callers decide what to read. */
export const rest = (path, { method = "GET", body, prefer } = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: headers(prefer),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
