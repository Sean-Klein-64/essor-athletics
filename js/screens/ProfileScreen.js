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
import { ZONES, PREDICTIONS, zonePace, zoneHeartRate, zonePercent, predict, formatClock, formatPace, racePace } from "../lib/paces";
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
    setPreference,
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

        {!!(p.vma || p.hrMax) && (
          <View style={styles.section}>
            <SectionLabel>Tes zones</SectionLabel>
            <Card colors={colors}>
              {ZONES.map((zone, i) => {
                const pace = p.vma ? zonePace(p.vma, zone.vma) : null;
                const hr = zoneHeartRate(p.hrMax, zone.hr);
                return (
                  <View
                    key={zone.id}
                    style={[styles.row, i < ZONES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={typography.heading}>{zone.name}</Text>
                      <Text style={[typography.finePrint, { fontSize: 13 }]}>{zone.note}</Text>
                      <Text style={[typography.finePrint, styles.zonePct, { color: colors.accentText }]}>
                        {[zonePercent(zone.vma, "VMA"), zonePercent(zone.hr, "FC max")].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 2 }}>
                      {!!pace && (zone.vma || !hr) && (
                        <Text style={[typography.heading, typography.mono, styles.zoneValue]}>{pace}</Text>
                      )}
                      {!!hr && (
                        <Text style={[typography.finePrint, typography.mono, styles.zoneHr]}>{hr}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </Card>
            {!p.hrMax && (
              <Pressable onPress={() => navigation.navigate("Question", { field: "hrMax" })} small>
                <Text style={[typography.finePrint, styles.hint, { color: colors.accentText, opacity: 1 }]}>
                  Ajoute ta FC max pour voir la fréquence cardiaque de chaque zone
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {!!p.vma && (
          <View style={styles.section}>
            <SectionLabel>Tes prédictions</SectionLabel>
            <Card colors={colors}>
              {PREDICTIONS.map((race, i) => {
                const result = predict(p.vma, race);
                const hr = zoneHeartRate(p.hrMax, race.hr);
                return (
                  <View
                    key={race.id}
                    style={[styles.row, i < PREDICTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={typography.heading}>{race.name}</Text>
                      <Text style={[typography.finePrint, { fontSize: 13 }]}>{race.note}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 2 }}>
                      <Text style={[typography.heading, typography.mono, styles.predTime]}>{result.time}</Text>
                      <Text style={[typography.finePrint, typography.mono, styles.zoneHr]}>
                        {[result.pace, hr].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Card>
            <Text style={[typography.finePrint, styles.hint]}>
              Calculées depuis ta VMA ({vmaText} km/h). Refais le test VMA pour les mettre à jour.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <SectionLabel>Records</SectionLabel>
          <Card colors={colors}>
            <Row title="Mes records" value="Tout voir" sub="VMA, historique, prédictions" onPress={() => navigation.navigate("Records")} {...rowProps} />
            <Row title="Mes séances" value="Tout voir" sub="Les vendredis faits, le programme" onPress={() => navigation.navigate("History")} {...rowProps} />
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
              title="FC max"
              value={p.hrMax ? `${p.hrMax} bpm` : "Ajouter"}
              onPress={() => navigation.navigate("Question", { field: "hrMax" })}
              {...rowProps}
            />
            <Row
              title="Mode coach"
              value={p.coach ? "Activé" : "Code"}
              onPress={() => (p.coach ? setPreference("view", "coach") : navigation.navigate("CoachCode"))}
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
  zoneValue: { fontSize: 15, opacity: 0.85 },
  zoneHr: { fontSize: 13 },
  zonePct: { fontSize: 12, opacity: 1, marginTop: 2 },
  predTime: { fontSize: 17 },
  hint: { textAlign: "center", marginTop: 4, fontSize: 13 },
});

export default ProfileScreen;
