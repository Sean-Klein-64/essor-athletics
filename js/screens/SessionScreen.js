import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Pressable from "../components/Pressable";
import Button from "../components/Button";
import Glyph from "../components/Glyph";
import StepRow from "../components/StepRow";
import SectionLabel from "../components/SectionLabel";
import BookingCard from "../components/BookingCard";
import UserContext from "../variables/context";

import { planFor, describeStep, formatDay, totalLabel, todayKey } from "../lib/plan";
import useSessions from "../lib/store";
import levels, { levelById } from "../lib/levels";
import { reportProgress } from "../lib/member";

/*
  One session in full, for the runner's level: warm-up, main set and
  cool-down, every rep already turned into a time or distance from their
  VMA. The level chips let you peek at another level's version.
  Below: booking in Wodify, and "Séance faite" (or, for the VMA
  test, "Enregistrer mon test").
*/

const SessionScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { theme, preferences, setPreference } = useContext(UserContext);
  const { colors, typography } = theme;
  const session = useSessions().byId(route.params?.id);
  const [levelId, setLevelId] = useState(preferences.level);

  if (!session) return null;

  const vma = preferences.vma;
  const plan = planFor(session, levelId);
  const isPast = session.date < todayKey();
  const done = !!preferences.done?.[session.id];
  const isMine = levelId === preferences.level;

  const toggleDone = () => {
    const map = { ...(preferences.done || {}) };
    if (done) delete map[session.id];
    else map[session.id] = todayKey();
    setPreference("done", map);
    reportProgress({ ...preferences, done: map }); // the coaches see it in the hub
  };

  const parts = [
    { key: "warmup", label: "Échauffement", steps: plan.warmup },
    { key: "main", label: "Séance", steps: plan.main },
    { key: "cooldown", label: "Retour au calme", steps: plan.cooldown },
  ].filter((p) => p.steps.length);

  return (
    <SlideScreenContainer title={formatDay(session.date)} type="back" navigation={navigation} route={route} ignoreKeyboard>
      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text style={[styles.title, { color: colors.text }]}>{session.title}</Text>
          <Text style={[typography.finePrint, styles.summary]}>{session.summary}</Text>
        </View>

        <View style={styles.levels}>
          {levels.filter((l) => l.group === "club").map((l) => {
            const selected = l.id === levelId;
            return (
              <Pressable key={l.id} onPress={() => setLevelId(l.id)} small>
                <View
                  style={[
                    styles.levelChip,
                    selected
                      ? { backgroundColor: colors.accent, borderColor: colors.accent }
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      typography.finePrint,
                      typography.bold,
                      { opacity: 1, fontSize: 14, color: selected ? "white" : colors.text },
                    ]}
                  >
                    {l.name}
                    {l.id === preferences.level ? " · moi" : ""}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={[typography.finePrint, styles.levelNote]}>
          {isMine ? "Ta séance" : `Version ${levelById(levelId).name}`} · {totalLabel(session, levelId, vma)}
          {vma ? `  ·  VMA ${String(vma).replace(".", ",")}` : ""}
        </Text>

        {parts.map((part) => (
          <View key={part.key} style={styles.section}>
            <SectionLabel>{part.label}</SectionLabel>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {part.steps.map((step, i) => (
                <StepRow key={i} row={describeStep(step, vma)} hasVma={!!vma} last={i === part.steps.length - 1} />
              ))}
            </View>
          </View>
        ))}

        {!vma && levelById(levelId).group === "club" && (
          <Pressable onPress={() => navigation.navigate("Vma")}>
            <View style={[styles.vmaPrompt, { backgroundColor: colors.accentSoft, borderColor: colors.accentText }]}>
              <Glyph name="bolt" size={16} color={colors.accentText} strokeWidth={2.2} />
              <Text style={[typography.heading, { flex: 1, color: colors.accentText }]}>
                Ajoute ta VMA pour voir tes temps
              </Text>
              <Glyph name="right" size={16} color={colors.accentText} />
            </View>
          </Pressable>
        )}

        {!isPast && <BookingCard session={session} />}

        {session.kind === "test" ? (
          <Button onPress={() => navigation.navigate("Vma", { mode: "test" })}>Enregistrer mon test</Button>
        ) : (
          <Button
            onPress={toggleDone}
            style={done ? { backgroundColor: colors.border } : null}
            textColor={done ? colors.text : undefined}
          >
            {done ? "Séance faite ✓" : "Séance faite"}
          </Button>
        )}
      </ScrollView>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 18 },
  intro: { gap: 6 },
  title: {
    fontFamily: "Archivo-BlackItalic",
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -0.8,
  },
  summary: { fontSize: 15, lineHeight: 20 },
  levels: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  levelChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: "center",
  },
  levelNote: { fontSize: 14, marginTop: -8 },
  section: { gap: 8 },
  card: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 4 },
  vmaPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  whoCard: { paddingVertical: 14, gap: 4 },
  names: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  name: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  whoEmpty: { fontSize: 14, textAlign: "center", paddingVertical: 4 },
});

export default SessionScreen;
