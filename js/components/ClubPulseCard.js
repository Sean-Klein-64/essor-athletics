import React, { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";

import Glyph from "./Glyph";
import SectionLabel from "./SectionLabel";
import UserContext from "../variables/context";

import useSessions from "../lib/store";
import { todayKey, formatShortDate } from "../lib/plan";
import { cycleStart, fetchPulse, pulseLines, passageLines } from "../lib/club";

/*
  "Le groupe ce cycle" — three numbers and the level passages since the
  cycle began. Hidden until there is something to show (or when offline).
*/

const ClubPulseCard = () => {
  const { theme } = useContext(UserContext);
  const { colors, typography } = theme;
  const { sessions } = useSessions();
  const since = cycleStart(sessions, todayKey());
  const [pulse, setPulse] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchPulse(since)
      .then((p) => alive && setPulse(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [since]);

  const lines = pulseLines(pulse);
  const passages = passageLines(pulse);
  if (!lines.length) return null;

  return (
    <View style={styles.section}>
      <SectionLabel>Le groupe ce cycle</SectionLabel>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.stats}>
          {lines.map((l) => (
            <View key={l.key} style={styles.stat}>
              <Text style={[styles.number, { color: colors.text }]}>{l.value}</Text>
              <Text style={[typography.finePrint, { fontSize: 12, lineHeight: 16 }]}>{l.label}</Text>
            </View>
          ))}
        </View>
        {!!passages.length && (
          <View style={[styles.passages, { borderTopColor: colors.border }]}>
            <Glyph name="trophy" size={14} color={colors.accentText} strokeWidth={2.2} />
            <Text style={[typography.finePrint, { fontSize: 14, flex: 1, color: colors.accentText, opacity: 1 }]}>
              {passages.length > 1 ? "Passages de niveau : " : "Passage de niveau : "}
              {passages.join(" · ")}
            </Text>
          </View>
        )}
        <Text style={[typography.finePrint, { fontSize: 12 }]}>Depuis le {formatShortDate(since)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { gap: 10 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 },
  stats: { flexDirection: "row", gap: 12 },
  stat: { flex: 1, gap: 2 },
  number: { fontFamily: "Archivo-BlackItalic", fontSize: 34, lineHeight: 38, letterSpacing: -0.8 },
  passages: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, paddingTop: 12 },
});

export default ClubPulseCard;
