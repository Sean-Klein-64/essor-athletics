import React, { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";

import Pressable from "./Pressable";
import Glyph from "./Glyph";
import SectionLabel from "./SectionLabel";
import UserContext from "../variables/context";
import haptics from "../utils/haptics";

import { upcoming, outingDay, comingList, comingLabel, fetchComing, setComing } from "../lib/outings";
import { todayKey } from "../lib/plan";

/*
  "Sorties du club" — the group runs of the next 7 days (Tuesday 7h00 with
  Sean, Saturday 10h00 with Arthur), each with who's coming and a "Je viens"
  button. One tap, one row in Supabase; the names refresh from there.
  `coach` shows every name without the button (the coach view).
  Hidden when nothing is coming up or the shared database is off.
*/

const OutingsCard = ({ coach = false }) => {
  const { theme, preferences } = useContext(UserContext);
  const { colors, typography } = theme;
  const today = todayKey();
  const outings = upcoming(today);
  const ids = outings.map((o) => o.id).join("|");

  const [rows, setRows] = useState([]);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    try {
      setRows(await fetchComing(ids ? ids.split("|") : []));
      setOffline(false);
    } catch {
      setOffline(true);
    }
  };

  useEffect(() => {
    let alive = true;
    fetchComing(ids ? ids.split("|") : [])
      .then((r) => alive && (setRows(r), setOffline(false)))
      .catch(() => alive && setOffline(true));
    return () => {
      alive = false;
    };
  }, [ids]);

  if (!outings.length) return null;

  const toggle = async (outing, me) => {
    setBusy(outing.id);
    haptics.light();
    const ok = await setComing(outing.id, { deviceId: preferences.deviceId, name: preferences.name, level: preferences.level }, !me);
    if (ok) {
      // show it at once, then confirm from the server
      setRows((r) =>
        me
          ? r.filter((x) => !(x.session_id === outing.id && x.device_id === preferences.deviceId))
          : [...r, { session_id: outing.id, device_id: preferences.deviceId, name: preferences.name, level: preferences.level }],
      );
      if (!me) haptics.success();
    }
    await load();
    setBusy(null);
  };

  return (
    <View style={styles.section}>
      <SectionLabel>Sorties du club</SectionLabel>
      {outings.map((o) => {
        const coming = comingList(rows, o.id, preferences.deviceId);
        return (
          <View key={o.id} style={[styles.card, { backgroundColor: colors.card, borderColor: coming.me ? colors.accent : colors.border }]}>
            <View style={styles.top}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[typography.finePrint, { fontSize: 13 }]}>
                  {outingDay(o, today)} · {o.time} · avec {o.lead}
                </Text>
                <Text style={[typography.heading, typography.bold]}>{o.title}</Text>
                <Text style={[typography.finePrint, { fontSize: 13 }]} numberOfLines={2}>
                  {o.place} · {o.note}
                </Text>
              </View>
              {!coach && (
                <Pressable onPress={() => toggle(o, coming.me)} disabled={busy === o.id || offline} hitSlop={6}>
                  <View
                    style={[
                      styles.button,
                      coming.me ? { borderColor: colors.accent, backgroundColor: colors.accentSoft } : { backgroundColor: colors.accent, borderColor: colors.accent },
                      busy === o.id && { opacity: 0.6 },
                    ]}
                  >
                    {coming.me && <Glyph name="check" size={14} color={colors.accentText} strokeWidth={2.6} />}
                    <Text style={[typography.heading, typography.bold, { fontSize: 15, color: coming.me ? colors.accentText : "white" }]}>
                      {coming.me ? "J'y serai" : "Je viens"}
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>
            <View style={[styles.who, { borderTopColor: colors.border }]}>
              <Glyph name="people" size={14} color={colors.text} />
              <Text style={[typography.finePrint, { fontSize: 14, flex: 1 }]} numberOfLines={coach ? 4 : 1}>
                {offline ? "Hors ligne — la liste reviendra" : coach && coming.count ? coming.names.map((n) => (n === "Moi" ? preferences.name || "Moi" : n)).join(", ") : comingLabel(coming)}
              </Text>
              {coming.count > 0 && <Text style={[typography.finePrint, typography.bold, { fontSize: 14, opacity: 1 }]}>{coming.count}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { gap: 10 },
  card: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 10 },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  button: { flexDirection: "row", alignItems: "center", gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1 },
  who: { flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: 1, paddingTop: 10 },
});

export default OutingsCard;
