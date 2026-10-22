import React, { useContext } from "react";
import { StyleSheet, View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Pressable from "../components/Pressable";
import Glyph from "../components/Glyph";
import Wordmark from "../components/Wordmark";
import SectionLabel from "../components/SectionLabel";
import UserContext from "../variables/context";

import { splitSessions, formatDay, totalLabel } from "../lib/plan";
import { levelById } from "../lib/levels";
import useAttendance from "../lib/attendance";

/*
  Home — the next session up front (big card, with "Je viens" right on it),
  then what's coming and what's done. Everything is already sized for the
  runner's level and VMA; tapping a session opens the full detail.
*/

const formatVma = (vma) => `${String(vma).replace(".", ",")} km/h`;

const NextCard = ({ session, onPress }) => {
  const { theme, preferences } = useContext(UserContext);
  const { colors, typography } = theme;
  const { going, toggle, attendees, shared } = useAttendance(session.id);
  const count = attendees.length;

  return (
    <View style={[styles.next, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable onPress={onPress} animation={false}>
        <View style={styles.nextBody}>
          <Text style={[typography.finePrint, styles.kicker]}>
            {formatDay(session.date)} · {totalLabel(session, preferences.level, preferences.vma)}
          </Text>
          <Text style={[styles.nextTitle, { color: colors.text }]}>{session.title}</Text>
          <Text style={[typography.finePrint, styles.summary]} numberOfLines={3}>
            {session.summary}
          </Text>
          <View style={styles.openRow}>
            <Text style={[typography.heading, { color: colors.accentText }]}>Voir ma séance</Text>
            <Glyph name="right" size={16} color={colors.accentText} strokeWidth={2.2} />
          </View>
        </View>
      </Pressable>

      <View style={[styles.goingRow, { borderTopColor: colors.border }]}>
        <View style={styles.goingCount}>
          <Glyph name="people" size={16} color={colors.text} />
          <Text style={[typography.finePrint, { fontSize: 14 }]}>
            {shared ? (count ? `${count} ${count === 1 ? "inscrit" : "inscrits"}` : "Personne encore") : "Vendredi, piste de Floride"}
          </Text>
        </View>
        <Pressable onPress={toggle} small hitSlop={6}>
          <View
            accessibilityRole="button"
            accessibilityState={{ selected: going }}
            style={[
              styles.goingButton,
              going
                ? { backgroundColor: colors.accent, borderColor: colors.accent }
                : { borderColor: colors.border },
            ]}
          >
            {going && <Glyph name="check" size={14} color="white" strokeWidth={2.6} />}
            <Text
              style={[
                typography.heading,
                typography.bold,
                { fontSize: 15, color: going ? "white" : colors.text },
              ]}
            >
              {going ? "Je viens" : "Je viens ?"}
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const RowCard = ({ session, done, onPress }) => {
  const { theme, preferences } = useContext(UserContext);
  const { colors, typography } = theme;
  return (
    <Pressable onPress={onPress}>
      <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[typography.finePrint, { fontSize: 13 }]}>{formatDay(session.date)}</Text>
          <Text style={[typography.heading, typography.bold]} numberOfLines={1}>
            {session.title}
          </Text>
        </View>
        {done ? (
          <View style={[styles.doneDot, { backgroundColor: colors.accent }]}>
            <Glyph name="check" size={14} color="white" strokeWidth={2.6} />
          </View>
        ) : (
          <Text style={[typography.finePrint, { fontSize: 14 }]}>
            {totalLabel(session, preferences.level, preferences.vma)}
          </Text>
        )}
        <Glyph name="right" size={16} color={colors.text} />
      </View>
    </Pressable>
  );
};

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { theme, preferences } = useContext(UserContext);
  const { colors, typography } = theme;
  const { next, upcoming, past } = splitSessions();
  const level = levelById(preferences.level);
  const open = (session) => navigation.navigate("Session", { id: session.id });

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Wordmark size={28} color={colors.text} accent={colors.accentText} />
        </View>
        <Pressable onPress={() => navigation.navigate("Profile")} small hitSlop={8}>
          <View
            accessibilityLabel="Mon profil"
            style={[styles.round, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Glyph name="user" size={18} color={colors.text} />
          </View>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Who you are in the club, at a glance */}
        <View style={styles.chips}>
          <Pressable onPress={() => navigation.navigate("Question", { field: "level" })} small>
            <View style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[typography.finePrint, typography.bold, styles.chipText]}>{level.name}</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Vma")} small>
            <View
              style={[
                styles.chip,
                preferences.vma
                  ? { backgroundColor: colors.card, borderColor: colors.border }
                  : { backgroundColor: colors.accentSoft, borderColor: colors.accentText },
              ]}
            >
              <Glyph name="bolt" size={13} color={colors.accentText} strokeWidth={2.2} />
              <Text
                style={[
                  typography.finePrint,
                  typography.bold,
                  styles.chipText,
                  !preferences.vma && { color: colors.accentText },
                ]}
              >
                {preferences.vma ? `VMA ${formatVma(preferences.vma)}` : "Ajouter ma VMA"}
              </Text>
            </View>
          </Pressable>
        </View>

        {next ? (
          <View style={styles.section}>
            <SectionLabel>Prochaine séance</SectionLabel>
            <NextCard session={next} onPress={() => open(next)} />
            {!preferences.vma && level.group === "club" && (
              <Text style={[typography.finePrint, styles.hint]}>
                Ajoute ta VMA et chaque fraction affichera le temps à viser.
              </Text>
            )}
          </View>
        ) : (
          <Text style={[typography.copy, styles.empty]}>
            Les prochaines séances arrivent bientôt.
          </Text>
        )}

        {!!upcoming.length && (
          <View style={styles.section}>
            <SectionLabel>À venir</SectionLabel>
            {upcoming.map((s) => (
              <RowCard key={s.id} session={s} onPress={() => open(s)} />
            ))}
          </View>
        )}

        {!!past.length && (
          <View style={styles.section}>
            <SectionLabel>Passées</SectionLabel>
            {past.map((s) => (
              <RowCard key={s.id} session={s} done={!!preferences.done?.[s.id]} onPress={() => open(s)} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20 },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: 20, paddingTop: 14, gap: 22 },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
  },
  chipText: { opacity: 1, fontSize: 14 },
  section: { gap: 10 },
  next: { borderWidth: 1, borderRadius: 24, overflow: "hidden" },
  nextBody: { padding: 18, gap: 6 },
  kicker: { fontSize: 14 },
  nextTitle: {
    fontFamily: "Archivo-BlackItalic",
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -0.8,
  },
  summary: { fontSize: 15, lineHeight: 20 },
  openRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  goingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  goingCount: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  goingButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  doneDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  hint: { textAlign: "center", fontSize: 14, paddingHorizontal: 20 },
  empty: { textAlign: "center", opacity: 0.5, marginTop: 40 },
});

export default HomeScreen;
