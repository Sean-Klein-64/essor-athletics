import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeepAwake } from "expo-keep-awake";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Button from "../components/Button";
import Pressable from "../components/Pressable";
import Glyph from "../components/Glyph";
import UserContext from "../variables/context";
import haptics from "../utils/haptics";

import { PROGRAMMES, programmeSessions, sessionPlan, sessionLabel, perWeekOf } from "../lib/beginner";
import { timeline, positionAt, totalOf, setLabel, nextLabel, formatCountdown } from "../lib/timer";
import { formatDuration } from "../lib/paces";

/*
  The guided walk-run: one big countdown for the current interval, what
  comes next, a buzz at every switch. Opened from BeginnerSession with
  { level, index }. The clock runs off timestamps, so a pause or a moment
  on the lock screen doesn't drift it — but the phone has to stay on the
  screen for the buzz (we keep it awake while this screen is open).
*/

const TICK_MS = 250;
const nowMs = () => Date.now(); // read the clock from event handlers only — never during render

const BeginnerTimerScreen = ({ navigation, route }) => {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { theme, preferences } = useContext(UserContext);
  const { colors, typography } = theme;

  const levelId = route.params?.level || preferences.level;
  const session = programmeSessions(levelId, perWeekOf(preferences)).find((s) => s.index === route.params?.index);
  const intervals = useMemo(() => (session ? timeline(sessionPlan(session)) : []), [session]);
  const total = totalOf(intervals);

  // running: startedAt is the wall-clock ms when the current run began; base is the seconds done before it
  const [running, setRunning] = useState(false);
  const [base, setBase] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [now, setNow] = useState(() => nowMs());
  const lastIndex = useRef(-1);

  // The clock: every tick, read the time, buzz if the interval changed, stop at the end
  useEffect(() => {
    if (!running || !startedAt) return undefined;
    const id = setInterval(() => {
      const t = nowMs();
      const done = base + (t - startedAt) / 1000;
      if (done >= total) {
        haptics.success();
        setBase(total);
        setStartedAt(null);
        setRunning(false);
        return;
      }
      const p = positionAt(intervals, done);
      if (p.index !== lastIndex.current) {
        if (lastIndex.current >= 0) (p.interval.kind === "run" ? haptics.success : haptics.medium)();
        lastIndex.current = p.index;
      }
      setNow(t);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, startedAt, base, total, intervals]);

  const elapsed = Math.min(total, base + (running && startedAt ? (now - startedAt) / 1000 : 0));
  const pos = positionAt(intervals, elapsed);

  if (!session) return null;

  const start = () => {
    lastIndex.current = pos.index;
    const t = nowMs();
    setStartedAt(t);
    setNow(t);
    setRunning(true);
    haptics.light();
  };
  const pause = () => {
    setBase(elapsed);
    setStartedAt(null);
    setRunning(false);
    haptics.light();
  };
  const skip = () => {
    // jump to the start of the next interval
    const startOfNext = intervals.slice(0, pos.index + 1).reduce((t, i) => t + i.seconds, 0);
    setBase(Math.min(total, startOfNext));
    const t = nowMs();
    setStartedAt(running ? t : null);
    setNow(t);
    haptics.light();
  };
  const reset = () => {
    setRunning(false);
    setBase(0);
    setStartedAt(null);
    lastIndex.current = -1;
  };

  const isRun = pos.interval?.kind === "run";
  const finished = pos.done || elapsed >= total;
  const phaseName = { warmup: "Échauffement", main: "Séance", cooldown: "Retour au calme" }[pos.interval?.phase] || "";
  const progress = total ? Math.min(1, elapsed / total) : 0;

  return (
    <SlideScreenContainer title={`${PROGRAMMES[levelId].name} · ${sessionLabel(session)}`} type="back" navigation={navigation} route={route} ignoreKeyboard>
      <View style={[styles.body, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.top}>
          <Text style={[typography.finePrint, { fontSize: 14 }]}>
            {phaseName}
            {setLabel(pos.interval) ? ` · ${setLabel(pos.interval)}` : ""}
          </Text>
        </View>

        <View
          style={[
            styles.hero,
            finished
              ? { backgroundColor: colors.accentSoft, borderColor: colors.accentText }
              : isRun
                ? { backgroundColor: colors.accent, borderColor: colors.accent }
                : { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.what, { color: finished ? colors.accentText : isRun ? "white" : colors.text }]}>
            {finished ? "Séance terminée" : pos.interval?.label}
          </Text>
          <Text style={[styles.clock, { color: finished ? colors.accentText : isRun ? "white" : colors.text }]}>
            {finished ? formatDuration(total) : formatCountdown(pos.remaining)}
          </Text>
          {!finished && (
            <Text style={[typography.finePrint, { fontSize: 15, opacity: 1, color: isRun ? "rgba(255,255,255,0.85)" : colors.text }]}>
              {nextLabel(intervals, pos.index)}
            </Text>
          )}
          {finished && <Text style={[typography.finePrint, { fontSize: 15, color: colors.accentText, opacity: 1 }]}>Bien joué. Marche encore un peu, puis étire-toi.</Text>}
        </View>

        <View style={[styles.bar, { backgroundColor: colors.border }]}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: colors.accent }]} />
        </View>
        <Text style={[typography.finePrint, { fontSize: 13, textAlign: "center" }]}>
          {formatCountdown(elapsed)} / {formatCountdown(total)} · {intervals.length} étapes
        </Text>

        <View style={{ flex: 1 }} />

        {finished ? (
          <>
            <Button onPress={() => navigation.goBack()}>Marquer la séance faite</Button>
            <Pressable onPress={reset} small>
              <Text style={[typography.finePrint, styles.link]}>Recommencer</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.controls}>
              <Pressable onPress={reset} small>
                <View style={[styles.round, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Glyph name="cross" size={18} color={colors.text} />
                </View>
              </Pressable>
              <Pressable onPress={running ? pause : start}>
                <View style={[styles.big, { backgroundColor: colors.accent }]}>
                  <Glyph name={running ? "pause" : "play"} size={30} color="white" />
                </View>
              </Pressable>
              <Pressable onPress={skip} small>
                <View style={[styles.round, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Glyph name="right" size={18} color={colors.text} strokeWidth={2.4} />
                </View>
              </Pressable>
            </View>
            <Text style={[typography.finePrint, styles.hint]}>
              {running ? "Une vibration à chaque changement. Garde l'écran allumé." : elapsed > 0 ? "En pause" : "Appuie pour lancer l'échauffement"}
            </Text>
          </>
        )}
      </View>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, width: "100%", paddingHorizontal: 20, paddingTop: 4, gap: 14 },
  top: { alignItems: "center" },
  hero: { borderWidth: 1, borderRadius: 28, paddingVertical: 34, paddingHorizontal: 20, alignItems: "center", gap: 8 },
  what: { fontFamily: "Archivo-BlackItalic", fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  clock: { fontFamily: "Archivo-BlackItalic", fontSize: 88, lineHeight: 96, letterSpacing: -2 },
  bar: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 22 },
  round: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  big: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" },
  hint: { textAlign: "center", fontSize: 13 },
  link: { textAlign: "center", fontSize: 14, paddingVertical: 10 },
});

export default BeginnerTimerScreen;
