import React, { useContext, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Button from "../components/Button";
import Pressable from "../components/Pressable";
import Glyph from "../components/Glyph";
import StepRow from "../components/StepRow";
import SectionLabel from "../components/SectionLabel";
import UserContext from "../variables/context";

import { PROGRAMMES, programmeSessions, sessionLabel, sessionPlan, currentIndex, runMinutes, READY_RULES, perWeekOf } from "../lib/beginner";
import { beginnerKey } from "../lib/history";
import { reportProgress } from "../lib/member";
import { describeStep, todayKey } from "../lib/plan";
import { levelById } from "../lib/levels";

/*
  One Débuter session: the walk-run laid out step by step, then the
  "ready for the next one?" rules. Marking it done moves the runner to
  the next session; passing the test moves them up a level.
*/

const BeginnerSessionScreen = ({ navigation, route }) => {
  const { theme, preferences, setPreference } = useContext(UserContext);
  const { colors, typography } = theme;
  const levelId = route.params?.level || preferences.level;
  const sessions = programmeSessions(levelId, perWeekOf(preferences));
  const wanted = route.params?.index ?? currentIndex(preferences, levelId);
  const session = sessions.find((s) => s.index === wanted) || sessions.find((s) => s.index >= wanted);
  const [checks, setChecks] = useState([]);
  if (!session) return null;

  const mine = levelId === preferences.level;
  const at = currentIndex(preferences, levelId);
  const isCurrent = mine && session.index >= at && !sessions.some((s) => s.index >= at && s.index < session.index);
  const isDone = mine && session.index < at;
  const plan = sessionPlan(session);
  const allChecked = checks.length === READY_RULES.length;

  const markDone = async () => {
    const programme = { ...(preferences.programme || {}), [levelId]: session.index + 1 };
    const beginnerDone = { ...(preferences.beginnerDone || {}), [beginnerKey(levelId, session.index)]: { at: todayKey() } };
    await setPreference("programme", programme);
    await setPreference("beginnerDone", beginnerDone);
    const next = { ...preferences, programme, beginnerDone };
    if (session.test) {
      await setPreference("level", session.next);
      next.level = session.next;
    }
    reportProgress(next); // the coaches see where they are
    navigation.goBack();
  };

  const parts = [
    { key: "warmup", label: "Échauffement", steps: plan.warmup },
    { key: "main", label: "Séance", steps: plan.main },
    { key: "cooldown", label: "Retour au calme", steps: plan.cooldown },
  ];

  return (
    <SlideScreenContainer title={`${PROGRAMMES[levelId].name} · S${session.week}`} type="back" navigation={navigation} route={route} ignoreKeyboard>
      <ScrollView style={{ width: "100%" }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 4 }}>
          <Text style={[typography.finePrint, { fontSize: 14 }]}>
            {`${session.slotName} · ${runMinutes(session)}' de course${session.test ? " · test" : ""}`}
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>{sessionLabel(session)}</Text>
          <Text style={[typography.finePrint, styles.summary]}>
            {session.test
              ? `Le test de fin de niveau : réussi, tu passes en ${levelById(session.next).name}.`
              : session.walk
                ? "Cours à une allure où tu peux parler. La marche, c'est de la récup, pas une pause."
                : "Sans t'arrêter, à une allure où tu peux parler."}
          </Text>
          {!!session.note && <Text style={[typography.finePrint, styles.summary]}>{session.note}</Text>}
        </View>

        <Pressable onPress={() => navigation.navigate("BeginnerTimer", { level: levelId, index: session.index })}>
          <View style={[styles.timer, { backgroundColor: colors.accent }]}>
            <View style={styles.timerPlay}>
              <Glyph name="play" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.timerTitle}>Lancer le chrono</Text>
              <Text style={styles.timerSub}>Il te dit quand courir et quand marcher — même téléphone verrouillé.</Text>
            </View>
          </View>
        </Pressable>

        {parts.map((part) => (
          <View key={part.key} style={styles.section}>
            <SectionLabel>{part.label}</SectionLabel>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {part.steps.map((step, i) => (
                <StepRow key={i} row={describeStep(step, preferences.vma)} hasVma={!!preferences.vma} last={i === part.steps.length - 1} />
              ))}
            </View>
          </View>
        ))}

        {isCurrent && (
          <View style={styles.section}>
            <SectionLabel>Prêt·e pour la suivante ?</SectionLabel>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 6 }]}>
              {READY_RULES.map((rule, i) => {
                const on = checks.includes(i);
                return (
                  <Pressable key={i} animation={false} onPress={() => setChecks((c) => (on ? c.filter((x) => x !== i) : [...c, i]))}>
                    <View style={[styles.rule, i < READY_RULES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                      <View style={[styles.check, { backgroundColor: on ? colors.accent : colors.border }]}>
                        {on && <Glyph name="check" size={14} color="white" strokeWidth={2.6} />}
                      </View>
                      <Text style={[typography.heading, { flex: 1, fontSize: 16 }]}>{rule}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[typography.finePrint, styles.hint]}>Pas les trois ? Refais cette séance — c’est normal, et c’est la règle.</Text>
            <Button disabled={!allChecked} onPress={markDone}>
              {session.test ? `Test réussi → ${levelById(session.next).name}` : "Séance faite"}
            </Button>
          </View>
        )}
        {isDone && <Text style={[typography.finePrint, styles.hint]}>Séance faite ✓</Text>}
        {!mine && <Text style={[typography.finePrint, styles.hint]}>Programme {PROGRAMMES[levelId].name} — pas le tien.</Text>}
      </ScrollView>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 4, gap: 18, paddingBottom: 50 },
  title: { fontFamily: "Archivo-BlackItalic", fontSize: 42, lineHeight: 48, letterSpacing: -0.8 },
  summary: { fontSize: 15, lineHeight: 20 },
  section: { gap: 8 },
  card: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 4 },
  rule: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  check: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  hint: { textAlign: "center", fontSize: 14 },
  timer: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 20, padding: 14, marginTop: 2 },
  timerPlay: { width: 44, height: 44, borderRadius: 22, backgroundColor: "white", alignItems: "center", justifyContent: "center", paddingLeft: 3 },
  timerTitle: { color: "white", fontSize: 20, fontFamily: "DiatypePreTrial-Medium", letterSpacing: -0.4 },
  timerSub: { color: "rgba(255,255,255,0.78)", fontSize: 14, lineHeight: 18, fontFamily: "DiatypePre-Regular" },
});

export default BeginnerSessionScreen;
