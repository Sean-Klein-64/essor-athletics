import React, { useContext } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SlideScreenContainer from "../components/SlideScreenContainer";
import SectionLabel from "../components/SectionLabel";
import Pressable from "../components/Pressable";
import Glyph from "../components/Glyph";
import UserContext from "../variables/context";

import useSessions from "../lib/store";
import { formatDay, todayKey, sessionNumber } from "../lib/plan";
import { isBeginner } from "../lib/beginner";
import { clubHistory, clubStats, beginnerHistory, myBeginnerPosition, feelById, sinceLabel } from "../lib/history";

/*
  Mes séances — everything the runner has done.
  Levels 1–3: the cycle's past Fridays, newest first, each done (with how it
  felt and the note) or missed; the header counts them. Débuter: where they
  are in the programme and every walk-run session they've ticked, with dates.
  A runner who moved up from Débuter sees both.
*/

const Stat = ({ value, label, colors, typography }) => (
  <View style={{ flex: 1, gap: 2 }}>
    <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    <Text style={[typography.finePrint, { fontSize: 13 }]}>{label}</Text>
  </View>
);

const FeelTag = ({ feel, colors, typography }) => {
  const f = feelById(feel);
  if (!f) return null;
  return (
    <View style={[styles.tag, { backgroundColor: colors.accentSoft }]}>
      <Text style={[typography.finePrint, typography.bold, { opacity: 1, fontSize: 12, color: colors.accentText }]}>{f.name}</Text>
    </View>
  );
};

const HistoryScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const {
    theme: { colors, typography },
    preferences: p,
  } = useContext(UserContext);
  const { sessions } = useSessions();
  const today = todayKey();

  const club = clubHistory(sessions, p.done, today);
  const stats = clubStats(sessions, p.done, today);
  const beginner = isBeginner(p.level);
  const position = beginner ? myBeginnerPosition(p) : null;
  const walkRuns = beginnerHistory(p.beginnerDone);
  const lastDone = club.find((x) => x.status === "done");

  return (
    <SlideScreenContainer title="Mes séances" type="back" navigation={navigation} route={route} ignoreKeyboard>
      <ScrollView style={{ width: "100%" }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
        {/* Header: the numbers */}
        <View style={[styles.card, styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {beginner && position ? (
            <>
              <Text style={[typography.finePrint, { fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase" }]}>
                {position.programme} · semaine {position.week}
              </Text>
              <View style={styles.stats}>
                <Stat value={`${position.doneCount}/${position.total}`} label="séances du programme" colors={colors} typography={typography} />
                <Stat value={walkRuns[0] ? sinceLabel(walkRuns[0].at, today) : "—"} label="dernière séance" colors={colors} typography={typography} />
              </View>
              {!!position.next && (
                <Text style={[typography.finePrint, { fontSize: 14 }]}>
                  Prochaine : {position.next.label}
                  {position.next.test ? " — le test de fin de niveau" : ""}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={[typography.finePrint, { fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase" }]}>Cycle 1 · vers le Bout de l{"’"}An</Text>
              <View style={styles.stats}>
                <Stat value={`${stats.done}/${stats.past}`} label={stats.past > 1 ? "vendredis faits" : "vendredi fait"} colors={colors} typography={typography} />
                <Stat value={String(stats.streak)} label="d’affilée" colors={colors} typography={typography} />
                <Stat value={lastDone ? sinceLabel(lastDone.entry.at, today) : "—"} label="dernière" colors={colors} typography={typography} />
              </View>
              <Text style={[typography.finePrint, { fontSize: 14 }]}>
                {stats.total - stats.past} {stats.total - stats.past > 1 ? "séances restent" : "séance reste"} avant la course.
              </Text>
            </>
          )}
        </View>

        {/* Club Fridays */}
        {!!club.length && (
          <View style={styles.section}>
            <SectionLabel>Les vendredis</SectionLabel>
            {club.map(({ session, entry, status }) => (
              <Pressable key={session.id} onPress={() => navigation.navigate("Session", { id: session.id })}>
                <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.dot, status === "done" ? { backgroundColor: colors.accent } : { borderWidth: 1.5, borderColor: colors.border }]}>
                    {status === "done" && <Glyph name="check" size={14} color="white" strokeWidth={2.6} />}
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[typography.finePrint, { fontSize: 13 }]}>
                      {formatDay(session.date)} · {sessionNumber(session, sessions)}
                    </Text>
                    <Text style={[typography.heading, typography.bold]} numberOfLines={1}>
                      {session.title}
                    </Text>
                    {status === "done" ? (
                      <View style={styles.meta}>
                        <FeelTag feel={entry.feel} colors={colors} typography={typography} />
                        {!!entry.note && (
                          <Text style={[typography.finePrint, { fontSize: 13, flex: 1 }]} numberOfLines={2}>
                            {entry.note}
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text style={[typography.finePrint, { fontSize: 13 }]}>Pas marquée comme faite</Text>
                    )}
                  </View>
                  <Glyph name="right" size={16} color={colors.text} />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Débuter sessions */}
        {!!walkRuns.length && (
          <View style={styles.section}>
            <SectionLabel>Programme Débuter</SectionLabel>
            {walkRuns.map((w) => (
              <Pressable key={`${w.levelId}:${w.index}`} onPress={() => navigation.navigate("BeginnerSession", { level: w.levelId, index: w.index })}>
                <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.dot, { backgroundColor: colors.accent }]}>
                    <Glyph name="check" size={14} color="white" strokeWidth={2.6} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[typography.finePrint, { fontSize: 13 }]}>
                      {w.at ? formatDay(w.at) : "—"} · {w.programme} · S{w.week} · {w.slotName}
                    </Text>
                    <Text style={[typography.heading, typography.bold]} numberOfLines={1}>
                      {w.label}
                      {w.test ? " · test réussi" : ""}
                    </Text>
                  </View>
                  <Glyph name="right" size={16} color={colors.text} />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {!club.length && !walkRuns.length && (
          <Text style={[typography.finePrint, styles.empty]}>Ta première séance apparaîtra ici une fois marquée comme faite.</Text>
        )}
      </ScrollView>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 20 },
  card: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16 },
  hero: { paddingVertical: 18, gap: 12 },
  stats: { flexDirection: "row", gap: 12 },
  statValue: { fontFamily: "Archivo-BlackItalic", fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
  section: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  dot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  meta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  empty: { fontSize: 14, textAlign: "center", paddingVertical: 24 },
});

export default HistoryScreen;
