import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, Linking } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Button from "../components/Button";
import Input from "../components/Input";
import Pressable from "../components/Pressable";
import UserContext from "../variables/context";

import goal, { targetTime, daysToGo } from "../lib/goal";
import { parseClock, formatClock, formatPace, racePace, repTime } from "../lib/paces";
import { best } from "../lib/records";
import { formatShortDate } from "../lib/plan";

/*
  Pick your race and your goal time for the group goal. The VMA target is
  a suggestion; the runner types what they're going for. Saved as
  preferences.raceGoal = { distance, seconds }.
*/

const GoalScreen = ({ navigation, route }) => {
  const {
    theme: { colors, typography },
    preferences,
    setPreference,
  } = useContext(UserContext);
  const saved = preferences.raceGoal;
  const [distanceId, setDistanceId] = useState(saved?.distance || route.params?.distance || goal.distances[0].id);
  const [text, setText] = useState(saved?.distance === distanceId && saved?.seconds ? formatClock(saved.seconds) : "");
  const distance = goal.distances.find((d) => d.id === distanceId);
  const seconds = parseClock(text);
  const suggested = targetTime(distance, preferences.vma);
  const pb = best(preferences.records, distance.id);
  const isValid = !!seconds && seconds > 600 && seconds < 7200;

  // How the goal compares with what the VMA says
  const vmaSeconds = preferences.vma ? repTime(distance.metres, preferences.vma, distance.vma) : null;
  const diff = seconds && vmaSeconds ? Math.round((seconds - vmaSeconds) / 60) : null;
  const verdict =
    diff === null ? null : diff <= -3 ? "Ambitieux par rapport à ta VMA — à confirmer au test." : diff >= 4 ? "Prudent — ta VMA dit que tu peux viser plus." : "Cohérent avec ta VMA.";

  const pick = (id) => {
    setDistanceId(id);
    setText(saved?.distance === id && saved?.seconds ? formatClock(saved.seconds) : "");
  };

  const save = async () => {
    await setPreference("raceGoal", { distance: distanceId, seconds });
    navigation.goBack();
  };

  const useSuggested = () => suggested && setText(suggested);

  return (
    <SlideScreenContainer title={goal.name} type="back" navigation={navigation} route={route}>
      <ScrollView style={{ width: "100%" }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={[typography.finePrint, styles.when]}>
          {goal.place} · {formatShortDate(goal.date)} · dans {daysToGo()} jours
        </Text>

        <View style={styles.tabs}>
          {goal.distances.map((d) => {
            const on = d.id === distanceId;
            return (
              <Pressable key={d.id} small onPress={() => pick(d.id)}>
                <View style={[styles.tab, on ? { backgroundColor: colors.accent, borderColor: colors.accent } : { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[typography.heading, typography.bold, { fontSize: 16, color: on ? "white" : colors.text }]}>{d.name}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={[typography.copy, styles.prompt]}>Ton objectif sur {distance.name}</Text>
        <Input key={distanceId} autoFocus placeholder={suggested || "45:00"} onChangeText={setText} value={text} keyboardType="numbers-and-punctuation" />
        <Text style={[typography.heading, styles.pace, { color: colors.accentText }]}>
          {isValid ? formatPace(racePace(distance.metres, seconds)) : " "}
        </Text>
        {!!verdict && isValid && <Text style={[typography.finePrint, styles.verdict]}>{verdict}</Text>}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable animation={false} onPress={useSuggested}>
            <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={typography.heading}>Ce que dit ta VMA</Text>
                <Text style={[typography.finePrint, { fontSize: 13 }]}>{preferences.vma ? `${distance.vma} % de ${String(preferences.vma).replace(".", ",")} km/h · touche pour l'utiliser` : "Ajoute ta VMA pour une suggestion"}</Text>
              </View>
              <Text style={[typography.heading, typography.mono]}>{suggested || "—"}</Text>
            </View>
          </Pressable>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={typography.heading}>Ton record</Text>
              <Text style={[typography.finePrint, { fontSize: 13 }]}>{pb ? formatShortDate(pb.date) : "Pas encore de temps sur cette distance"}</Text>
            </View>
            <Text style={[typography.heading, typography.mono]}>{pb ? formatClock(pb.seconds) : "—"}</Text>
          </View>
        </View>

        <Button disabled={!isValid} onPress={save}>
          Enregistrer mon objectif
        </Button>
        {!!goal.register && (
          <Pressable onPress={() => Linking.openURL(goal.register)} small>
            <Text style={[typography.finePrint, { textAlign: "center", color: colors.accentText, opacity: 1, paddingVertical: 10 }]}>Site de la course · inscriptions pas encore ouvertes</Text>
          </Pressable>
        )}
      </ScrollView>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { padding: 20, paddingTop: 4, gap: 12, paddingBottom: 60 },
  when: { textAlign: "center", fontSize: 14 },
  tabs: { flexDirection: "row", gap: 8, justifyContent: "center" },
  tab: { height: 40, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, justifyContent: "center" },
  prompt: { textAlign: "center", opacity: 0.5, marginTop: 8 },
  pace: { textAlign: "center" },
  verdict: { textAlign: "center", fontSize: 14, marginTop: -6 },
  card: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, marginTop: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingVertical: 10 },
});

export default GoalScreen;
