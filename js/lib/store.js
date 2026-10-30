import { useCallback, useContext, useEffect, useState } from "react";

import UserContext from "../variables/context";
import builtIn from "./sessions";
import { isConfigured, rest } from "./supabase";

/*
  Where the club sessions come from.

    1. js/lib/sessions.js — ships inside the app (the seed, and the fallback)
    2. the shared `sessions` table in Supabase — what coaches write in the app
    3. preferences.coachSessions — a coach's sessions saved on their own
       phone when Supabase isn't set up (only they see them)

  A later layer wins for the same id. `useSessions()` gives the merged list
  and a `save` for coaches.
*/

export const isShared = isConfigured;

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
  const res = await rest("sessions?select=*&order=date");
  if (!res.ok) throw new Error(`sessions ${res.status}`);
  return (await res.json()).map(fromRow);
};

const upsertRemote = (s, author) =>
  rest("sessions?on_conflict=id", {
    method: "POST",
    body: toRow(s, author),
    prefer: "resolution=merge-duplicates,return=minimal",
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
    let cancelled = false;
    if (!isShared()) return undefined;
    fetchRemote()
      .then((rows) => !cancelled && setRemote(rows))
      .catch(() => {
        /* offline: built-in + local keep working */
      })
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

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
