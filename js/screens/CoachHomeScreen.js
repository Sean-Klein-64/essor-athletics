import React, { useContext } from "react";
import { StyleSheet, View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Pressable from "../components/Pressable";
import Glyph from "../components/Glyph";
import Wordmark from "../components/Wordmark";
import SectionLabel from "../components/SectionLabel";
import OutingsCard from "../components/OutingsCard";
import UserContext from "../variables/context";

import useSessions from "../lib/store";
import { splitSessions, formatDay, todayKey } from "../lib/plan";
import myWeek from "../lib/myWeek";

/*
  Coach view — what members never see. Tap a session for its hub (who's
  coming, their paces — CoachSessionScreen), the pencil to edit it, who said
  "Je viens" to this week's group runs, and Sean's own week (bookings are in Wodify). "Vue membre" switches to the member Home.
*/

const Row = ({ session, count, onPress, onEdit, colors, typography, draft }) => (
  <Pressable onPress={onPress}>
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[typography.finePrint, { fontSize: 13 }]}>
          {formatDay(session.date)}
          {draft ? "  ·  sur ce téléphone" : ""}
        </Text>
        <Text style={[typography.heading, typography.bold]} numberOfLines={1}>
          {session.title}
        </Text>
      </View>
      {count !== undefined && (
        <View style={styles.count}>
          <Glyph name="people" size={14} color={colors.text} />
          <Text style={[typography.finePrint, { fontSize: 14 }]}>{count}</Text>
        </View>
      )}
      {onEdit ? (
        <Pressable onPress={onEdit} small hitSlop={10}>
          <View style={[styles.edit, { borderColor: colors.border }]}>
            <Glyph name="pencil" size={15} color={colors.text} />
          </View>
        </Pressable>
      ) : (
        <Glyph name="right" size={16} color={colors.text} />
      )}
    </View>
  </Pressable>
);

const CoachHomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { theme, preferences, setPreference } = useContext(UserContext);
  const { colors, typography } = theme;
  const { sessions, shared } = useSessions();
  const { next, upcoming, past } = splitSessions(todayKey(), sessions);
  const local = preferences.coachSessions || {};

  const edit = (s) => navigation.navigate("SessionEditor", { id: s?.id });
  const hub = (s) => navigation.navigate("CoachSession", { id: s.id });
  const today = myWeek[(new Date().getDay() + 6) % 7];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Wordmark size={28} color={colors.text} accent={colors.accentText} />
        </View>
        <Pressable onPress={() => setPreference("view", "member")} small hitSlop={8}>
          <View style={[styles.switch, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.finePrint, typography.bold, { opacity: 1, fontSize: 14 }]}>Vue membre</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Profile")} small hitSlop={8}>
          <View style={[styles.round, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Glyph name="user" size={18} color={colors.text} />
          </View>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
          <Text style={[typography.finePrint, { color: colors.accentText, opacity: 1, fontSize: 14 }]}>
            Coach · {preferences.name}
            {shared ? "" : "  ·  base partagée pas encore activée"}
          </Text>
        </View>

        <Pressable onPress={() => edit()}>
          <View style={[styles.new, { backgroundColor: colors.accent }]}>
            <Glyph name="plus" size={18} color="white" strokeWidth={2.4} />
            <Text style={[typography.body, { color: "white" }]}>Nouvelle séance</Text>
          </View>
        </Pressable>

        {!!next && (
          <View style={styles.section}>
            <SectionLabel>Prochaine séance</SectionLabel>
            <Row session={next} onPress={() => hub(next)} onEdit={() => edit(next)} draft={!!local[next.id] && !shared} colors={colors} typography={typography} />
            <Pressable onPress={() => navigation.navigate("Session", { id: next.id })} small>
              <Text style={[typography.finePrint, styles.link, { color: colors.accentText }]}>Voir comme un membre</Text>
            </Pressable>
          </View>
        )}

        {!!upcoming.length && (
          <View style={styles.section}>
            <SectionLabel>À venir</SectionLabel>
            {upcoming.map((s) => (
              <Row key={s.id} session={s} onPress={() => hub(s)} onEdit={() => edit(s)} draft={!!local[s.id] && !shared} colors={colors} typography={typography} />
            ))}
          </View>
        )}

        <OutingsCard coach />

        <View style={styles.section}>
          <SectionLabel>Ma semaine</SectionLabel>
          <Pressable onPress={() => navigation.navigate("MyWeek")}>
            <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[typography.finePrint, { fontSize: 13 }]}>Aujourd{"'"}hui · {today.day}</Text>
                <Text style={[typography.heading, typography.bold]}>{today.title}</Text>
              </View>
              <Glyph name="right" size={16} color={colors.text} />
            </View>
          </Pressable>
        </View>

        {!!past.length && (
          <View style={styles.section}>
            <SectionLabel>Passées</SectionLabel>
            {past.map((s) => (
              <Row key={s.id} session={s} onPress={() => hub(s)} onEdit={() => edit(s)} colors={colors} typography={typography} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20 },
  switch: { height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, justifyContent: "center" },
  round: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, paddingTop: 14, gap: 20 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  new: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 56, borderRadius: 28 },
  section: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 },
  count: { flexDirection: "row", alignItems: "center", gap: 4 },
  edit: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  link: { textAlign: "center", opacity: 1, fontSize: 14, paddingVertical: 4 },
});

export default CoachHomeScreen;
