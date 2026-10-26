import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Pressable from "../components/Pressable";
import Glyph from "../components/Glyph";
import SectionLabel from "../components/SectionLabel";
import UserContext from "../variables/context";

import goal from "../lib/goal";
import { isBeginner } from "../lib/beginner";
import { formatShortDate, todayKey } from "../lib/plan";
import { formatClock } from "../lib/paces";
import { distanceName, goalLine, daysBetween, newObjective, OBJECTIVE_IDEAS } from "../lib/objectives";
import { reportProgress } from "../lib/member";

/*
  Mes objectifs — everything a runner is aiming for:
    the club race (Levels 1–3), their own race, and smaller goals they tick off.
  Changes go to the coaches with the progress report.
*/

const ObjectivesScreen = ({ navigation, route }) => {
  const {
    theme: { colors, typography },
    preferences: p,
    setPreference,
  } = useContext(UserContext);
  const [text, setText] = useState("");
  const club = !isBeginner(p.level);
  const clubChoice = goal.distances.find((d) => d.id === p.raceGoal?.distance);
  const mine = p.myRace;
  const objectives = p.objectives || [];

  const saveObjectives = async (list) => {
    await setPreference("objectives", list);
    reportProgress({ ...p, objectives: list });
  };
  const add = (value) => {
    if (!value.trim()) return;
    saveObjectives([...objectives, newObjective(value)]);
    setText("");
  };
  const toggle = (id) => saveObjectives(objectives.map((o) => (o.id === id ? { ...o, done: !o.done } : o)));
  const remove = (id) => saveObjectives(objectives.filter((o) => o.id !== id));

  const card = [styles.card, { backgroundColor: colors.card, borderColor: colors.border }];

  return (
    <SlideScreenContainer title="Mes objectifs" type="back" navigation={navigation} route={route}>
      <ScrollView style={{ width: "100%" }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {club && (
          <View style={styles.section}>
            <SectionLabel>Objectif du groupe</SectionLabel>
            <Pressable onPress={() => navigation.navigate("Goal")} animation={false}>
              <View style={[card, styles.row]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={typography.heading}>{goal.name}</Text>
                  <Text style={[typography.finePrint, { fontSize: 13 }]}>
                    {goal.place} · {formatShortDate(goal.date)}
                  </Text>
                </View>
                <Text style={[typography.heading, typography.mono]}>
                  {clubChoice ? `${clubChoice.name}${p.raceGoal?.seconds ? ` · ${formatClock(p.raceGoal.seconds)}` : ""}` : "À choisir"}
                </Text>
                <Glyph name="right" size={16} color={colors.text} />
              </View>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <SectionLabel>Ma course</SectionLabel>
          {mine ? (
            <Pressable onPress={() => navigation.navigate("MyRace")} animation={false}>
              <View style={[card, styles.row]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={typography.heading}>{mine.name}</Text>
                  <Text style={[typography.finePrint, { fontSize: 13 }]}>
                    {[mine.place, formatShortDate(mine.date), distanceName(mine.metres)].filter(Boolean).join(" · ")}
                  </Text>
                  {!!mine.seconds && <Text style={[typography.finePrint, typography.mono, { fontSize: 13, opacity: 1 }]}>{goalLine(mine.metres, mine.seconds)}</Text>}
                </View>
                <Text style={[typography.finePrint, { fontSize: 13 }]}>{countdownText(mine.date)}</Text>
                <Glyph name="right" size={16} color={colors.text} />
              </View>
            </Pressable>
          ) : (
            <Pressable onPress={() => navigation.navigate("MyRace")}>
              <View style={[card, styles.row, { borderStyle: "dashed" }]}>
                <Glyph name="plus" size={16} color={colors.accentText} strokeWidth={2.2} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.heading, { color: colors.accentText }]}>Ajouter ma course</Text>
                  <Text style={[typography.finePrint, { fontSize: 13 }]}>Un 10 km, un marathon à Rome… Le compte à rebours suit ta course.</Text>
                </View>
              </View>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <SectionLabel>Mes autres objectifs</SectionLabel>
          {!!objectives.length && (
            <View style={card}>
              {objectives.map((o, i) => (
                <View key={o.id} style={[styles.objective, i < objectives.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  <Pressable onPress={() => toggle(o.id)} small animation={false}>
                    <View style={[styles.box, o.done ? { backgroundColor: colors.accent, borderColor: colors.accent } : { borderColor: colors.border }]}>
                      {o.done && <Glyph name="check" size={12} color="white" strokeWidth={2.8} />}
                    </View>
                  </Pressable>
                  <Text style={[typography.heading, { flex: 1, fontSize: 16 }, o.done && { opacity: 0.45, textDecorationLine: "line-through" }]}>{o.text}</Text>
                  <Pressable onPress={() => remove(o.id)} small hitSlop={8} animation={false}>
                    <Glyph name="cross" size={14} color={colors.text} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View style={[card, styles.addRow]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Nouvel objectif…"
              placeholderTextColor="grey"
              style={[typography.heading, styles.addInput, { color: colors.text }]}
              returnKeyType="done"
              onSubmitEditing={() => add(text)}
            />
            <Pressable onPress={() => add(text)} small disabled={!text.trim()}>
              <View style={[styles.addButton, { backgroundColor: text.trim() ? colors.accent : colors.border }]}>
                <Glyph name="plus" size={16} color="white" strokeWidth={2.4} />
              </View>
            </Pressable>
          </View>

          {!objectives.length && (
            <View style={styles.ideas}>
              {OBJECTIVE_IDEAS.map((idea) => (
                <Pressable key={idea} onPress={() => add(idea)} small>
                  <View style={[styles.idea, { borderColor: colors.border }]}>
                    <Text style={[typography.finePrint, { fontSize: 13, opacity: 1 }]}>{idea}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Text style={[typography.finePrint, styles.note]}>
          Tes objectifs sont visibles par les coachs. Les séances du vendredi restent les mêmes pour tout le monde : ton objectif change tes cibles, pas le programme.
        </Text>
      </ScrollView>
    </SlideScreenContainer>
  );
};

const countdownText = (date) => {
  const days = daysBetween(todayKey(), date);
  if (days > 1) return `J-${days}`;
  if (days === 1) return "Demain";
  if (days === 0) return "Aujourd'hui";
  return "Passée";
};

const styles = StyleSheet.create({
  body: { padding: 20, paddingTop: 4, gap: 22, paddingBottom: 60 },
  section: { gap: 10 },
  card: { borderWidth: 1, borderRadius: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16 },
  objective: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  box: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  addRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 16, paddingRight: 8, height: 52 },
  addInput: { flex: 1, fontSize: 16, padding: 0 },
  addButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  ideas: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  idea: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  note: { fontSize: 13, textAlign: "center", paddingHorizontal: 10 },
});

export default ObjectivesScreen;
