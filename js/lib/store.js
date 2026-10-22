import { useCallback, useContext, useEffect, useState } from "react";

import UserContext from "../variables/context";
import builtIn from "./sessions";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

/*
  Where the club sessions come from.

    1. js/lib/sessions.js — ships inside the app (the seed, and the fallback)
    2. the shared `sessions` table in Supabase — what coaches write in the app
    3. preferences.coachSessions — a coach's sessions saved on their own
       phone when Supabase isn't set up (only they see them)

  A later layer wins for the same id. `useSessions()` gives the merged list
  and a `save` for coaches.
*/

export const isShared = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);

const headers = () => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
});

const table = `${SUPABASE_URL}/rest/v1/sessions`;

const fromRow = (r) => ({
  id: r.id,
  date: r.date,
  title: r.title,
  kind: r.kind,
  summary: r.summary || "",
  warmup: r.body?.warmup || [],
  cooldown: r.body?.cooldown || [],
  levels: r.body?.levels || {},
  author: r.author,
  hidden: !!r.hidden,
});

const toRow = (s, author) => ({
  id: s.id,
  date: s.date,
  title: s.title,
  kind: s.kind,
  summary: s.summary,
  body: { warmup: s.warmup, cooldown: s.cooldown, levels: s.levels },
  author,
  hidden: !!s.hidden,
  updated_at: new Date().toISOString(),
});

export const fetchRemote = async () => {
  const res = await fetch(`${table}?select=*&order=date`, { headers: headers() });
  if (!res.ok) throw new Error(`sessions ${res.status}`);
  return (await res.json()).map(fromRow);
};

const upsertRemote = (s, author) =>
  fetch(`${table}?on_conflict=id`, {
    method: "POST",
    headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(toRow(s, author)),
  });

export const merge = (...layers) => {
  const byId = new Map();
  layers.flat().forEach((s) => s && byId.set(s.id, s));
  return [...byId.values()].filter((s) => !s.hidden).sort((a, b) => (a.date < b.date ? -1 : 1));
};

const useSessions = () => {
  const { preferences, setPreference } = useContext(UserContext);
  const [remote, setRemote] = useState([]);
  const [loaded, setLoaded] = useState(!isShared());

  const refresh = useCallback(async () => {
    if (!isShared()) return;
    try {
      setRemote(await fetchRemote());
    } catch {
      /* offline: built-in + local keep working */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const local = Object.values(preferences.coachSessions || {});
  const sessions = merge(builtIn, remote, local);

  /* Coach: save (or hide) a session — shared when Supabase is on, else on this phone */
  const save = async (session) => {
    const map = { ...(preferences.coachSessions || {}), [session.id]: session };
    await setPreference("coachSessions", map);
    if (isShared()) {
      try {
        await upsertRemote(session, preferences.name);
        await refresh();
      } catch {
        /* kept locally, will show once online and saved again */
      }
    }
  };

  return { sessions, save, refresh, loaded, shared: isShared(), byId: (id) => sessions.find((s) => s.id === id) };
};

export default useSessions;
