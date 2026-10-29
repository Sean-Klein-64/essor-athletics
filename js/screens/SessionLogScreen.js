import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Button from "../components/Button";
import Input from "../components/Input";
import Pressable from "../components/Pressable";
import SectionLabel from "../components/SectionLabel";
import UserContext from "../variables/context";

import useSessions from "../lib/store";
import { todayKey, formatDay } from "../lib/plan";
import { formatPace, formatClock } from "../lib/paces";
import { reportProgress } from "../lib/member";
import { FEELS, parsePace, targetPace, paceGap } from "../lib/log";

/*
  "Séance faite" — how did it go?
  Average pace on the main set (optional), how it felt (1–5, optional), a
  short note (optional). Saving marks the session done and sends the log to
  the coaches. Opened from Session with { id }; reopens filled in to edit.
  "Retirer" undoes the tick entirely.
*/

const SessionLogScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { theme, preferences, setPreference } = useContext(UserContext);
  const { colors, typography } = theme;
  const session = useSessions().byId(route.params?.id);
  const existing = preferences.log?.[route.params?.id] || null;

  const [paceText, setPaceText] = useState(existing?.pace ? formatClock(existing.pace) : "");
  const [feel, setFeel] = useState(existing?.feel || null);
  const [note, setNote] = useState(existing?.note || "");

  if (!session) return null;

  const pace = parsePace(paceText);
  const paceInvalid = paceText.trim().length > 0 && !pace;
  const target = targetPace(session, preferences.level, preferences.vma);
  const gap = paceGap(pace, target);

  const save = async () => {
    const at = existing?.at || todayKey();
    const done = { ...(preferences.done || {}), [session.id]: at };
    const log = { ...(preferences.log || {}), [session.id]: { at, pace: pace || null, feel: feel || null, note: note.trim().slice(0, 140) } };
    await setPreference("done", done);
    await setPreference("log", log);
    reportProgress({ ...preferences, done, log }); // the coaches see it in the hub
    navigation.goBack();
  };

  const remove = async () => {
    const done = { ...(preferences.done || {}) };
    const log = { ...(preferences.log || {}) };
    delete done[session.id];
    delete log[session.id];
    await setPreference("done", done);
    await setPreference("log", log);
    reportProgress({ ...preferences, done, log });
    navigation.goBack();
  };

  return (
    <SlideScreenContainer title="Séance faite" type="back" navigation={navigation} route={route}>
      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.intro}>
          <Text style={[typography.finePrint, { fontSize: 14 }]}>{formatDay(session.date)}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{session.title}</Text>
          <Text style={[typography.finePrint, styles.summary]}>Comment ça s{"'"}est passé ? Tout est facultatif — les coachs le voient dans leur hub.</Text>
        </View>

        <View style={styles.section}>
          <SectionLabel>Allure moyenne sur la séance</SectionLabel>
          <Input placeholder="4:12" onChangeText={setPaceText} value={paceText} keyboardType="numbers-and-punctuation" compact />
          <Text style={[typography.finePrint, styles.hint, paceInvalid && { color: colors.accentText, opacity: 1 }]}>
            {paceInvalid
              ? "Une allure en min/km, par ex. 4:12"
              : target
                ? `Cible de la séance : ${formatPace(target)}${gap ? `  ·  ${gap.label}` : ""}`
                : "En min/km, sur les répétitions — pas l'échauffement"}
          </Text>
        </View>

        <View style={styles.section}>
          <SectionLabel>Ressenti</SectionLabel>
          <View style={styles.feels}>
            {FEELS.map((f) => {
              const selected = feel === f.id;
              return (
                <Pressable key={f.id} onPress={() => setFeel(selected ? null : f.id)} small>
                  <View
                    style={[
                      styles.feel,
                      selected ? { backgroundColor: colors.accent, borderColor: colors.accent } : { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[typography.heading, typography.bold, { fontSize: 18, color: selected ? "white" : colors.text }]}>{f.id}</Text>
                    <Text style={[typography.finePrint, { fontSize: 12, opacity: 1, color: selected ? "rgba(255,255,255,0.85)" : colors.text }]}>{f.short}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <SectionLabel>Un mot</SectionLabel>
          <TextInput
            style={[styles.note, typography.copy, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
            value={note}
            onChangeText={setNote}
            placeholder="Jambes lourdes, dernière série coupée…"
            placeholderTextColor="grey"
            maxLength={140}
            multiline
          />
        </View>

        <Button disabled={paceInvalid} onPress={save}>
          {existing ? "Mettre à jour" : "Enregistrer"}
        </Button>
        {!!existing && (
          <Pressable onPress={remove} small>
            <Text style={[typography.finePrint, styles.remove]}>Retirer « séance faite »</Text>
          </Pressable>
        )}
      </ScrollView>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 22 },
  intro: { gap: 6 },
  title: { fontFamily: "Archivo-BlackItalic", fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  summary: { fontSize: 15, lineHeight: 20 },
  section: { gap: 8 },
  hint: { fontSize: 13, textAlign: "center", marginTop: 4 },
  feels: { flexDirection: "row", gap: 8 },
  feel: { flex: 1, height: 58, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 1 },
  note: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, minHeight: 72, fontSize: 16, lineHeight: 22 },
  remove: { textAlign: "center", fontSize: 14, paddingVertical: 10 },
});

export default SessionLogScreen;
