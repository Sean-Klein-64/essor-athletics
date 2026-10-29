import React, { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SlideScreenContainer from "../components/SlideScreenContainer";
import SectionLabel from "../components/SectionLabel";
import Pressable from "../components/Pressable";
import Glyph from "../components/Glyph";
import UserContext from "../variables/context";

import { countdownRace, racePhase, distanceName } from "../lib/objectives";
import { todayKey, formatShortDate } from "../lib/plan";
import { racePlan, planHeadline, raceDay, startTimeFor, currentStep, relativeLabel } from "../lib/raceplan";

/*
  Mon plan de course — two tabs:
    Plan     the goal time and pace, how to start / hold / finish, the km
             splits, the warm-up counted back from the gun, what to do if
             it goes wrong. Built from their goal time or their VMA.
    Jour J   the day as a clock-following running order; on race day the
             current step is highlighted and follows the clock.
  Opens on Jour J in the last 2 days. Start time from goal.js (flagged
  "à confirmer" until the organiser publishes it).
*/

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const Tab = ({ id, label, tab, setTab, colors, typography }) => {
  const on = tab === id;
  return (
    <Pressable onPress={() => setTab(id)} small>
      <View style={[styles.tab, on ? { backgroundColor: colors.accent, borderColor: colors.accent } : { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[typography.heading, typography.bold, { fontSize: 15, color: on ? "white" : colors.text }]}>{label}</Text>
      </View>
    </Pressable>
  );
};

const RacePlanScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { theme, preferences } = useContext(UserContext);
  const { colors, typography } = theme;
  const today = todayKey();
  const race = countdownRace(preferences, today);
  const phase = race ? racePhase(race.days) : null;
  const [tab, setTab] = useState(route.params?.tab || (race && race.days <= 1 ? "day" : "plan"));
  const [now, setNow] = useState(() => nowHHMM());

  // follow the clock on race day
  useEffect(() => {
    if (tab !== "day") return undefined;
    const id = setInterval(() => setNow(nowHHMM()), 30000);
    return () => clearInterval(id);
  }, [tab]);

  if (!race) return null;

  const plan = racePlan(race, preferences.vma);
  const start = startTimeFor(race);
  const steps = start.time ? raceDay(race, start.time, plan.seconds) : [];
  const live = phase === "raceday";
  const current = live ? currentStep(steps, now) : -1;

  return (
    <SlideScreenContainer title="Mon plan de course" type="back" navigation={navigation} route={route} ignoreKeyboard>
      <ScrollView style={{ width: "100%" }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={[typography.finePrint, { fontSize: 14 }]}>
            {formatShortDate(race.date)} · {race.place || ""}
            {race.metres ? ` · ${distanceName(race.metres)}` : ""}
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>{race.name}</Text>
          <Text style={[typography.heading, { color: colors.accentText }]}>{planHeadline(plan)}</Text>
        </View>

        <View style={styles.tabs}>
          <Tab id="plan" label="Le plan" tab={tab} setTab={setTab} colors={colors} typography={typography} />
          <Tab id="day" label="Jour J" tab={tab} setTab={setTab} colors={colors} typography={typography} />
        </View>

        {tab === "plan" && (
          <>
            {!!plan.seconds && (
              <View style={styles.section}>
                <SectionLabel>Comment la courir</SectionLabel>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {[
                    { k: "Départ", t: plan.start },
                    { k: "Milieu", t: plan.middle },
                    { k: "Fin", t: plan.finish },
                  ].map((r, i, all) => (
                    <View key={r.k} style={[styles.row, i < all.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                      <Text style={[typography.finePrint, typography.bold, styles.rowKey, { opacity: 1 }]}>{r.k}</Text>
                      <Text style={[typography.finePrint, { flex: 1, fontSize: 14, lineHeight: 19 }]}>{r.t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!!plan.splits.length && (
              <View style={styles.section}>
                <SectionLabel>Tes passages</SectionLabel>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {plan.splits.map((s, i) => (
                    <View key={s.km} style={[styles.split, i < plan.splits.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                      <Text style={[typography.finePrint, { width: 64, fontSize: 14, opacity: 1 }]}>{s.label}</Text>
                      <Text style={[typography.finePrint, { flex: 1, fontSize: 13 }]}>{s.pace}</Text>
                      <Text style={[typography.heading, typography.mono, { fontSize: 16, color: s.phase === "start" ? colors.accentText : colors.text }]}>{s.cumulative}</Text>
                    </View>
                  ))}
                </View>
                <Text style={[typography.finePrint, styles.hint]}>Le temps cumulé à chaque borne — à écrire sur la main si tu n{"'"}as pas de montre.</Text>
              </View>
            )}

            <View style={styles.section}>
              <SectionLabel>Échauffement, avant le départ</SectionLabel>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {plan.warmup.map((w, i) => (
                  <View key={w.at} style={[styles.row, i < plan.warmup.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    <Text style={[typography.heading, typography.mono, styles.rowKey]}>{w.at}{"'"}</Text>
                    <Text style={[typography.finePrint, { flex: 1, fontSize: 14, lineHeight: 19 }]}>{w.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <SectionLabel>Si ça se passe mal</SectionLabel>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {plan.ifWrong.map((t, i) => (
                  <View key={i} style={[styles.row, i < plan.ifWrong.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    <Glyph name="check" size={14} color={colors.accentText} strokeWidth={2.6} />
                    <Text style={[typography.finePrint, { flex: 1, fontSize: 14, lineHeight: 19 }]}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {tab === "day" && (
          <View style={styles.section}>
            <View style={styles.dayHead}>
              <SectionLabel>Le déroulé</SectionLabel>
              <Text style={[typography.finePrint, { fontSize: 13 }]}>
                Départ {start.time || "—"}
                {start.confirmed ? "" : " · à confirmer"}
              </Text>
            </View>
            {!start.confirmed && (
              <Text style={[typography.finePrint, styles.hint, { textAlign: "left" }]}>
                L{"'"}heure de départ n{"'"}est pas encore publiée — le déroulé est calé sur {start.time} et se décalera tout seul.
              </Text>
            )}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 4 }]}>
              {steps.map((s, i) => {
                const isNow = i === current;
                const past = live && i < current;
                return (
                  <View key={s.key} style={[styles.step, i < steps.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }, isNow && { backgroundColor: colors.accentSoft, marginHorizontal: -16, paddingHorizontal: 16, borderRadius: 14 }]}>
                    <View style={{ width: 56 }}>
                      <Text style={[typography.heading, typography.mono, typography.bold, { fontSize: 16, color: isNow ? colors.accentText : colors.text, opacity: past ? 0.45 : 1 }]}>{s.at}</Text>
                      {live && <Text style={[typography.finePrint, { fontSize: 11 }]}>{relativeLabel(s.at, now)}</Text>}
                    </View>
                    <View style={{ flex: 1, gap: 2, opacity: past ? 0.5 : 1 }}>
                      <Text style={[typography.heading, typography.bold, isNow && { color: colors.accentText }]}>{s.title}</Text>
                      <Text style={[typography.finePrint, { fontSize: 14, lineHeight: 19 }]}>{s.text}</Text>
                    </View>
                    {isNow && <View style={[styles.nowDot, { backgroundColor: colors.accent }]} />}
                  </View>
                );
              })}
            </View>
            {!live && <Text style={[typography.finePrint, styles.hint]}>Le jour de la course, l{"'"}étape en cours se met en vert et suit l{"'"}heure.</Text>}
          </View>
        )}
      </ScrollView>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 20 },
  intro: { gap: 6 },
  title: { fontFamily: "Archivo-BlackItalic", fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { height: 38, paddingHorizontal: 16, borderRadius: 19, borderWidth: 1, justifyContent: "center" },
  section: { gap: 8 },
  card: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 },
  rowKey: { width: 56, fontSize: 14 },
  split: { flexDirection: "row", alignItems: "center", gap: 10, height: 44 },
  hint: { fontSize: 13, textAlign: "center" },
  dayHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 4 },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 },
  nowDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
});

export default RacePlanScreen;
