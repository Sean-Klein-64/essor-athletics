import { useCallback, useContext, useEffect, useState } from "react";

import UserContext from "../variables/context";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

/*
  "Je viens" for a session: who's coming, and a toggle for this runner.

  Saved on the phone (preferences.going) so the button answers instantly
  and works offline, and mirrored to the shared `attendance` table when
  Supabase is set up (js/lib/config.js) so everyone sees the same list.
  There are no accounts yet: the phone's random deviceId stands in for one.
*/

export const isShared = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);

const headers = () => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
});

const table = `${SUPABASE_URL}/rest/v1/attendance`;

export const fetchAttendees = async (sessionId) => {
  const res = await fetch(
    `${table}?session_id=eq.${encodeURIComponent(sessionId)}&select=device_id,name,level&order=created_at`,
    { headers: headers() },
  );
  if (!res.ok) throw new Error(`attendance ${res.status}`);
  return res.json();
};

const join = (sessionId, { deviceId, name, level }) =>
  fetch(`${table}?on_conflict=session_id,device_id`, {
    method: "POST",
    headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ session_id: sessionId, device_id: deviceId, name: name || "", level }),
  });

const leave = (sessionId, deviceId) =>
  fetch(
    `${table}?session_id=eq.${encodeURIComponent(sessionId)}&device_id=eq.${encodeURIComponent(deviceId)}`,
    { method: "DELETE", headers: headers() },
  );

/*
  const { going, toggle, attendees, shared } = useAttendance(session.id)
    going      this runner said they're coming
    attendees  [{ device_id, name, level }] from the shared list (or [] offline)
*/
const useAttendance = (sessionId) => {
  const { preferences, setPreference } = useContext(UserContext);
  const [attendees, setAttendees] = useState([]);
  const [failed, setFailed] = useState(false);
  const going = !!preferences.going?.[sessionId];
  const shared = isShared();

  const refresh = useCallback(async () => {
    if (!shared) return;
    try {
      setAttendees(await fetchAttendees(sessionId));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [sessionId, shared]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = async () => {
    const next = !going;
    const map = { ...(preferences.going || {}) };
    if (next) map[sessionId] = true;
    else delete map[sessionId];
    await setPreference("going", map);

    if (!shared) return;
    // Show the change straight away, then line up with the server
    const me = { device_id: preferences.deviceId, name: preferences.name, level: preferences.level };
    setAttendees((list) =>
      next
        ? [...list.filter((a) => a.device_id !== me.device_id), me]
        : list.filter((a) => a.device_id !== me.device_id),
    );
    try {
      if (next) await join(sessionId, preferences);
      else await leave(sessionId, preferences.deviceId);
    } catch {
      setFailed(true);
    }
    refresh();
  };

  return { going, toggle, attendees, shared, failed, refresh };
};

export default useAttendance;
