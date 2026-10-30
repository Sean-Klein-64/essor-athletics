import React, { useCallback, useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, LayoutAnimation } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Pressable from "../components/Pressable";
import Glyph from "../components/Glyph";
import SectionLabel from "../components/SectionLabel";
import UserContext from "../variables/context";

import useSessions from "../lib/store";
import { formatDay, totalLabel, todayKey } from "../lib/plan";
import { BOOKING } from "../lib/config";
import { levelById } from "../lib/levels";
import { getSessionAttendees, groupByLevel, sessionTargets, sessionStructure, formatVma, isClubLevel, athleteBeginner, beginnerLine, attendanceLine, effectiveLevel, isBeginnerLevel } from "../lib/coach";
import { doneEntry, FEELS } from "../lib/history";

/*
  Coach Session Hub — one Friday, seen from the track.
  The session up top (date, time, place, what's planned — tap to open the
  structure), then everyone expected, grouped by level, each with their VMA
  and the times that session asks of them. Tap a runner → CoachAthlete.
  Who's in the list comes from getSessionAttendees() (js/lib/coach.js).
*/

const Pill = ({ icon, children, colors, typography }) => (
  <View style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.border }]}>
    {!!icon && <Glyph name={icon} size={13} color={colors.text} />}
    <Text style={[typography.finePrint, { fontSize: 13, opacity: 0.9 }]}>{children}</Text>
  </View>
);

const AthleteCard = ({ athlete, session, sessions, today, onPress, colors, typography }) => {
  const level = effectiveLevel(athlete);
  const targets = sessionTargets(session, level, athlete.vma);
  const club = isClubLevel(level);
  const beginner = isBeginnerLevel(level) ? athleteBeginner(athlete) : null;
  const flag = athlete.injury === "yes";
  const past = session.date < today;
  const entry = doneEntry(athlete.done, session.id);
  return (
    <Pressable onPress={onPress}>
      <View style={[styles.athlete, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.athleteTop}>
          <View style={[styles.initial, { backgroundColor: colors.accentSoft }]}>
            <Text style={[typography.heading, typography.bold, { color: colors.accentText }]}>
              {(athlete.name.trim()[0] || "?").toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={[typography.heading, typography.bold]} numberOfLines={1}>
              {athlete.name}
            </Text>
            <Text style={[typography.finePrint, { fontSize: 13 }]} numberOfLines={1}>
              {levelById(level).name}
              {club ? ` · VMA ${formatVma(athlete.vma)}` : ""}
              {flag ? " · ⚠︎ douleur" : ""}
            </Text>
            <Text style={[typography.finePrint, { fontSize: 13 }]} numberOfLines={2}>
              {beginner ? beginnerLine(beginner) : attendanceLine(athlete, sessions, today)}
            </Text>
          </View>
          {past ? (
            <View style={[styles.doneDot, entry ? { backgroundColor: colors.accent } : { borderWidth: 1.5, borderColor: colors.border }]}>
              {!!entry && <Glyph name="check" size={14} color="white" strokeWidth={2.6} />}
            </View>
          ) : (
            <Glyph name="right" size={16} color={colors.text} />
          )}
        </View>
        {past && entry?.note ? (
          <Text style={[typography.finePrint, { fontSize: 13, fontStyle: "italic" }]} numberOfLines={2}>
            « {entry.note} »
          </Text>
        ) : null}

        {club && (
          <View style={styles.targets}>
            {targets.length ? (
              targets.map((t) => (
                <View key={`${t.label}-${t.pct}`} style={[styles.target, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[typography.finePrint, styles.targetLabel]} numberOfLines={1}>
                    {t.reps > 1 ? `${t.reps} × ` : ""}
                    {t.label}
                    <Text style={{ opacity: 0.6 }}> · {t.pct} %</Text>
                  </Text>
                  <Text style={[typography.heading, typography.mono, typography.bold, { fontSize: 20 }]}>{t.target}</Text>
                  <Text style={[typography.finePrint, { fontSize: 13 }]}>{t.pace}</Text>
                </View>
              ))
            ) : (
              <Text style={[typography.finePrint, { fontSize: 13, color: colors.accentText, opacity: 1 }]}>
                {athlete.vma ? "Pas de répétitions chronométrées à ce niveau" : "VMA à mesurer — allures dès le test"}
              </Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
};

const CoachSessionScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useContext(UserContext);
  const { colors, typography } = theme;
  const { sessions, byId } = useSessions();
  const session = byId(route.params?.id);
  const today = todayKey();

  const [athletes, setAthletes] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState(null); // a level id, or null for everyone

  const sessionId = session?.id;
  const load = useCallback(
    () =>
      getSessionAttendees(session)
        .then(({ athletes: list }) => {
          setAthletes(list);
          setError(null);
        })
        .catch((e) => {
          setError(e.message === "setup" ? "setup" : "offline");
          setAthletes((a) => a || []);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the session object is rebuilt on every render; its id is what matters
    [sessionId],
  );

  useEffect(() => {
    if (sessionId) load();
  }, [sessionId, load]);

  const refresh = () => {
    setRefreshing(true);
    load().then(() => setRefreshing(false));
  };

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  if (!session) return null;

  const groups = groupByLevel(athletes || []);
  const recap = (() => {
    const list = athletes || [];
    const entries = list.map((a) => doneEntry(a.done, session?.id)).filter(Boolean);
    const feels = FEELS.map((f) => ({ f, n: entries.filter((e) => e.feel === f.id).length }))
      .filter((x) => x.n)
      .map((x) => `${x.n} ${x.f.name.toLowerCase()}`);
    return { done: entries.length, total: list.length, feels };
  })();
  const shown = filter ? groups.filter((g) => g.id === filter) : groups;
  const total = (athletes || []).length;

  return (
    <SlideScreenContainer title="Séance coach" type="back" navigation={navigation} route={route} ignoreKeyboard>
      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accentText} />}
      >
        {/* The session */}
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[typography.finePrint, { fontSize: 14 }]}>{formatDay(session.date)}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{session.title}</Text>
          <Text style={[typography.finePrint, styles.summary]}>{session.summary}</Text>
          <View style={styles.pills}>
            <Pill icon="bolt" colors={colors} typography={typography}>{BOOKING.time}</Pill>
            <Pill colors={colors} typography={typography}>{BOOKING.place}</Pill>
            <Pill colors={colors} typography={typography}>{totalLabel(session, "level2")}</Pill>
          </View>
          {session.date < today && athletes && !!athletes.length && (
            <View style={[styles.recap, { borderTopColor: colors.border }]}>
              <Text style={[typography.heading, typography.bold]}>
                {recap.done}/{recap.total} l’ont marquée faite
              </Text>
              <Text style={[typography.finePrint, { fontSize: 13 }]}>
                {recap.feels.length ? recap.feels.join(" · ") : "Personne n’a encore dit comment c’était"}
              </Text>
            </View>
          )}

          <Pressable onPress={toggle} animation={false}>
            <View style={[styles.structureHead, { borderTopColor: colors.border }]}>
              <Text style={[typography.heading, { color: colors.accentText }]}>{open ? "Masquer la structure" : "Voir la structure"}</Text>
              <View style={{ transform: [{ rotate: open ? "-90deg" : "90deg" }] }}>
                <Glyph name="right" size={16} color={colors.accentText} strokeWidth={2.2} />
              </View>
            </View>
          </Pressable>
          {open && (
            <View style={styles.structure}>
              {sessionStructure(session).map((r) => (
                <View key={r.key} style={styles.structureRow}>
                  <Text style={[typography.finePrint, typography.bold, styles.structureLabel, { opacity: 1 }]}>{r.label}</Text>
                  <Text style={[typography.finePrint, { flex: 1, fontSize: 14, lineHeight: 19 }]}>{r.text}</Text>
                </View>
              ))}
              <Pressable onPress={() => navigation.navigate("SessionEditor", { id: session.id })} small>
                <Text style={[typography.finePrint, styles.editLink, { color: colors.accentText }]}>Modifier la séance</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Who's coming */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <SectionLabel>Athlètes</SectionLabel>
            {athletes !== null && (
              <View style={styles.count}>
                <Glyph name="people" size={14} color={colors.text} />
                <Text style={[typography.finePrint, { fontSize: 13 }]}>{filter ? `${shown[0]?.athletes.length || 0} / ${total}` : total}</Text>
              </View>
            )}
          </View>

          {groups.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ marginHorizontal: -20 }}>
              {[{ id: null, name: "Tous", n: total }, ...groups.map((g) => ({ id: g.id, name: g.name, n: g.athletes.length }))].map((c) => {
                const selected = c.id === filter;
                return (
                  <Pressable key={String(c.id)} onPress={() => setFilter(c.id)} small>
                    <View
                      style={[
                        styles.chip,
                        selected ? { backgroundColor: colors.accent, borderColor: colors.accent } : { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[typography.finePrint, typography.bold, { opacity: 1, fontSize: 14, color: selected ? "white" : colors.text }]}>
                        {c.name}
                      </Text>
                      <Text style={[typography.finePrint, { opacity: 1, fontSize: 13, color: selected ? "rgba(255,255,255,0.75)" : colors.text }]}>{c.n}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {athletes === null && <Text style={[typography.finePrint, styles.empty]}>Chargement…</Text>}

          {error === "setup" && (
            <View style={[styles.notice, { backgroundColor: colors.accentSoft }]}>
              <Text style={[typography.finePrint, { color: colors.accentText, opacity: 1, fontSize: 14, lineHeight: 19 }]}>
                La base n{"'"}est pas encore prête pour le hub coach : lance supabase/coach.sql dans Supabase (SQL Editor), puis tire pour rafraîchir.
              </Text>
            </View>
          )}
          {error === "offline" && <Text style={[typography.finePrint, styles.empty]}>Hors ligne — tire pour réessayer.</Text>}

          {athletes !== null && !error && !total && (
            <Text style={[typography.finePrint, styles.empty]}>Personne n{"'"}a encore accès à l{"'"}app. Coche app_access dans Supabase → signups.</Text>
          )}

          {shown.map((g) => (
            <View key={g.id} style={styles.group}>
              <View style={styles.groupHead}>
                <Text style={[typography.heading, typography.bold]}>{g.name}</Text>
                <Text style={[typography.finePrint, { fontSize: 14 }]}>
                  {g.athletes.length} {g.athletes.length > 1 ? "coureurs" : "coureur"}
                </Text>
              </View>
              {g.athletes.map((a) => (
                <AthleteCard
                  key={a.id}
                  athlete={a}
                  session={session}
                  sessions={sessions}
                  today={today}
                  onPress={() => navigation.navigate("CoachAthlete", { athlete: a, sessionId: session.id })}
                  colors={colors}
                  typography={typography}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  recap: { borderTopWidth: 1, paddingTop: 12, marginTop: 4, gap: 2 },
  doneDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 22 },
  hero: { borderWidth: 1, borderRadius: 24, padding: 18, gap: 6, overflow: "hidden" },
  title: { fontFamily: "Archivo-BlackItalic", fontSize: 38, lineHeight: 44, letterSpacing: -0.8 },
  summary: { fontSize: 15, lineHeight: 20 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, height: 28, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1 },
  structureHead: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  structure: { gap: 10, marginTop: 10 },
  structureRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  structureLabel: { width: 96, fontSize: 13, lineHeight: 19 },
  editLink: { opacity: 1, fontSize: 14, paddingVertical: 4 },
  section: { gap: 12 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 4 },
  count: { flexDirection: "row", alignItems: "center", gap: 4 },
  chips: { flexDirection: "row", gap: 8, paddingHorizontal: 20 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1 },
  group: { gap: 8, marginTop: 4 },
  groupHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 4 },
  athlete: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 12 },
  athleteTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  initial: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  targets: { gap: 6 },
  target: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, height: 44 },
  targetLabel: { flex: 1, fontSize: 14, opacity: 0.9 },
  notice: { borderRadius: 16, padding: 14 },
  empty: { textAlign: "center", fontSize: 14, paddingVertical: 12 },
});

export default CoachSessionScreen;
