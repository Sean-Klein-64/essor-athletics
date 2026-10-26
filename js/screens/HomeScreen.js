import React, { useContext } from "react";
import { StyleSheet, View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Pressable from "../components/Pressable";
import Glyph from "../components/Glyph";
import Wordmark from "../components/Wordmark";
import SectionLabel from "../components/SectionLabel";
import UserContext from "../variables/context";

import { splitSessions, formatDay, totalLabel, todayKey } from "../lib/plan";
import { levelById } from "../lib/levels";
import useSessions from "../lib/store";
import { isBeginner, nextSession, sessionLabel, runMinutes, PROGRAMMES } from "../lib/beginner";
import { RaceCountdown, RaceWeekCard } from "../components/RaceCountdown";
import { countdownRace } from "../lib/objectives";
import { openWodify } from "../lib/wodify";
import { bookingState } from "../lib/booking";
import { formatShortDate } from "../lib/plan";

/*
  Home — the next session up front (big card, with the Wodify booking right on it),
  then what's coming and what's done. Everything is already sized for the
  runner's level and VMA; tapping a session opens the full detail.
*/

const formatVma = (vma) => `${String(vma).replace(".", ",")} km/h`;

const NextCard = ({ session, onPress, override }) => {
  const { theme, preferences } = useContext(UserContext);
  const { colors, typography } = theme;
  const kicker = override?.kicker ?? `${formatDay(session.date)} · ${totalLabel(session, preferences.level, preferences.vma)}`;
  const title = override?.title ?? session.title;
  const summary = override?.summary ?? session.summary;

  return (
    <View style={[styles.next, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable onPress={onPress} animation={false}>
        <View style={styles.nextBody}>
          <Text style={[typography.finePrint, styles.kicker]}>{kicker}</Text>
          <Text style={[styles.nextTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[typography.finePrint, styles.summary]} numberOfLines={3}>
            {summary}
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
            Vendredi 16h30, piste de Floride
          </Text>
        </View>
        {(() => {
            const booking = bookingState(session.date, todayKey(), !!preferences.booked?.[session.id]);
            if (booking.status === "booked")
              return (
                <Pressable onPress={onPress} hitSlop={6}>
                  <View style={[styles.goingButton, { borderColor: colors.accent }]}>
                    <Glyph name="check" size={14} color={colors.accentText} strokeWidth={2.6} />
                    <Text style={[typography.heading, typography.bold, { fontSize: 15, color: colors.accentText }]}>Réservé</Text>
                  </View>
                </Pressable>
              );
            if (booking.status === "soon")
              return (
                <Pressable onPress={onPress} hitSlop={6}>
                  <View style={[styles.goingButton, { borderColor: colors.border }]}>
                    <Text style={[typography.heading, { fontSize: 14, color: colors.text }]}>Dès le {formatShortDate(booking.opensOn).slice(0, 5)}</Text>
                  </View>
                </Pressable>
              );
            return (
              <Pressable onPress={() => openWodify()} hitSlop={6}>
                <View style={[styles.goingButton, { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                  <Text style={[typography.heading, typography.bold, { fontSize: 16, color: "white" }]}>Réserver ma place</Text>
                </View>
              </Pressable>
            );
          })()}
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
        ) : isBeginner(preferences.level) ? null : (
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
  const { theme, preferences, setPreference } = useContext(UserContext);
  const { colors, typography } = theme;
  const { sessions } = useSessions();
  const { next, upcoming, past } = splitSessions(todayKey(), sessions);
  const level = levelById(preferences.level);
  const open = (session) => navigation.navigate("Session", { id: session.id });

  // Débuter: the Friday session is the next one in their own programme
  const beginner = isBeginner(preferences.level);
  const mySession = beginner ? nextSession(preferences, preferences.level) : null;
  const openMine = () => navigation.navigate("BeginnerSession", { level: preferences.level, index: mySession.index });
  const race = countdownRace(preferences, todayKey(), { clubLevel: !beginner });

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Wordmark size={28} color={colors.text} accent={colors.accentText} />
        </View>
        {!!preferences.coach && (
          <Pressable onPress={() => setPreference("view", "coach")} small hitSlop={8}>
            <View style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border, marginRight: 8 }]}>
              <Text style={[typography.finePrint, typography.bold, styles.chipText]}>Vue coach</Text>
            </View>
          </Pressable>
        )}
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
          {beginner && (
            <Pressable onPress={() => navigation.navigate("Programme")} small>
              <View style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[typography.finePrint, typography.bold, styles.chipText]}>Mon programme</Text>
              </View>
            </Pressable>
          )}
          <Pressable onPress={() => navigation.navigate("Objectives")} small>
            <View style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Glyph name="trophy" size={13} color={colors.accentText} strokeWidth={2.2} />
              <Text style={[typography.finePrint, typography.bold, styles.chipText]}>Mes objectifs</Text>
            </View>
          </Pressable>
          {!beginner && (
            <Pressable onPress={() => navigation.navigate("Week")} small>
              <View style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[typography.finePrint, typography.bold, styles.chipText]}>Ma semaine</Text>
              </View>
            </Pressable>
          )}
          {!beginner && <Pressable onPress={() => navigation.navigate("Vma")} small>
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
          </Pressable>}
        </View>

        {/* The race countdown: their own race if set, else the club's (Levels 1–3) */}
        {!!race && (
          <View style={styles.section}>
            <RaceCountdown
              race={race}
              sessions={sessions}
              onOpen={() => navigation.navigate("Objectives")}
              onLogTime={(id) => navigation.navigate("Record", { id })}
            />
            <RaceWeekCard race={race} />
          </View>
        )}

        {beginner && mySession && (
          <View style={styles.section}>
            <SectionLabel>Ta prochaine séance · semaine {mySession.week}</SectionLabel>
            {next ? (
              <NextCard
                session={next}
                onPress={openMine}
                override={{
                  kicker: `${mySession.slot === 0 ? formatDay(next.date) : mySession.slotName} · ${runMinutes(mySession)}' de course`,
                  title: sessionLabel(mySession),
                  summary: mySession.test
                    ? `Le test de fin de ${PROGRAMMES[preferences.level].name}.`
                    : "Marche-course à une allure où tu peux parler. Le vendredi, au club avec les autres.",
                }}
              />
            ) : null}
          </View>
        )}

        {next && !beginner ? (
          <View style={styles.section}>
            <SectionLabel>Prochaine séance</SectionLabel>
            <NextCard session={next} onPress={() => open(next)} />
            {!preferences.vma && level.group === "club" && (
              <Text style={[typography.finePrint, styles.hint]}>
                Ajoute ta VMA et chaque fraction affichera le temps à viser.
              </Text>
            )}
          </View>
        ) : !next ? (
          <Text style={[typography.copy, styles.empty]}>
            Les prochaines séances arrivent bientôt.
          </Text>
        ) : null}

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
    flexDirection: "column",
    alignItems: "stretch",
    gap: 12,
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
  },
  goingCount: { flexDirection: "row", alignItems: "center", gap: 8 },
  goingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    gap: 6,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
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
