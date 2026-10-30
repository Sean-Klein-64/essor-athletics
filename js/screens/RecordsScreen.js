import React, { useContext } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SlideScreenContainer from "../components/SlideScreenContainer";
import SectionLabel from "../components/SectionLabel";
import Pressable from "../components/Pressable";
import Glyph from "../components/Glyph";
import UserContext from "../variables/context";

import { DISTANCES, best, history as recordHistory } from "../lib/records";
import { PREDICTIONS, predict, formatClock, formatPace, racePace } from "../lib/paces";
import { formatShortDate } from "../lib/plan";

/*
  Mes records — the runner's personal bests in one place.
  Top: the VMA, with every test and typed value behind it (dated, where it
  came from). Then one card per distance: the record, its pace and date,
  what the current VMA predicts, how many times are logged. Tap a distance
  to add a time or see the full list (RecordScreen).
*/

const PREDICTION_FOR = { "5k": "5k", "10k": "10k", half: "semi", marathon: "marathon" };
const SOURCE = { test: "test 6’", typed: "saisie", site: "site" };

const fr = (n) => String(n).replace(".", ",");

const RecordsScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const {
    theme: { colors, typography },
    preferences: p,
  } = useContext(UserContext);

  const vmaHistory = [...(p.vmaHistory || [])].reverse();
  const bests = DISTANCES.filter((d) => best(p.records, d.id)).length;

  return (
    <SlideScreenContainer title="Mes records" type="back" navigation={navigation} route={route} ignoreKeyboard>
      <ScrollView style={{ width: "100%" }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
        {/* VMA + its history */}
        <View style={styles.section}>
          <SectionLabel>VMA</SectionLabel>
          <Pressable onPress={() => navigation.navigate("Vma")}>
            <View style={[styles.card, styles.vmaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.big, { color: colors.text }]}>
                  {p.vma ? fr(p.vma) : "—"}
                  <Text style={[typography.heading, { opacity: 0.5 }]}> km/h</Text>
                </Text>
                <Text style={[typography.finePrint, { fontSize: 14 }]}>
                  {vmaHistory[0] ? `${SOURCE[vmaHistory[0].source] || vmaHistory[0].source || ""} · ${formatShortDate(vmaHistory[0].date)}` : "Ajoute ta VMA ou ton test 6’"}
                </Text>
              </View>
              <Glyph name="right" size={16} color={colors.text} />
            </View>
          </Pressable>
          {vmaHistory.length > 1 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {vmaHistory.map((h, i) => {
                const prev = vmaHistory[i + 1];
                const delta = prev ? Math.round((h.value - prev.value) * 10) / 10 : 0;
                return (
                  <View key={`${h.date}-${i}`} style={[styles.row, i < vmaHistory.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={typography.heading}>{formatShortDate(h.date)}</Text>
                      <Text style={[typography.finePrint, { fontSize: 13 }]}>{SOURCE[h.source] || h.source || ""}</Text>
                    </View>
                    <Text style={[typography.heading, typography.mono]}>{fr(h.value)}</Text>
                    {!!delta && (
                      <Text style={[typography.finePrint, typography.bold, { opacity: 1, fontSize: 13, width: 44, textAlign: "right", color: delta > 0 ? colors.accentText : colors.text }]}>
                        {delta > 0 ? "+" : ""}
                        {fr(delta)}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Distances */}
        <View style={styles.section}>
          <View style={styles.head}>
            <SectionLabel>Records</SectionLabel>
            <Text style={[typography.finePrint, { fontSize: 13 }]}>
              {bests}/{DISTANCES.length}
            </Text>
          </View>
          {DISTANCES.map((d) => {
            const pb = best(p.records, d.id);
            const entries = recordHistory(p.records, d.id);
            const prediction = predict(p.vma, PREDICTIONS.find((x) => x.id === PREDICTION_FOR[d.id]));
            return (
              <Pressable key={d.id} onPress={() => navigation.navigate("Record", { id: d.id })}>
                <View style={[styles.card, styles.distance, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.distanceTop}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[typography.finePrint, { fontSize: 13, letterSpacing: 0.8, textTransform: "uppercase" }]}>{d.name}</Text>
                      <Text style={[styles.big, { color: colors.text }]}>{pb ? formatClock(pb.seconds) : "—"}</Text>
                      <Text style={[typography.finePrint, { fontSize: 14 }]}>
                        {pb ? `${formatPace(racePace(d.metres, pb.seconds))}${pb.date ? ` · ${formatShortDate(pb.date)}` : ""}` : "Pas encore de temps"}
                      </Text>
                    </View>
                    {pb ? (
                      <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
                        <Glyph name="trophy" size={18} color={colors.accentText} strokeWidth={2} />
                      </View>
                    ) : (
                      <View style={[styles.badge, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}>
                        <Glyph name="plus" size={18} color={colors.text} strokeWidth={2} />
                      </View>
                    )}
                  </View>
                  <View style={[styles.distanceBottom, { borderTopColor: colors.border }]}>
                    <Text style={[typography.finePrint, { fontSize: 13, flex: 1 }]}>
                      {prediction ? `Ta VMA prédit ${prediction.time}` : "Ajoute ta VMA pour une prédiction"}
                    </Text>
                    <Text style={[typography.finePrint, { fontSize: 13 }]}>
                      {entries.length ? `${entries.length} temps` : ""}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={[typography.finePrint, styles.hint]}>Un temps plus rapide que ton record devient le record ; les anciens restent dans la liste.</Text>
      </ScrollView>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 20 },
  section: { gap: 8 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 4 },
  card: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16 },
  vmaCard: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16 },
  big: { fontFamily: "Archivo-BlackItalic", fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  distance: { paddingVertical: 14, gap: 12 },
  distanceTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  distanceBottom: { flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, paddingTop: 10 },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  hint: { textAlign: "center", fontSize: 13, paddingHorizontal: 12 },
});

export default RecordsScreen;
