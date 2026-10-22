import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Pressable from "../components/Pressable";
import Glyph from "../components/Glyph";
import UserContext from "../variables/context";

import { PROGRAMMES, programmeSessions, sessionLabel, currentIndex, isBeginner, perWeekOf } from "../lib/beginner";

/*
  A Débuter programme in full: 6 weeks × 3 sessions, with where the
  runner is. Tapping a session opens it. Opened for the runner's own
  level, or any level with { level }.
*/

const ProgrammeScreen = ({ navigation, route }) => {
  const { theme, preferences, setPreference } = useContext(UserContext);
  const { colors, typography } = theme;
  const levelId = route.params?.level || preferences.level;
  if (!isBeginner(levelId)) return null;
  const programme = PROGRAMMES[levelId];
  const sessions = programmeSessions(levelId, perWeekOf(preferences));
  const mine = levelId === preferences.level;
  const at = mine ? currentIndex(preferences, levelId) : -1;
  const perWeek = perWeekOf(preferences);
  const weeks = programme.weeks.map((_, w) => sessions.filter((s) => s.week === w + 1));

  return (
    <SlideScreenContainer title={programme.name} type="back" navigation={navigation} route={route} ignoreKeyboard>
      <ScrollView style={{ width: "100%" }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[typography.finePrint, styles.intro]}>
          Le vendredi au club, le reste seul·e, avec au moins un jour entre. Tu passes à la suivante quand tu es prêt·e — pas forcément chaque semaine.
        </Text>
        {mine && (
          <View style={styles.perWeek}>
            {[3, 2].map((n) => {
              const on = perWeek === n;
              return (
                <Pressable key={n} small onPress={() => setPreference("beginnerSessions", n)}>
                  <View style={[styles.chip, on ? { backgroundColor: colors.accent, borderColor: colors.accent } : { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[typography.finePrint, typography.bold, { opacity: 1, fontSize: 14, color: on ? "white" : colors.text }]}>{n} séances / semaine</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
        {weeks.map((week, w) => (
          <View key={w} style={[styles.week, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.finePrint, styles.weekLabel]}>SEMAINE {w + 1}</Text>
            {week.map((session, i) => {
              const s = session;
              const next = mine && session.index >= at && !week.slice(0, i).some((x) => x.index >= at);
              const done = mine && session.index < at;
              const current = next && !weeks.slice(0, w).some((wk) => wk.some((x) => x.index >= at));
              return (
                <Pressable key={i} animation={false} onPress={() => navigation.navigate("BeginnerSession", { level: levelId, index: session.index })}>
                  <View style={[styles.row, i < week.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }, current && { backgroundColor: colors.accentSoft, marginHorizontal: -14, paddingHorizontal: 14 }]}>
                    <View style={[styles.dot, { backgroundColor: done ? colors.accent : current ? colors.accentText : colors.border }]}>
                      {done && <Glyph name="check" size={12} color="white" strokeWidth={2.8} />}
                    </View>
                    <Text style={[typography.finePrint, { width: 72, fontSize: 14 }]}>{session.slotName}</Text>
                    <Text style={[typography.heading, { flex: 1 }, s.test && typography.bold]}>
                      {sessionLabel(s)}
                      {s.test ? "  · test" : ""}
                    </Text>
                    <Glyph name="right" size={14} color={colors.text} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 4, gap: 12, paddingBottom: 50 },
  intro: { fontSize: 14, lineHeight: 18 },
  perWeek: { flexDirection: "row", gap: 8 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, justifyContent: "center" },
  week: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  weekLabel: { fontSize: 11, letterSpacing: 0.8, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  dot: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});

export default ProgrammeScreen;
