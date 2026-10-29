import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Pressable from "../components/Pressable";
import Glyph from "../components/Glyph";
import SectionLabel from "../components/SectionLabel";
import UserContext from "../variables/context";

import { weekPlan, guessRuns, RUNS_OPTIONS, RULES, volumeLine } from "../lib/week";
import useSessions from "../lib/store";
import { todayKey } from "../lib/plan";
import onboarding from "../lib/onboarding";
import { zoneHeartRate, zoneById } from "../lib/paces";

/*
  Levels 1–3: the rest of the running week around Friday's club session,
  sized for this runner: their 3-month volume as the base, the cycle week
  and their logs for the progression (js/lib/week.js). Pick how many runs;
  the app lays out the days, durations and paces.
*/

const WeekScreen = ({ navigation, route }) => {
  const { theme, preferences, setPreference } = useContext(UserContext);
  const { colors, typography } = theme;
  const runs = guessRuns(preferences);
  const { sessions } = useSessions();
  const { days: plan, volume } = weekPlan(preferences, { sessions, today: todayKey() });
  const kmAnswer = onboarding.find((q) => q.field === "kmWeek")?.options.find((o) => o.id === preferences.kmWeek)?.name;
  const todayIndex = (new Date().getDay() + 6) % 7;
  const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  return (
    <SlideScreenContainer title="Ma semaine" type="back" navigation={navigation} route={route} ignoreKeyboard>
      <ScrollView style={{ width: "100%" }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[typography.finePrint, styles.intro]}>Le vendredi, c'est le club. Le reste de la semaine, voilà quoi courir autour — à ton volume, à tes allures.</Text>

        <View style={[styles.volume, { backgroundColor: volume.hold ? colors.accentSoft : colors.card, borderColor: volume.hold ? colors.accentText : colors.border }]}>
          <Text style={[typography.heading, typography.bold, volume.hold && { color: colors.accentText }]}>{volumeLine(volume)}</Text>
          {!!volume.reason && <Text style={[typography.finePrint, { fontSize: 14, lineHeight: 18, color: colors.accentText, opacity: 1 }]}>{volume.reason}</Text>}
          <Pressable onPress={() => navigation.navigate("Question", { field: "kmWeek" })} small>
            <Text style={[typography.finePrint, { fontSize: 13, color: colors.accentText, opacity: 1 }]}>
              {kmAnswer ? `Base : ${kmAnswer} par semaine ces 3 derniers mois · modifier` : "Dis-nous ton volume des 3 derniers mois pour ajuster la base"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <SectionLabel>Sorties par semaine, vendredi compris</SectionLabel>
          <View style={styles.chips}>
            {RUNS_OPTIONS.map((n) => {
              const on = runs === n;
              return (
                <Pressable key={n} small onPress={() => setPreference("runsWeek", n)}>
                  <View style={[styles.chip, on ? { backgroundColor: colors.accent, borderColor: colors.accent } : { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[typography.heading, typography.bold, { fontSize: 16, color: on ? "white" : colors.text }]}>{n}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          {plan.map((d) => {
            const isToday = DAYS[todayIndex] === d.day;
            const club = d.kind === "club";
            const hr = !club && zoneHeartRate(preferences.hrMax, zoneById(d.zone).hr);
            return (
              <View key={d.day} style={[styles.card, { backgroundColor: club ? colors.accent : colors.card, borderColor: isToday ? colors.accentText : club ? colors.accent : colors.border }]}>
                <View style={styles.head}>
                  <Text style={[typography.finePrint, { fontSize: 13 }, club && { color: "white", opacity: 0.8 }, isToday && !club && { color: colors.accentText, opacity: 1 }]}>
                    {d.day}
                    {isToday ? "  ·  aujourd'hui" : ""}
                  </Text>
                  {!club && <Text style={[typography.finePrint, { fontSize: 13 }]}>{d.minutes}'</Text>}
                </View>
                <Text style={[typography.heading, typography.bold, club && { color: "white" }]}>{d.title}</Text>
                {!club && (
                  <Text style={[typography.heading, typography.mono, { color: colors.accentText, fontSize: 16 }]}>
                    {d.pace || "Allure facile — ajoute ta VMA"}
                    {hr ? `  ·  ${hr}` : ""}
                  </Text>
                )}
                <Text style={[typography.finePrint, { fontSize: 14, lineHeight: 18 }, club && { color: "white", opacity: 0.85 }]}>{d.note}</Text>
                {!club && <Text style={[typography.finePrint, { fontSize: 12 }]}>{d.zoneName}</Text>}
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <SectionLabel>Les règles</SectionLabel>
          <View style={[styles.rules, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {RULES.map((r, i) => (
              <View key={i} style={styles.rule}>
                <Glyph name="check" size={14} color={colors.accentText} strokeWidth={2.6} />
                <Text style={[typography.finePrint, { flex: 1, fontSize: 14, lineHeight: 18 }]}>{r}</Text>
              </View>
            ))}
          </View>
        </View>
        {!preferences.vma && (
          <Pressable onPress={() => navigation.navigate("Vma")} small>
            <Text style={[typography.finePrint, { textAlign: "center", color: colors.accentText, opacity: 1 }]}>Ajoute ta VMA pour voir tes allures</Text>
          </Pressable>
        )}
      </ScrollView>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 4, gap: 18, paddingBottom: 50 },
  intro: { fontSize: 14, lineHeight: 18 },
  volume: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 6 },
  section: { gap: 10 },
  chips: { flexDirection: "row", gap: 8 },
  chip: { width: 48, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  card: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 4 },
  head: { flexDirection: "row", justifyContent: "space-between" },
  rules: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 10 },
  rule: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
});

export default WeekScreen;
