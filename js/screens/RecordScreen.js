import React, { useContext, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Button from "../components/Button";
import Input from "../components/Input";
import Pressable from "../components/Pressable";
import Glyph from "../components/Glyph";
import UserContext from "../variables/context";

import { distanceById, best, history as recordHistory } from "../lib/records";
import { parseClock, formatClock, formatPace, racePace } from "../lib/paces";
import { todayKey, formatShortDate } from "../lib/plan";
import haptics from "../utils/haptics";

/*
  One distance: log a new time (and when), see every time logged with the
  best one marked. Tap × to remove a mistaken entry.
*/

/* "15/11/2026" → "2026-11-15", or null */
const parseDate = (text) => {
  const m = String(text).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  const key = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return key <= todayKey() ? key : null;
};

const RecordScreen = ({ navigation, route }) => {
  const {
    theme: { colors, typography },
    preferences,
    saveRecord,
    removeRecord,
  } = useContext(UserContext);
  const distance = distanceById(route.params?.id);
  const [time, setTime] = useState("");
  const [date, setDate] = useState(formatShortDate(todayKey()));
  const [newPb, setNewPb] = useState(null); // seconds beaten by the time just saved

  if (!distance) return null;

  const seconds = parseClock(time);
  const dateKey = parseDate(date);
  const isValid = !!seconds && !!dateKey;
  const pb = best(preferences.records, distance.id);
  const entries = recordHistory(preferences.records, distance.id);

  const save = async () => {
    const beaten = pb && seconds < pb.seconds ? pb.seconds : pb ? null : 0;
    await saveRecord(distance.id, seconds, dateKey);
    setTime("");
    setNewPb(beaten);
    haptics.medium();
  };

  return (
    <SlideScreenContainer title={distance.name} type="back" navigation={navigation} route={route}>
      <ScrollView style={{ width: "100%" }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {newPb !== null && (
          <View style={[styles.banner, { backgroundColor: colors.accent }]}>
            <Glyph name="trophy" size={20} color="white" strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.heading, typography.bold, { color: "white" }]}>{newPb ? "Nouveau record !" : "Premier temps enregistré"}</Text>
              <Text style={[typography.finePrint, { color: "rgba(255,255,255,0.85)", opacity: 1, fontSize: 13 }]}>
                {newPb ? `${formatClock(newPb - (pb?.seconds || 0))} de mieux que l’ancien` : "Il devient ton record à battre"}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.pb}>
          <Text style={[typography.finePrint, { fontSize: 13 }]}>RECORD</Text>
          <Text style={[styles.pbTime, { color: colors.text }]}>{pb ? formatClock(pb.seconds) : "—"}</Text>
          {!!pb && (
            <Text style={[typography.finePrint, { fontSize: 14 }]}>
              {formatPace(racePace(distance.metres, pb.seconds))} · {formatShortDate(pb.date)}
            </Text>
          )}
        </View>

        <View style={{ gap: 4 }}>
          <Text style={[typography.finePrint, styles.label]}>Temps</Text>
          <Input placeholder={distance.placeholder} onChangeText={setTime} value={time} keyboardType="numbers-and-punctuation" />
          <Text style={[typography.finePrint, styles.label, { marginTop: 10 }]}>Date</Text>
          <Input placeholder="JJ/MM/AAAA" onChangeText={setDate} value={date} keyboardType="numbers-and-punctuation" />
          <Button disabled={!isValid} onPress={save} style={{ marginTop: 16 }}>
            Ajouter ce temps
          </Button>
        </View>

        {!!entries.length && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {entries.map((e, i) => {
              const isBest = pb && e.seconds === pb.seconds && e.date === pb.date;
              return (
                <View
                  key={`${e.date}-${e.seconds}`}
                  style={[styles.row, i < entries.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                >
                  <Text style={[typography.finePrint, { flex: 1, fontSize: 15 }]}>{formatShortDate(e.date)}</Text>
                  {isBest && <Glyph name="trophy" size={16} color={colors.accentText} />}
                  <Text style={[typography.heading, typography.mono, { minWidth: 80, textAlign: "right" }]}>
                    {formatClock(e.seconds)}
                  </Text>
                  <Pressable small hitSlop={8} onPress={() => removeRecord(distance.id, e)}>
                    <View accessibilityLabel="Supprimer" style={styles.remove}>
                      <Glyph name="cross" size={14} color={colors.text} />
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { padding: 20, gap: 24, paddingBottom: 60 },
  pb: { alignItems: "center", gap: 2 },
  banner: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14 },
  pbTime: { fontFamily: "Archivo-BlackItalic", fontSize: 52, lineHeight: 60, letterSpacing: -1 },
  label: { textAlign: "center", fontSize: 14 },
  card: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 },
  remove: { width: 28, height: 28, alignItems: "center", justifyContent: "center", opacity: 0.5 },
});

export default RecordScreen;
