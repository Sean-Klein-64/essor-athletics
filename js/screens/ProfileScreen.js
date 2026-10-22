import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import appConfig from "../../app.json";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Pressable from "../components/Pressable";
import Glyph from "../components/Glyph";
import SectionLabel from "../components/SectionLabel";
import UserContext from "../variables/context";

import { levelById } from "../lib/levels";
import { DISTANCES, best } from "../lib/records";
import { ZONES, zonePace, formatClock, formatPace, racePace } from "../lib/paces";
import { formatShortDate } from "../lib/plan";

/*
  Profile — VMA (with the paces it gives), personal bests, and the few
  settings. Tapping a line opens the screen that changes it.
*/

const Card = ({ children, colors, style }) => (
  <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
    {children}
  </View>
);

const Row = ({ title, value, sub, mono, onPress, colors, typography, last, chevron = true }) => (
  <Pressable onPress={onPress} animation={false}>
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <Text style={[typography.heading, { flex: 1 }]}>{title}</Text>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[typography.heading, mono && typography.mono, styles.value]} numberOfLines={1}>
          {value}
        </Text>
        {!!sub && <Text style={[typography.finePrint, { fontSize: 13 }]}>{sub}</Text>}
      </View>
      {chevron && <Glyph name="right" size={16} color={colors.text} />}
    </View>
  </Pressable>
);

const THEMES = [null, "light", "dark"];
const themeLabel = { light: "Clair", dark: "Sombre" };

const ProfileScreen = ({ navigation, route }) => {
  const {
    theme: { colors, typography },
    preferences: p,
    selectedTheme,
    setTheme,
  } = useContext(UserContext);
  const rowProps = { colors, typography };
  const lastVma = (p.vmaHistory || []).slice(-1)[0];
  const vmaText = p.vma ? String(p.vma).replace(".", ",") : "—";
  const cycle = (list, current) => list[(list.indexOf(current) + 1) % list.length];

  return (
    <SlideScreenContainer title={p.name || "Mon profil"} type="back" navigation={navigation} route={route} ignoreKeyboard>
      <ScrollView style={{ width: "100%" }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* VMA, big */}
        <View style={styles.section}>
          <SectionLabel>VMA</SectionLabel>
          <Pressable onPress={() => navigation.navigate("Vma")}>
            <Card colors={colors} style={styles.vmaCard}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.vmaNumber, { color: colors.text }]}>
                  {vmaText}
                  <Text style={[typography.heading, { opacity: 0.5 }]}> km/h</Text>
                </Text>
                <Text style={[typography.finePrint, { fontSize: 14 }]}>
                  {lastVma
                    ? `${lastVma.source === "test" ? "Test" : "Ajoutée"} le ${formatShortDate(lastVma.date)}`
                    : "Pas encore mesurée — test à la première séance"}
                </Text>
              </View>
              <View style={[styles.update, { backgroundColor: colors.accent }]}>
                <Text style={[typography.finePrint, typography.bold, { opacity: 1, color: "white", fontSize: 14 }]}>
                  {p.vma ? "Mettre à jour" : "Ajouter"}
                </Text>
              </View>
            </Card>
          </Pressable>
        </View>

        {!!p.vma && (
          <View style={styles.section}>
            <SectionLabel>Tes allures</SectionLabel>
            <Card colors={colors}>
              {ZONES.map((zone, i) => (
                <View
                  key={zone.id}
                  style={[styles.row, i < ZONES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={typography.heading}>{zone.name}</Text>
                    <Text style={[typography.finePrint, { fontSize: 13 }]}>{zone.note}</Text>
                  </View>
                  <Text style={[typography.heading, typography.mono, styles.value]}>
                    {zonePace(p.vma, zone.range)}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        <View style={styles.section}>
          <SectionLabel>Records</SectionLabel>
          <Card colors={colors}>
            {DISTANCES.map((d, i) => {
              const pb = best(p.records, d.id);
              return (
                <Row
                  key={d.id}
                  title={d.name}
                  value={pb ? formatClock(pb.seconds) : "Ajouter"}
                  sub={pb ? formatPace(racePace(d.metres, pb.seconds)) : undefined}
                  mono={!!pb}
                  onPress={() => navigation.navigate("Record", { id: d.id })}
                  last={i === DISTANCES.length - 1}
                  {...rowProps}
                />
              );
            })}
          </Card>
        </View>

        <View style={styles.section}>
          <SectionLabel>Moi</SectionLabel>
          <Card colors={colors}>
            <Row title="Prénom" value={p.name || "—"} onPress={() => navigation.navigate("Question", { field: "name" })} {...rowProps} />
            <Row
              title="Niveau"
              value={levelById(p.level).name}
              onPress={() => navigation.navigate("Question", { field: "level" })}
              {...rowProps}
            />
            <Row
              title="Thème"
              value={themeLabel[selectedTheme] || "Système"}
              onPress={() => setTheme(cycle(THEMES, selectedTheme || null))}
              chevron={false}
              last
              {...rowProps}
            />
          </Card>
          <Text style={[typography.finePrint, styles.hint]}>
            Essor Athletics {appConfig.expo?.version || ""} · Tes données restent sur ton téléphone.
          </Text>
        </View>
      </ScrollView>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, gap: 24 },
  section: { gap: 8 },
  card: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16 },
  vmaCard: { flexDirection: "row", alignItems: "center", paddingVertical: 16, gap: 12 },
  vmaNumber: { fontFamily: "Archivo-BlackItalic", fontSize: 44, lineHeight: 52, letterSpacing: -1 },
  update: { height: 34, paddingHorizontal: 14, borderRadius: 17, justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 56, paddingVertical: 10 },
  value: { fontSize: 16, opacity: 0.8 },
  hint: { textAlign: "center", marginTop: 4, fontSize: 13 },
});

export default ProfileScreen;
