import React, { useCallback, useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Pressable from "../components/Pressable";
import UserContext from "../variables/context";

import useSessions from "../lib/store";
import { levelById, default as levels } from "../lib/levels";
import { paceFromSpeed, speedAt } from "../lib/paces";
import { loadCoachData, wodifyAttendance, effectiveLevel } from "../lib/coach";

/*
  Athlètes — everyone in the club, outside any session (same as the
  "Athlètes" part of docs/coach.html): level, VMA, sessions present from
  Wodify, last session, 6' test and paces. Search, level filter, sort.
  Tap a runner → CoachAthlete.
*/

const paceAt = (vma, pct) => paceFromSpeed(speedAt(vma, pct));
const clock = (sec) => { const s = Math.round(sec); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const ORDER = levels.map((l) => l.id).reverse(); // Level 1 first … Débuter A last
const SHORT = { level1: "L1", level2: "L2", level3: "L3", beginnerA: "Déb. A", beginnerB: "Déb. B", beginnerC: "Déb. C" };
const W = { name: 150, lvl: 54, vma: 50, att: 52, last: 60, test: 66, pace: 64, ef: 100 };

const Chip = ({ on, label, onPress, colors, typography }) => (
  <Pressable onPress={onPress} small>
    <View style={[styles.chip, on ? { backgroundColor: colors.accentSoft, borderColor: colors.accentText } : { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[typography.finePrint, { opacity: 1, fontSize: 14, color: colors.text }]}>{label}</Text>
    </View>
  </Pressable>
);
const C = ({ w, children, hot, left, bold, colors, typography }) => (
  <Text
    numberOfLines={1}
    style={[typography.finePrint, typography.mono, { width: w, opacity: 1, fontSize: hot ? 15 : 14, textAlign: left ? "left" : "right", color: hot ? colors.accentText : colors.text, fontWeight: hot || bold ? "600" : "400" }]}
  >
    {children}
  </Text>
);

const CoachAthletesScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useContext(UserContext);
  const { colors, typography } = theme;
  const { sessions } = useSessions();

  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState(null);
  const [sort, setSort] = useState("name");

  const load = useCallback(
    (force) =>
      loadCoachData({ force })
        .then((d) => { setData(d); setError(false); })
        .catch(() => { setError(true); setData((x) => x || { roster: [], wodify: null }); }),
    [],
  );
  useEffect(() => { load(false); }, [load]);
  const refresh = () => { setRefreshing(true); load(true).then(() => setRefreshing(false)); };

  const roster = data?.roster || [];
  const wodify = data?.wodify || null;
  const rows = roster.map((a) => {
    const att = wodify ? wodifyAttendance(a, sessions, wodify) : [];
    const counted = att.filter((x) => x.status === "present" || x.status === "absent");
    const lastHere = [...att].reverse().find((x) => x.status === "present");
    return { a, lvl: effectiveLevel(a), here: counted.filter((x) => x.status === "present").length, of: counted.length, last: lastHere?.session.date || null };
  });
  const rank = (id) => (ORDER.includes(id) ? ORDER.indexOf(id) : 99);
  const sorts = {
    name: (x, y) => x.a.name.localeCompare(y.a.name, "fr"),
    vma: (x, y) => (y.a.vma || 0) - (x.a.vma || 0) || x.a.name.localeCompare(y.a.name, "fr"),
    level: (x, y) => rank(x.lvl) - rank(y.lvl) || (y.a.vma || 0) - (x.a.vma || 0),
    att: (x, y) => y.here - x.here || x.a.name.localeCompare(y.a.name, "fr"),
  };
  const shown = rows
    .filter((r) => !level || r.lvl === level)
    .filter((r) => !q || norm(r.a.name).includes(norm(q)))
    .sort(sorts[sort]);
  const counted = sessions.filter((s) => Array.isArray(wodify?.sessions?.[s.date]?.attended));
  const avg = counted.length ? Math.round(counted.reduce((t, s) => t + wodify.sessions[s.date].attended.length, 0) / counted.length) : null;
  const levelsPresent = ORDER.filter((id) => rows.some((r) => r.lvl === id));

  return (
    <SlideScreenContainer title="Athlètes" type="back" navigation={navigation} route={route}>
      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accentText} />}
      >
        <View style={styles.stats}>
          {[
            ["Athlètes", roster.length],
            ["Avec VMA", roster.filter((a) => a.vma).length],
            ["Moy. présents", avg ?? "—"],
            ["Douleurs", roster.filter((a) => a.injury === "yes").length],
          ].map(([k, v]) => (
            <View key={k} style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[typography.finePrint, styles.statK]} numberOfLines={1}>{k}</Text>
              <Text style={[styles.statV, { color: k === "Douleurs" && v ? "#E9C46A" : colors.text }]}>{data ? v : "…"}</Text>
            </View>
          ))}
        </View>

        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Chercher un athlète"
          placeholderTextColor={colors.text + "88"}
          style={[styles.search, typography.body, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ marginHorizontal: -20 }}>
          <Chip colors={colors} typography={typography} on={!level} label="Tous" onPress={() => setLevel(null)} />
          {levelsPresent.map((id) => <Chip colors={colors} typography={typography} key={id} on={level === id} label={SHORT[id] || levelById(id).name} onPress={() => setLevel(id)} />)}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ marginHorizontal: -20 }}>
          <Text style={[typography.finePrint, { alignSelf: "center", fontSize: 13 }]}>Trier :</Text>
          {[["name", "Nom"], ["vma", "VMA"], ["level", "Niveau"], ["att", "Présences"]].map(([id, t]) => <Chip colors={colors} typography={typography} key={id} on={sort === id} label={t} onPress={() => setSort(id)} />)}
        </ScrollView>

        {error && <Text style={[typography.finePrint, styles.empty]}>Hors ligne — tire pour réessayer.</Text>}
        {data === null && <Text style={[typography.finePrint, styles.empty]}>Chargement…</Text>}

        {!!shown.length && (
          <View style={[styles.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={[styles.tr, { borderTopWidth: 0 }]}>
                  {[["Athlète", W.name], ["Niv.", W.lvl], ["VMA", W.vma], ["Prés.", W.att], ["Dern.", W.last], ["Test 6'", W.test], ["VMA", W.pace], ["10 km", W.pace], ["Footing", W.ef]].map(([h, w], i) => (
                    <Text key={i} style={[typography.finePrint, styles.th, { width: w, textAlign: i ? "right" : "left" }]}>{h}</Text>
                  ))}
                </View>
                {shown.map(({ a, lvl, here, of, last }) => (
                  <Pressable key={a.id} onPress={() => navigation.navigate("CoachAthlete", { athlete: a, wodify })} animation={false}>
                    <View style={[styles.tr, { borderTopColor: colors.border }]}>
                      <View style={{ width: W.name, flexDirection: "row", alignItems: "center", gap: 6 }}>
                        {a.injury === "yes" && <View style={styles.pain} />}
                        <Text numberOfLines={1} style={[typography.finePrint, typography.bold, { flex: 1, opacity: 1, fontSize: 14 }]}>{a.name}</Text>
                      </View>
                      <C colors={colors} typography={typography} w={W.lvl}>{SHORT[lvl] || "?"}</C>
                      <C colors={colors} typography={typography} w={W.vma}>{a.vma ? a.vma.toFixed(1) : "—"}</C>
                      <C colors={colors} typography={typography} w={W.att} hot>{of ? `${here}/${of}` : "—"}</C>
                      <C colors={colors} typography={typography} w={W.last}>{last ? `${last.slice(8)}/${last.slice(5, 7)}` : "—"}</C>
                      <C colors={colors} typography={typography} w={W.test}>{a.vmaTestMetres ? `${a.vmaTestMetres} m` : "—"}</C>
                      <C colors={colors} typography={typography} w={W.pace}>{a.vma ? clock(paceAt(a.vma, 100)) : "—"}</C>
                      <C colors={colors} typography={typography} w={W.pace}>{a.vma ? clock(paceAt(a.vma, 90)) : "—"}</C>
                      <C colors={colors} typography={typography} w={W.ef}>{a.vma ? `${clock(paceAt(a.vma, 68))}–${clock(paceAt(a.vma, 63))}` : "—"}</C>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
        {data && !shown.length && <Text style={[typography.finePrint, styles.empty]}>Personne ici.</Text>}
        <Text style={[typography.finePrint, { fontSize: 13 }]}>Tape un nom pour son profil complet · point rouge = douleur signalée · fais glisser pour les allures.</Text>
      </ScrollView>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  stats: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8 },
  statK: { fontSize: 10.5, letterSpacing: 0.6, textTransform: "uppercase" },
  statV: { fontFamily: "Archivo-BlackItalic", fontSize: 26, lineHeight: 30 },
  search: { height: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 17 },
  chips: { flexDirection: "row", gap: 8, paddingHorizontal: 20 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, justifyContent: "center" },
  table: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  tr: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, height: 46, borderTopWidth: 1 },
  th: { fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase" },
  pain: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E07A5F" },
  empty: { textAlign: "center", fontSize: 14, paddingVertical: 12 },
});

export default CoachAthletesScreen;
