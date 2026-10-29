import React, { useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SlideScreenContainer from "../components/SlideScreenContainer";
import SectionLabel from "../components/SectionLabel";
import Glyph from "../components/Glyph";
import UserContext from "../variables/context";

import useSessions from "../lib/store";
import { levelById } from "../lib/levels";
import { vmaDateLabel, goalLabel, myRaceLabel, objectivesLabel, bestRows, trainingPaces, injuryLabel, sessionTargets, isClubLevel } from "../lib/coach";
import { logRows, feelById } from "../lib/log";
import { fetchAllNotes, saveCoachNote } from "../lib/notes";
import Pressable from "../components/Pressable";
import haptics from "../utils/haptics";
import { formatPace } from "../lib/paces";
import { formatShortDate } from "../lib/plan";

/*
  One runner, for the coach: level and VMA up top, then what today's session
  asks of them, every session they've logged (pace against its target, feel,
  their note — and a line from you back to them, saved to Supabase and shown
  on their session page), their bests, goal race, injury notes from the questionnaire,
  and their training paces. "—" wherever we don't know yet.
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
    <Text style={[typography.heading, mono && typography.mono, styles.value, { textAlign: "right" }]} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

const CoachAthleteScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const {
    theme: { colors, typography },
    preferences,
  } = useContext(UserContext);
  const athlete = route.params?.athlete;
  const store = useSessions();
  const session = store.byId(route.params?.sessionId);

  // the coach's notes on this runner: { sessionId: { note, coach, at } }, then edits in progress
  const [notes, setNotes] = useState({});
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(null);
  const [setup, setSetup] = useState(false);
  const athleteId = athlete?.id;
  useEffect(() => {
    if (!athleteId) return undefined;
    let alive = true;
    fetchAllNotes()
      .then((all) => alive && setNotes(all[athleteId] || {}))
      .catch((e) => alive && e.message === "setup" && setSetup(true));
    return () => {
      alive = false;
    };
  }, [athleteId]);

  if (!athlete) return null;
  const logs = logRows(athlete, store.sessions);
  const firstName = (athlete.name || "").trim().split(" ")[0];

  const save = async (sessionId) => {
    const text = (drafts[sessionId] ?? notes[sessionId]?.note ?? "").trim();
    setSaving(sessionId);
    try {
      await saveCoachNote(athlete.id, sessionId, text, preferences.name);
      setNotes((n) => {
        const next = { ...n };
        if (text) next[sessionId] = { note: text, coach: preferences.name, at: new Date().toISOString() };
        else delete next[sessionId];
        return next;
      });
      setDrafts((d) => {
        const next = { ...d };
        delete next[sessionId];
        return next;
      });
      haptics.success();
    } catch {
      haptics.error();
    }
    setSaving(null);
  };

  const club = isClubLevel(athlete.level);
  const targets = session ? sessionTargets(session, athlete.level, athlete.vma) : [];
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
              {levelById(athlete.level).name}
              {athlete.startWeek ? ` · semaine ${athlete.startWeek}` : ""}
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

        {!!logs.length && (
          <View style={styles.section}>
            <SectionLabel>Séances faites</SectionLabel>
            <Card colors={colors}>
              {logs.map((l, i) => (
                <View key={l.sessionId} style={[styles.logRow, i < logs.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  <View style={styles.logTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={typography.heading} numberOfLines={1}>{l.title}</Text>
                      <Text style={[typography.finePrint, { fontSize: 13 }]}>
                        {l.date ? formatShortDate(l.date) : ""}
                        {l.feel ? ` · ${feelById(l.feel)?.name} (${l.feel}/5)` : ""}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[typography.heading, typography.mono, { fontSize: 16 }]}>{l.pace ? formatPace(l.pace) : "—"}</Text>
                      {!!l.gap && (
                        <Text style={[typography.finePrint, { fontSize: 13, color: l.gap.seconds > 3 ? colors.accentText : colors.text, opacity: 1 }]}>
                          {l.gap.label}
                          {l.target ? ` · cible ${formatPace(l.target)}` : ""}
                        </Text>
                      )}
                      {!l.gap && !!l.target && <Text style={[typography.finePrint, { fontSize: 13 }]}>cible {formatPace(l.target)}</Text>}
                    </View>
                  </View>
                  {!!l.note && <Text style={[typography.finePrint, { fontSize: 14, lineHeight: 19, opacity: 0.8 }]}>« {l.note} »</Text>}
                  {!setup && (
                    <View style={styles.noteRow}>
                      <TextInput
                        style={[styles.noteInput, typography.finePrint, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border, opacity: 1 }]}
                        value={drafts[l.sessionId] ?? notes[l.sessionId]?.note ?? ""}
                        onChangeText={(t) => setDrafts((d) => ({ ...d, [l.sessionId]: t }))}
                        placeholder={`Un mot pour ${firstName || "lui"}…`}
                        placeholderTextColor="grey"
                        maxLength={280}
                        multiline
                      />
                      {drafts[l.sessionId] !== undefined && drafts[l.sessionId] !== (notes[l.sessionId]?.note ?? "") && (
                        <Pressable onPress={() => save(l.sessionId)} disabled={saving === l.sessionId} small>
                          <View style={[styles.send, { backgroundColor: colors.accent, opacity: saving === l.sessionId ? 0.6 : 1 }]}>
                            <Glyph name="check" size={16} color="white" strokeWidth={2.6} />
                          </View>
                        </Pressable>
                      )}
                    </View>
                  )}
                  {!!notes[l.sessionId] && drafts[l.sessionId] === undefined && (
                    <Text style={[typography.finePrint, { fontSize: 12 }]}>Envoyé · {notes[l.sessionId].coach || "coach"} — visible sur sa séance</Text>
                  )}
                </View>
              ))}
            </Card>
          </View>
        )}

        <View style={styles.section}>
          <SectionLabel>Parcours</SectionLabel>
          <Card colors={colors}>
            <Row title="Séances faites" sub="Marquées dans l'app" value={athlete.sessionsDone == null ? "—" : String(athlete.sessionsDone)} {...rowProps} />
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

        {!!athlete.reportedAt && (
          <Text style={[typography.finePrint, styles.hint]}>Progression envoyée par son téléphone le {athlete.reportedAt.split("-").reverse().join("/")}.</Text>
        )}
      </ScrollView>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 20 },
  card: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16 },
  hero: { paddingVertical: 18, gap: 6, alignItems: "flex-start" },
  levelTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  vmaNumber: { fontFamily: "Archivo-BlackItalic", fontSize: 48, lineHeight: 56, letterSpacing: -1, marginTop: 4 },
  flag: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14 },
  section: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 10 },
  logRow: { paddingVertical: 12, gap: 6 },
  noteRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 4 },
  noteInput: { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, lineHeight: 19, minHeight: 40 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  logTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  value: { fontSize: 16, opacity: 0.85, maxWidth: "55%" },
  empty: { fontSize: 14, textAlign: "center", paddingVertical: 14 },
  hint: { textAlign: "center", fontSize: 13 },
});

export default CoachAthleteScreen;
