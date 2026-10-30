import React, { useContext, useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Pressable from "../components/Pressable";
import Button from "../components/Button";
import Glyph from "../components/Glyph";
import StepRow from "../components/StepRow";
import SectionLabel from "../components/SectionLabel";
import BookingCard from "../components/BookingCard";
import Input from "../components/Input";
import UserContext from "../variables/context";

import { planFor, describeStep, formatDay, totalLabel, todayKey, sessionNumber } from "../lib/plan";
import useSessions from "../lib/store";
import levels, { levelById } from "../lib/levels";
import { reportProgress } from "../lib/member";
import { FEELS, doneEntry, withDone } from "../lib/history";

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
  const { sessions, byId } = useSessions();
  const session = byId(route.params?.id);
  const [levelId, setLevelId] = useState(preferences.level);
  const sessionId = session?.id;
  const entry = doneEntry(preferences.done, sessionId);
  const done = !!entry;
  const [note, setNote] = useState(entry?.note || "");

  const saveDone = (patch) => {
    const map = withDone(preferences.done, sessionId, patch);
    setPreference("done", map);
    reportProgress({ ...preferences, done: map }); // the coaches see it in the hub
  };

  // the note is saved when typing stops, not on every keystroke
  useEffect(() => {
    if (!done || note === (entry?.note || "")) return undefined;
    const t = setTimeout(() => saveDone({ note: note.trim() }), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  if (!session) return null;

  const position = sessionNumber(session, sessions);
  const vma = preferences.vma;
  const plan = planFor(session, levelId);
  const isPast = session.date < todayKey();
  const isMine = levelId === preferences.level;

  const toggleDone = () => {
    if (done) saveDone(null);
    else saveDone({ at: todayKey() });
  };

  const parts = [
    { key: "warmup", label: "Échauffement", steps: plan.warmup },
    { key: "main", label: "Séance", steps: plan.main },
    { key: "cooldown", label: "Retour au calme", steps: plan.cooldown },
  ].filter((p) => p.steps.length);

  return (
    <SlideScreenContainer title={`${formatDay(session.date)}${position ? ` · ${position}` : ""}`} type="back" navigation={navigation} route={route} ignoreKeyboard>
      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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

        {/* How did it go? — kept with the session, shown in Mes séances and to the coach */}
        {done && session.kind !== "test" && (
          <View style={[styles.card, styles.debrief, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.heading, typography.bold]}>Comment c{"’"}était ?</Text>
            <View style={styles.levels}>
              {FEELS.map((f) => {
                const selected = entry?.feel === f.id;
                return (
                  <Pressable key={f.id} onPress={() => saveDone({ feel: selected ? null : f.id })} small>
                    <View
                      style={[
                        styles.levelChip,
                        selected
                          ? { backgroundColor: colors.accent, borderColor: colors.accent }
                          : { backgroundColor: colors.background, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[typography.finePrint, typography.bold, { opacity: 1, fontSize: 14, color: selected ? "white" : colors.text }]}>
                        {f.name}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {!!entry?.feel && (
              <Text style={[typography.finePrint, { fontSize: 13, marginTop: -4 }]}>{FEELS.find((f) => f.id === entry.feel)?.hint}</Text>
            )}
            <Input placeholder="Une note pour toi (ou pour le coach)" value={note} onChangeText={setNote} compact />
          </View>
        )}
      </ScrollView>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 18 },
  debrief: { paddingVertical: 16, gap: 12 },
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
