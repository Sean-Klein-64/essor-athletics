import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";

import UserContext from "../variables/context";

/*
  One line of a session, from describeStep() in js/lib/plan.js.
  Reps show the target big on the right (time for a distance, distance for
  a time), with the pace under it. A repeat draws its steps indented
  behind a thin accent rule.
*/

const StepRow = ({ row, last, hasVma }) => {
  const {
    theme: { colors, typography },
  } = useContext(UserContext);

  if (row.kind === "repeat") {
    return (
      <View style={[styles.repeat, !last && styles.divider, !last && { borderBottomColor: colors.border }]}>
        <Text style={[styles.repeatCount, { color: colors.accentText }]}>{row.title}</Text>
        <View style={[styles.repeatBody, { borderLeftColor: colors.accentText }]}>
          {row.children.map((child, i) => (
            <StepRow key={i} row={child} hasVma={hasVma} last={i === row.children.length - 1} />
          ))}
          {!!row.rest && (
            <Text style={[typography.finePrint, styles.rest]}>
              Entre les séries : {row.rest.title}
            </Text>
          )}
        </View>
      </View>
    );
  }

  const isRun = row.kind === "run";
  const quiet = row.kind === "jog" || row.kind === "walk";

  return (
    <View style={[styles.row, !last && styles.divider, !last && { borderBottomColor: colors.border }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={[
            typography.heading,
            isRun || row.kind === "test" ? typography.bold : null,
            quiet && { opacity: 0.6 },
          ]}
        >
          {row.title}
          {!!row.meta && <Text style={[typography.finePrint, styles.meta]}>{`  ${row.meta}`}</Text>}
        </Text>
        {!!row.sub && !isRun && <Text style={[typography.finePrint, styles.sub]}>{row.sub}</Text>}
        {!!row.note && <Text style={[typography.finePrint, styles.sub]}>{row.note}</Text>}
      </View>
      {isRun && (
        <View style={styles.target}>
          <Text style={[typography.title, typography.mono, styles.targetText]}>
            {row.target || "—"}
          </Text>
          <Text style={[typography.finePrint, styles.pace]}>
            {hasVma ? row.sub : "Ajoute ta VMA"}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  divider: { borderBottomWidth: 1 },
  meta: { fontSize: 14 },
  sub: { fontSize: 14, lineHeight: 18 },
  target: { alignItems: "flex-end" },
  targetText: { fontSize: 24, lineHeight: 28 },
  pace: { fontSize: 13 },
  repeat: { flexDirection: "row", paddingVertical: 10, gap: 10 },
  repeatCount: {
    fontFamily: "Archivo-BlackItalic",
    fontSize: 22,
    lineHeight: 28,
    minWidth: 40,
    paddingTop: 8,
  },
  repeatBody: { flex: 1, borderLeftWidth: 2, paddingLeft: 12 },
  rest: { fontSize: 14, paddingTop: 4, paddingBottom: 6 },
});

export default StepRow;
