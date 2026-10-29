import React, { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Pressable from "../components/Pressable";
import Glyph from "../components/Glyph";
import SectionLabel from "../components/SectionLabel";
import UserContext from "../variables/context";

import { fetchRoster, beginnerStatus, beginnerSummary, beginnerTonight, beginnerProgress, beginnerConsistency, weeksToThirty, nudgeMessage } from "../lib/coach";
import { PROGRAMMES } from "../lib/beginner";
import { levelById } from "../lib/levels";
import { todayKey } from "../lib/plan";

/*
  Débutants — how the beginners are doing, for the coach. The group in
  numbers up top (how many, active this week, gone quiet, ready for a
  test), then every Débuter runner by programme: the one number that
  matters (how long they run without stopping, towards 30'), their next
  walk-run, three weeks of consistency as dots, the weeks to 30' at their
  rhythm, their status and the injury flag. Quiet ones first, with a
  one-tap SMS in Sean's voice. Tap a runner → CoachAthlete.
*/

const ORDER = { passed: 0, quiet: 1, back: 2, test: 3, new: 4, on: 5 };

const CoachBeginnersScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useContext(UserContext);
  const { colors, typography } = theme;
  const today = todayKey();
  const [athletes, setAthletes] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = () =>
    fetchRoster()
      .then((list) => {
        setAthletes(list.filter((a) => PROGRAMMES[a.level]));
        setError(null);
      })
      .catch((e) => {
        setError(e.message === "setup" ? "setup" : "offline");
        setAthletes((a) => a || []);
      });

  useEffect(() => {
    let alive = true;
    fetchRoster()
      .then((list) => alive && (setAthletes(list.filter((a) => PROGRAMMES[a.level])), setError(null)))
      .catch((e) => alive && (setError(e.message === "setup" ? "setup" : "offline"), setAthletes((a) => a || [])));
    return () => {
      alive = false;
    };
  }, []);

  const refresh = () => {
    setRefreshing(true);
    load().then(() => setRefreshing(false));
  };

  const list = athletes || [];
  const summary = beginnerSummary(list, today);
  const groups = Object.keys(PROGRAMMES)
    .map((id) => ({
      id,
      name: PROGRAMMES[id].name,
      athletes: list
        .filter((a) => a.level === id)
        .map((a) => ({ a, status: beginnerStatus(a, today), tonight: beginnerTonight(a), progress: beginnerProgress(a), consistency: beginnerConsistency(a, today), eta: weeksToThirty(a, today) }))
        .sort((x, y) => ORDER[x.status.id] - ORDER[y.status.id] || x.a.name.localeCompare(y.a.name, "fr")),
    }))
    .filter((g) => g.athletes.length);

  const stat = (value, label) => (
    <View style={styles.stat} key={label}>
      <Text style={[styles.number, { color: colors.text }]}>{value}</Text>
      <Text style={[typography.finePrint, { fontSize: 12, lineHeight: 16 }]}>{label}</Text>
    </View>
  );

  return (
    <SlideScreenContainer title="Débutants" type="back" navigation={navigation} route={route} ignoreKeyboard>
      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accentText} />}
      >
        {athletes !== null && (
          <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.stats}>
              {stat(summary.total, summary.total > 1 ? "débutants" : "débutant")}
              {stat(summary.active, "dans le rythme")}
              {stat(summary.quiet, summary.quiet > 1 ? "silencieux" : "silencieux")}
              {stat(summary.tests, summary.tests > 1 ? "tests à passer" : "test à passer")}
            </View>
            {!!list.length && (
              <Text style={[typography.finePrint, { fontSize: 13 }]}>
                En moyenne {Math.round(list.map((a) => beginnerProgress(a)?.minutes || 0).reduce((t, n) => t + n, 0) / list.length)}{"'"} de course sans arrêt · objectif 30{"'"} pour tout le monde
              </Text>
            )}
            <Text style={[typography.finePrint, { fontSize: 13 }]}>
              {Object.entries(summary.byLevel)
                .filter(([, n]) => n)
                .map(([id, n]) => `${PROGRAMMES[id].name} ${n}`)
                .join(" · ") || "Personne sur un programme Débuter pour l'instant"}
            </Text>
          </View>
        )}

        {athletes === null && <Text style={[typography.finePrint, styles.empty]}>Chargement…</Text>}
        {error === "setup" && <Text style={[typography.finePrint, styles.empty]}>Lance supabase/coach.sql dans Supabase, puis tire pour rafraîchir.</Text>}
        {error === "offline" && <Text style={[typography.finePrint, styles.empty]}>Hors ligne — tire pour réessayer.</Text>}

        {groups.map((g) => (
          <View key={g.id} style={styles.section}>
            <SectionLabel>{g.name}</SectionLabel>
            {g.athletes.map(({ a, status, tonight, progress, consistency, eta }) => {
              const quiet = status.id === "quiet";
              const celebrate = status.id === "passed";
              const flag = a.injury === "yes";
              const sms = () => {
                const { body, phone } = nudgeMessage(a, today);
                if (!phone) return;
                Linking.openURL(`sms:${phone}${Platform.OS === "ios" ? "&" : "?"}body=${encodeURIComponent(body)}`).catch(() => {});
              };
              return (
                <Pressable key={a.id} onPress={() => navigation.navigate("CoachAthlete", { athlete: a })}>
                  <View style={[styles.card, { backgroundColor: colors.card, borderColor: quiet || celebrate ? colors.accentText : colors.border }]}>
                    <View style={styles.top}>
                      <View style={[styles.initial, { backgroundColor: quiet ? colors.accentSoft : colors.background }]}>
                        <Text style={[typography.heading, typography.bold, { color: quiet ? colors.accentText : colors.text }]}>{(a.name.trim()[0] || "?").toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 1 }}>
                        <Text style={[typography.heading, typography.bold]} numberOfLines={1}>
                          {a.name}
                        </Text>
                        <Text style={[typography.finePrint, { fontSize: 13 }]} numberOfLines={1}>
                          {tonight ? `Séance ${Math.min(a.programme.index, 17) + 1}/18 · semaine ${tonight.week} · ${tonight.label}` : levelById(a.level).name}
                          {flag ? " · ⚠︎ douleur" : ""}
                        </Text>
                      </View>
                      <Glyph name="right" size={16} color={colors.text} />
                    </View>
                    {!!progress && (
                      <View style={styles.progressRow}>
                        <View style={[styles.bar, { backgroundColor: colors.background }]}>
                          <View style={[styles.fill, { width: `${Math.max(4, Math.round(progress.pct * 100))}%`, backgroundColor: colors.accent }]} />
                        </View>
                        <Text style={[typography.heading, typography.mono, typography.bold, { fontSize: 15 }]}>
                          {progress.minutes}{"'"}
                          <Text style={[typography.finePrint, { fontSize: 12 }]}> / 30{"'"} sans arrêt</Text>
                        </Text>
                      </View>
                    )}
                    <View style={styles.meta}>
                      <View style={styles.weeks} accessibilityLabel={consistency.label}>
                        {consistency.weeks.map((n, i) => (
                          <View key={i} style={styles.week}>
                            {[0, 1, 2].map((k) => (
                              <View key={k} style={[styles.dot, { backgroundColor: k < n ? colors.accent : colors.border, opacity: k < consistency.wanted ? 1 : 0.35 }]} />
                            ))}
                          </View>
                        ))}
                      </View>
                      <Text style={[typography.finePrint, { fontSize: 12, flex: 1 }]} numberOfLines={1}>
                        {consistency.label}
                        {eta ? ` · 30' dans ≈ ${eta} sem.` : ""}
                      </Text>
                    </View>
                    <View style={styles.statusRow}>
                      <Text style={[typography.finePrint, { fontSize: 14, flex: 1, color: quiet || celebrate ? colors.accentText : colors.text, opacity: quiet || celebrate ? 1 : 0.7 }]}>{status.text}</Text>
                      {(quiet || celebrate) && !!a.phone && (
                        <Pressable onPress={sms} small hitSlop={6}>
                          <View style={[styles.sms, { backgroundColor: colors.accent }]}>
                            <Text style={[typography.heading, typography.bold, { fontSize: 13, color: "white" }]}>{celebrate ? "Bravo 🎉" : "SMS"}</Text>
                          </View>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}

        {athletes !== null && !error && !list.length && <Text style={[typography.finePrint, styles.empty]}>Aucun débutant avec accès à l{"'"}app pour l{"'"}instant.</Text>}
      </ScrollView>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 20 },
  summary: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 10 },
  stats: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, gap: 2 },
  number: { fontFamily: "Archivo-BlackItalic", fontSize: 30, lineHeight: 34, letterSpacing: -0.8 },
  section: { gap: 8 },
  card: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 8 },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  initial: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bar: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  meta: { flexDirection: "row", alignItems: "center", gap: 10 },
  weeks: { flexDirection: "row", gap: 6 },
  week: { flexDirection: "row", gap: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sms: { height: 30, paddingHorizontal: 12, borderRadius: 15, justifyContent: "center" },
  empty: { textAlign: "center", fontSize: 14, paddingVertical: 12 },
});

export default CoachBeginnersScreen;
