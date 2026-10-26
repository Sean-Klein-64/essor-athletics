import React, { useContext } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";

import Pressable from "./Pressable";
import Glyph from "./Glyph";
import UserContext from "../variables/context";

import goal, { targetTime } from "../lib/goal";
import { racePhase, cycleDots, cycleLabel, weeksLabel, raceKey, distanceName, goalLine, vmaRaceSeconds, TAPER_NOTE, RACE_CHECKLIST, recordIdFor } from "../lib/objectives";
import { useRacePhoto } from "../lib/photo";
import { formatClock } from "../lib/paces";
import { formatShortDate } from "../lib/plan";

/*
  The race countdown — the hero card on Home.
  A photo of the race city behind (js/lib/photo.js), a dark gradient over it,
  "J-55" big, the race and date, the club Fridays as dots, the goal time.
  Last 7 days: race-week mode (taper note + checklist under the card).
  Race day: "Jour J". Up to two weeks after: log the time, pick the next goal.
*/

const Shade = () => (
  <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#000" stopOpacity="0.15" />
        <Stop offset="0.45" stopColor="#000" stopOpacity="0.35" />
        <Stop offset="1" stopColor="#000" stopOpacity="0.82" />
      </LinearGradient>
    </Defs>
    <Rect x="0" y="0" width="100" height="100" fill="url(#shade)" />
  </Svg>
);

const kickerFor = (race, phase) => {
  if (phase === "raceweek") return "SEMAINE DE COURSE";
  if (phase === "raceday") return "C'EST AUJOURD'HUI";
  if (phase === "after") return "COURSE TERMINÉE";
  return race.kind === "mine" ? "MA COURSE" : "OBJECTIF DU GROUPE";
};

const bigFor = (days, phase) => (phase === "raceday" ? "Jour J" : phase === "after" ? "Bravo" : `J-${days}`);

/* The goal line under the title: the runner's time, else what the VMA says */
const targetFor = (race, vma) => {
  if (race.seconds && race.metres) return `Objectif ${distanceName(race.metres)} · ${goalLine(race.metres, race.seconds)}`;
  if (race.kind === "club") {
    const d = goal.distances[0];
    const t = targetTime(d, vma);
    return t ? `${d.name} · ta VMA dit ${t}` : "Touche pour choisir ta distance et ton objectif";
  }
  const vmaSeconds = vmaRaceSeconds(race.metres, vma);
  return vmaSeconds ? `${distanceName(race.metres)} · ta VMA dit ${formatClock(vmaSeconds)}` : distanceName(race.metres);
};

export const RaceCountdown = ({ race, sessions, onOpen, onLogTime }) => {
  const { theme, preferences, setPreference } = useContext(UserContext);
  const { colors, typography } = theme;
  const key = raceKey(race);
  const coachPhoto = race?.kind === "club" ? goal.photo : null;
  const photo = useRacePhoto(race, key, coachPhoto, preferences, setPreference);
  if (!race) return null;

  const phase = racePhase(race.days);
  const dots = race.kind === "club" || race.days <= 84 ? cycleDots(sessions, race) : [];
  const progress = dots.length ? cycleLabel(dots) : weeksLabel(race.days);

  return (
    <Pressable onPress={onOpen} animation={false}>
      <View style={[styles.card, { backgroundColor: colors.accent }]}>
        {!!photo.source && <Image source={photo.source} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />}
        {!!photo.source && <Shade />}

        <View style={styles.top}>
          <Text style={[typography.finePrint, styles.kicker]}>{kickerFor(race, phase)}</Text>
          {!!progress && phase === "build" && (
            <View style={styles.pill}>
              <Text style={[typography.finePrint, styles.pillText]}>{progress}</Text>
            </View>
          )}
        </View>

        <View style={styles.middle}>
          <Text style={styles.big} numberOfLines={1} adjustsFontSizeToFit>
            {bigFor(race.days, phase)}
          </Text>
          <Text style={styles.title} numberOfLines={2}>
            {race.name}
          </Text>
          <Text style={[typography.finePrint, styles.sub]}>
            {[race.place, formatShortDate(race.date)].filter(Boolean).join(" · ")}
            {race.kind === "club" && !goal.confirmed ? " (date à confirmer)" : ""}
          </Text>
        </View>

        {phase === "after" ? (
          <View style={styles.afterRow}>
            {!!recordIdFor(race.metres) && (
              <Pressable onPress={() => onLogTime(recordIdFor(race.metres))} small>
                <View style={[styles.afterButton, { backgroundColor: "white" }]}>
                  <Text style={[typography.heading, typography.bold, { fontSize: 15, color: colors.accent }]}>Ajouter mon temps</Text>
                </View>
              </Pressable>
            )}
            <Pressable onPress={onOpen} small>
              <View style={[styles.afterButton, { borderColor: "rgba(255,255,255,0.6)", borderWidth: 1 }]}>
                <Text style={[typography.heading, typography.bold, { fontSize: 15, color: "white" }]}>Prochain objectif</Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <Text style={[typography.finePrint, styles.target]} numberOfLines={2}>
            {targetFor(race, preferences.vma)}
          </Text>
        )}

        {!!dots.length && phase !== "after" && (
          <View style={styles.dots} accessibilityLabel={progress}>
            {dots.map((d) => (
              <View key={d.id} style={[styles.dot, d.passed ? styles.dotOn : styles.dotOff]} />
            ))}
            <View style={[styles.dot, styles.flag]}>
              <Glyph name="flame" size={10} color="white" strokeWidth={2.4} />
            </View>
          </View>
        )}

        {!!photo.credit && (
          <View style={styles.creditRow}>
            <Text style={[typography.finePrint, styles.credit]} numberOfLines={1}>
              {photo.credit}
            </Text>
            {!!photo.next && (
              <Pressable onPress={photo.next} small hitSlop={8}>
                <Text style={[typography.finePrint, styles.credit, styles.other]}>{photo.busy ? "…" : "Autre photo"}</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
};

/* Race week: the taper note and a checklist ticked on this phone */
export const RaceWeekCard = ({ race }) => {
  const { theme, preferences, setPreference } = useContext(UserContext);
  const { colors, typography } = theme;
  if (!race || racePhase(race.days) !== "raceweek") return null;
  const key = raceKey(race);
  const ticks = preferences.raceChecklist?.[key] || {};
  const toggle = (id) => {
    const next = { ...ticks };
    if (next[id]) delete next[id];
    else next[id] = true;
    setPreference("raceChecklist", { [key]: next }); // only this race's ticks are kept
  };
  const done = RACE_CHECKLIST.filter((c) => ticks[c.id]).length;

  return (
    <View style={[styles.week, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={typography.heading}>Cette semaine</Text>
      <Text style={[typography.finePrint, { fontSize: 14, lineHeight: 19 }]}>{TAPER_NOTE}</Text>
      <Text style={[typography.finePrint, typography.bold, { fontSize: 13, marginTop: 4 }]}>
        Avant le départ · {done}/{RACE_CHECKLIST.length}
      </Text>
      {RACE_CHECKLIST.map((c) => {
        const on = !!ticks[c.id];
        return (
          <Pressable key={c.id} onPress={() => toggle(c.id)} small animation={false}>
            <View style={styles.checkRow}>
              <View style={[styles.box, on ? { backgroundColor: colors.accent, borderColor: colors.accent } : { borderColor: colors.border }]}>
                {on && <Glyph name="check" size={12} color="white" strokeWidth={2.8} />}
              </View>
              <Text style={[typography.finePrint, { flex: 1, fontSize: 14, opacity: on ? 0.5 : 1 }]}>{c.text}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 24, overflow: "hidden", minHeight: 300, padding: 18, justifyContent: "space-between", gap: 10 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  kicker: { color: "white", opacity: 0.85, fontSize: 11, letterSpacing: 0.9 },
  pill: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { color: "white", opacity: 1, fontSize: 12 },
  middle: { gap: 2, marginTop: 30 },
  big: { fontFamily: "Archivo-BlackItalic", fontSize: 76, lineHeight: 82, letterSpacing: -2, color: "white" },
  title: { fontFamily: "Archivo-BlackItalic", fontSize: 24, lineHeight: 28, letterSpacing: -0.5, color: "white" },
  sub: { color: "white", opacity: 0.85, fontSize: 14 },
  target: { color: "white", opacity: 0.95, fontSize: 14 },
  dots: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  dot: { flex: 1, height: 6, borderRadius: 3, maxWidth: 40 },
  dotOn: { backgroundColor: "white" },
  dotOff: { backgroundColor: "rgba(255,255,255,0.3)" },
  flag: { flex: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  afterRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  afterButton: { height: 40, borderRadius: 20, paddingHorizontal: 16, justifyContent: "center" },
  creditRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  credit: { flexShrink: 1, color: "white", opacity: 0.6, fontSize: 10, lineHeight: 13 },
  other: { opacity: 0.9, textDecorationLine: "underline" },
  week: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 8 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  box: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
});

export default RaceCountdown;
