import React, { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SlideScreenContainer from "../components/SlideScreenContainer";
import SectionLabel from "../components/SectionLabel";
import Glyph from "../components/Glyph";
import UserContext from "../variables/context";

import useSessions from "../lib/store";
import { levelById } from "../lib/levels";
import { vmaDateLabel, goalLabel, myRaceLabel, objectivesLabel, bestRows, trainingPaces, injuryLabel, sessionTargets, isClubLevel, athleteSessions, athleteBeginner, effectiveLevel, wodifyAttendance, ATTENDANCE_LABEL, loadCoachData } from "../lib/coach";
import { PREDICTIONS, predict } from "../lib/paces";
import { beginnerHistory, feelById } from "../lib/history";
import { formatDay, todayKey } from "../lib/plan";

/*
  One runner, for the coach: level and VMA up top, then what today's session
  asks of them, their bests, sessions done, goal race, injury notes from the
  questionnaire, and their training paces. "—" wherever we don't know yet.
  Opened from CoachSession with { athlete, sessionId }.
*/

const Card = ({ children, colors, style }) => (
  <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>
);

const Row = ({ title, value, sub, last, colors, typography, mono }) => (
  <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
    <View style={{ flex: 1 }}>
      <Text style={typography.heading}>{title}</Text>
      {!!sub && <Text style={[typography.finePrint, { fontSize: 13 }]}>{sub}</Text>}
    </View>
    <Text style={[typography.heading, mono && typography.mono, styles.value, { textAlign: "right" }]} numberOfLines={3}>
      {value}
    </Text>
  </View>
);

const CoachAthleteScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const {
    theme: { colors, typography },
  } = useContext(UserContext);
  const athlete = route.params?.athlete;
  const { sessions, byId } = useSessions();
  const session = byId(route.params?.sessionId);
  const [wodify, setWodify] = useState(route.params?.wodify || null);
  useEffect(() => {
    if (!wodify) loadCoachData().then((d) => setWodify(d.wodify)).catch(() => {});
  }, [wodify]);
  if (!athlete) return null;

  const att = wodify ? wodifyAttendance(athlete, sessions, wodify) : [];
  const counted = att.filter((x) => x.status === "present" || x.status === "absent");
  const here = counted.filter((x) => x.status === "present").length;
  const lastHere = [...att].reverse().find((x) => x.status === "present");

  const level = effectiveLevel(athlete);
  const club = isClubLevel(level);
  const history = athleteSessions(athlete, sessions, todayKey());
  const doneCount = history.filter((h) => h.status === "done").length;
  const beginner = athleteBeginner(athlete);
  const walkRuns = beginnerHistory(athlete.beginnerDone);
  const targets = session ? sessionTargets(session, level, athlete.vma) : [];
  const paces = trainingPaces(athlete.vma);
  const injured = athlete.injury === "yes";
  const rowProps = { colors, typography };

  return (
    <SlideScreenContainer title={athlete.name} type="back" navigation={navigation} route={route} ignoreKeyboard>
      <ScrollView style={{ width: "100%" }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
        {/* Level + VMA, big */}
        <Card colors={colors} style={styles.hero}>
          <View style={[styles.levelTag, { backgroundColor: colors.accentSoft }]}>
            <Text style={[typography.finePrint, typography.bold, { color: colors.accentText, opacity: 1, fontSize: 14 }]}>
              {levelById(level).name}
              {beginner ? ` · semaine ${beginner.week}` : athlete.startWeek ? ` · semaine ${athlete.startWeek}` : ""}
              {athlete.phoneLevel && athlete.phoneLevel !== athlete.level ? " · monté·e dans l’app" : ""}
            </Text>
          </View>
          <Text style={[styles.vmaNumber, { color: colors.text }]}>
            {athlete.vma ? String(athlete.vma).replace(".", ",") : "—"}
            <Text style={[typography.heading, { opacity: 0.5 }]}> km/h</Text>
          </Text>
          <Text style={[typography.finePrint, { fontSize: 14 }]}>
            VMA · {vmaDateLabel(athlete)}
            {athlete.vmaTestMetres ? ` · ${athlete.vmaTestMetres} m en 6'` : ""}
          </Text>
        </Card>

        {/* Attendance at a glance */}
        <View style={styles.stats}>
          <Stat k="Séances" v={counted.length ? `${here}/${counted.length}` : "—"} colors={colors} typography={typography} />
          <Stat k="Dernière" v={lastHere ? lastHere.session.date.slice(8) + "/" + lastHere.session.date.slice(5, 7) : "—"} colors={colors} typography={typography} />
          <Stat k="Test 6'" v={athlete.vmaTestMetres ? `${athlete.vmaTestMetres} m` : "—"} colors={colors} typography={typography} />
        </View>

        {/* Injury — first thing a coach should see */}
        <View style={[styles.flag, injured ? { backgroundColor: colors.accentSoft, borderColor: colors.accentText } : { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Glyph name={injured ? "heart" : "check"} size={16} color={injured ? colors.accentText : colors.text} strokeWidth={2.2} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.finePrint, { fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" }]}>Douleurs / blessures</Text>
            <Text style={[typography.heading, injured && { color: colors.accentText }]}>{injuryLabel(athlete)}</Text>
          </View>
        </View>

        {/* Today's session for them */}
        {!!session && club && (
          <View style={styles.section}>
            <SectionLabel>{session.title} · ses cibles</SectionLabel>
            <Card colors={colors}>
              {targets.length ? (
                targets.map((t, i) => (
                  <Row key={`${t.label}-${t.pct}`} title={`${t.reps > 1 ? `${t.reps} × ` : ""}${t.label}`} sub={`${t.pct} % VMA`} value={`${t.target}\n${t.pace}`} mono last={i === targets.length - 1} {...rowProps} />
                ))
              ) : (
                <Text style={[typography.finePrint, styles.empty]}>{athlete.vma ? "Pas de répétitions chronométrées à ce niveau" : "Allures dès que la VMA est mesurée"}</Text>
              )}
            </Card>
          </View>
        )}

        {/* Where they are in Débuter — what Mel needs on the track */}
        {!!beginner && (
          <View style={styles.section}>
            <SectionLabel>Programme Débuter</SectionLabel>
            <Card colors={colors}>
              <Row title="Où en est-il·elle" sub={`${beginner.doneCount}/${beginner.total} séances faites`} value={`Semaine ${beginner.week}`} {...rowProps} />
              <Row
                title="Prochaine séance"
                sub={beginner.next ? `${beginner.next.slotName}${beginner.next.test ? " · test de fin de niveau" : ""}` : "Programme terminé"}
                value={beginner.next ? beginner.next.label : "—"}
                mono
                last={!walkRuns.length}
                {...rowProps}
              />
              {walkRuns.slice(0, 6).map((w, i, all) => (
                <Row key={`${w.levelId}:${w.index}`} title={w.label} sub={`${w.programme} · S${w.week} · ${w.slotName}${w.test ? " · test réussi" : ""}`} value={w.at ? formatDay(w.at) : "—"} last={i === all.length - 1} {...rowProps} />
              ))}
            </Card>
          </View>
        )}

        {/* Present / absent at each session of the cycle, from Wodify */}
        <View style={styles.section}>
          <SectionLabel>Présences · cycle 1</SectionLabel>
          <Card colors={colors}>
            {att.length ? (
              att.map((x, i) => {
                const color = x.status === "present" ? colors.accentText : x.status === "absent" ? "#E07A5F" : x.status === "booked" ? "#E9C46A" : colors.text;
                return (
                  <View key={x.session.id} style={[styles.row, i < att.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }, x.status === "future" && { opacity: 0.55 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={typography.heading}>{x.session.title}</Text>
                      <Text style={[typography.finePrint, { fontSize: 13 }]}>{formatDay(x.session.date)}</Text>
                    </View>
                    <Text style={[typography.heading, typography.bold, { color, fontSize: 15 }]}>{ATTENDANCE_LABEL[x.status]}</Text>
                  </View>
                );
              })
            ) : (
              <Text style={[typography.finePrint, styles.empty]}>Les présences arrivent avec la synchro Wodify</Text>
            )}
          </Card>
        </View>

        {/* The Fridays — done, how it felt, their note */}
        {!!athlete.reportedAt && (
        <View style={styles.section}>
          <SectionLabel>Ressenti dans l{"'"}app · {`${doneCount}/${history.length || 0}`}</SectionLabel>
          <Card colors={colors}>
            {!athlete.reportedAt ? (
              <Text style={[typography.finePrint, styles.empty]}>Rien reçu de son téléphone pour l’instant</Text>
            ) : !history.length ? (
              <Text style={[typography.finePrint, styles.empty]}>Première séance à venir</Text>
            ) : (
              history.map((h, i) => (
                <Row
                  key={h.session.id}
                  title={h.session.title}
                  sub={`${formatDay(h.session.date)}${h.entry?.note ? ` · « ${h.entry.note} »` : ""}`}
                  value={h.status === "done" ? (h.entry.feel ? feelById(h.entry.feel)?.name : "Faite ✓") : "Pas marquée"}
                  last={i === history.length - 1}
                  {...rowProps}
                />
              ))
            )}
          </Card>
        </View>
        )}

        <View style={styles.section}>
          <SectionLabel>Parcours</SectionLabel>
          <Card colors={colors}>
            <Row title="Objectif" value={goalLabel(athlete)} {...rowProps} />
            <Row title="Sa course" value={myRaceLabel(athlete)} {...rowProps} />
            <Row title="Autres objectifs" value={objectivesLabel(athlete)} {...rowProps} />
            <Row title="Courses déjà faites" value={athlete.races || "—"} last {...rowProps} />
          </Card>
        </View>

        <View style={styles.section}>
          <SectionLabel>Records</SectionLabel>
          <Card colors={colors}>
            {bestRows(athlete).map((r, i, all) => (
              <Row key={r.id} title={r.name} value={r.time} mono last={i === all.length - 1} {...rowProps} />
            ))}
          </Card>
        </View>

        <View style={styles.section}>
          <SectionLabel>Allures d{"'"}entraînement</SectionLabel>
          <Card colors={colors}>
            {paces.length ? (
              paces.map((z, i) => <Row key={z.id} title={z.name} value={z.pace} mono last={i === paces.length - 1} {...rowProps} />)
            ) : (
              <Text style={[typography.finePrint, styles.empty]}>—  pas encore de VMA</Text>
            )}
          </Card>
        </View>

        {!!athlete.vma && (
          <View style={styles.section}>
            <SectionLabel>Prédictions</SectionLabel>
            <Card colors={colors}>
              {PREDICTIONS.map((pr, i) => {
                const r = predict(athlete.vma, pr);
                return <Row key={pr.id} title={pr.name} sub={r.pace} value={r.time} mono last={i === PREDICTIONS.length - 1} {...rowProps} />;
              })}
            </Card>
          </View>
        )}

        {!!athlete.reportedAt && (
          <Text style={[typography.finePrint, styles.hint]}>Progression envoyée par son téléphone le {athlete.reportedAt.split("-").reverse().join("/")}.</Text>
        )}
      </ScrollView>
    </SlideScreenContainer>
  );
};

const Stat = ({ k, v, colors, typography }) => (
  <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <Text style={[typography.finePrint, { fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase" }]}>{k}</Text>
    <Text style={[styles.statV, { color: colors.text }]}>{v}</Text>
  </View>
);

const styles = StyleSheet.create({
  stats: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  statV: { fontFamily: "Archivo-BlackItalic", fontSize: 24, lineHeight: 28 },
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 20 },
  card: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16 },
  hero: { paddingVertical: 18, gap: 6, alignItems: "flex-start" },
  levelTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  vmaNumber: { fontFamily: "Archivo-BlackItalic", fontSize: 48, lineHeight: 56, letterSpacing: -1, marginTop: 4 },
  flag: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14 },
  section: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 10 },
  value: { fontSize: 16, opacity: 0.85, maxWidth: "55%" },
  empty: { fontSize: 14, textAlign: "center", paddingVertical: 14 },
  hint: { textAlign: "center", fontSize: 13 },
});

export default CoachAthleteScreen;
