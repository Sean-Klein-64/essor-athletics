import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";

import Pressable from "./Pressable";
import Glyph from "./Glyph";
import UserContext from "../variables/context";

import { testCountdown, testCountdownLine } from "../lib/beginner";
import { todayKey } from "../lib/plan";

/*
  Mon test — the beginner's countdown, the hero card where Levels 1–3 have
  the race. Big: the sessions left to the end-of-level test. Then what the
  test is, the weeks at their rhythm, the bar towards 30' without
  stopping, and what passing unlocks. Tap → the programme in full.
*/

const TestCountdown = ({ onOpen }) => {
  const { theme, preferences } = useContext(UserContext);
  const { colors, typography } = theme;
  const c = testCountdown(preferences, todayKey());
  if (!c) return null;

  return (
    <Pressable onPress={onOpen} animation={false}>
      <View style={[styles.card, { backgroundColor: colors.accent }]}>
        <View style={styles.top}>
          <Text style={[typography.finePrint, styles.kicker]}>{c.isTestNext ? "C'EST POUR BIENTÔT" : `TEST DE FIN DE ${c.levelName.toUpperCase()}`}</Text>
          <View style={styles.pill}>
            <Text style={[typography.finePrint, styles.pillText]}>{c.rhythm.toString().replace(".", ",")} séances / sem.</Text>
          </View>
        </View>

        <View style={styles.middle}>
          <Text style={styles.big} numberOfLines={1} adjustsFontSizeToFit>
            {c.isTestNext ? "Le test" : `${c.sessionsLeft} séance${c.sessionsLeft > 1 ? "s" : ""}`}
          </Text>
          <Text style={styles.title}>{c.test.label} — {c.test.minutes}{"'"} sans t{"'"}arrêter</Text>
          <Text style={[typography.finePrint, styles.sub]}>{testCountdownLine(c)}</Text>
        </View>

        <View style={styles.progress}>
          <View style={styles.progressHead}>
            <Text style={[typography.finePrint, styles.sub]}>Aujourd{"'"}hui tu cours {c.minutesNow}{"'"} sans t{"'"}arrêter</Text>
            <Text style={[typography.finePrint, styles.sub, { opacity: 1 }]}>{c.minutesNow}{"'"} / 30{"'"}</Text>
          </View>
          <View style={styles.bar}>
            <View style={[styles.fill, { width: `${Math.max(3, Math.round(c.pct * 100))}%` }]} />
          </View>
          <View style={styles.unlockRow}>
            <Glyph name="trophy" size={13} color="white" strokeWidth={2.2} />
            <Text style={[typography.finePrint, styles.sub, { flex: 1 }]}>Réussi → {c.unlock}{c.test.next === "level3" ? " : la séance du vendredi avec tout le monde" : ""}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 24, overflow: "hidden", padding: 18, gap: 16 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  kicker: { color: "white", opacity: 0.85, fontSize: 11, letterSpacing: 0.9, flex: 1 },
  pill: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { color: "white", opacity: 1, fontSize: 12 },
  middle: { gap: 2, marginTop: 10 },
  big: { fontFamily: "Archivo-BlackItalic", fontSize: 56, lineHeight: 62, letterSpacing: -1.5, color: "white" },
  title: { fontFamily: "Archivo-BlackItalic", fontSize: 22, lineHeight: 26, letterSpacing: -0.4, color: "white" },
  sub: { color: "white", opacity: 0.85, fontSize: 14 },
  progress: { gap: 8 },
  progressHead: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  bar: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" },
  fill: { height: 8, borderRadius: 4, backgroundColor: "white" },
  unlockRow: { flexDirection: "row", alignItems: "center", gap: 6 },
});

export default TestCountdown;
