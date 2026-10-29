import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";

import Pressable from "./Pressable";
import Glyph from "./Glyph";
import UserContext from "../variables/context";
import haptics from "../utils/haptics";

import { gapPlan, indexLabel } from "../lib/beginner";
import { todayKey } from "../lib/plan";
import { reportProgress } from "../lib/member";

/*
  A Débuter runner coming back after a gap: the step back the rule proposes
  (repeat the last session / back a week / restart the level), with
  "D'accord" to apply it or "J'ai couru de mon côté" to carry on. Either
  answer is remembered for this gap, and the coach sees it in the hub.
  Nothing shows when the gap is a week or less.
*/

const ComebackCard = () => {
  const { theme, preferences, setPreference } = useContext(UserContext);
  const { colors, typography } = theme;
  const levelId = preferences.level;
  const plan = gapPlan(preferences, levelId, todayKey());
  if (!plan) return null;

  const answer = async (accept) => {
    haptics.light();
    const lastAt = preferences.programmeLog?.[levelId]?.slice(-1)[0]?.at;
    const programme = accept ? { ...(preferences.programme || {}), [levelId]: plan.to } : preferences.programme;
    if (accept) await setPreference("programme", programme);
    const programmeReturn = { ...(preferences.programmeReturn || {}), [levelId]: { lastAt, days: plan.days, action: plan.action, accepted: accept, at: todayKey() } };
    await setPreference("programmeReturn", programmeReturn);
    reportProgress({ ...preferences, programme, programmeReturn });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.accentSoft, borderColor: colors.accentText }]}>
      <View style={styles.head}>
        <Glyph name="heart" size={16} color={colors.accentText} strokeWidth={2.2} />
        <Text style={[typography.heading, typography.bold, { color: colors.accentText, flex: 1 }]}>{plan.title}</Text>
      </View>
      <Text style={[typography.finePrint, { color: colors.accentText, opacity: 1, fontSize: 15, lineHeight: 21 }]}>{plan.text}</Text>
      {plan.to !== plan.from && (
        <Text style={[typography.finePrint, { color: colors.accentText, opacity: 0.85, fontSize: 13 }]}>
          Reprise à la {indexLabel(plan.to)} (au lieu de la {indexLabel(plan.from)}).
        </Text>
      )}
      <View style={styles.buttons}>
        <Pressable onPress={() => answer(true)}>
          <View style={[styles.primary, { backgroundColor: colors.accent }]}>
            <Text style={[typography.heading, typography.bold, { fontSize: 15, color: "white" }]}>D{"'"}accord, on reprend là</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => answer(false)} small>
          <Text style={[typography.finePrint, styles.secondary, { color: colors.accentText }]}>J{"'"}ai couru de mon côté — je continue</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 8 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  buttons: { gap: 4, marginTop: 4 },
  primary: { height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondary: { textAlign: "center", opacity: 1, fontSize: 14, paddingVertical: 8 },
});

export default ComebackCard;
