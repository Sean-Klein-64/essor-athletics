import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, StatusBar, AppState } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withSequence, withSpring } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useKeepAwake } from "expo-keep-awake";

import Pressable from "../components/Pressable";
import Glyph from "../components/Glyph";
import UserContext from "../variables/context";
import haptics from "../utils/haptics";

import { PROGRAMMES, programmeSessions, sessionLabel, currentIndex, perWeekOf, runMinutes } from "../lib/beginner";
import {
  sessionPhases,
  phasesSeconds,
  positionAt,
  elapsedOf,
  startClock,
  pauseClock,
  resumeClock,
  skipPhase,
  formatCountdown,
} from "../lib/timer";
import { say, hush, phaseAnnouncement, DONE_ANNOUNCEMENT, midwayLine, askNotifications, scheduleAlerts, clearAlerts } from "../lib/cues";

/*
  The Débuter chrono. The whole screen is the phase: forest green when
  you run, calm when you walk. A ring counts the phase down, a voice
  says what's next, and the phone buzzes 3-2-1 before each change.

  Three states: ready (what's coming) → running → done.
  Timing is wall-clock, so a locked phone doesn't lose the thread.
*/

const RUN_BG = "#1E4D3A";
const RUN_SOFT = "rgba(255,255,255,0.18)";
const RUN_TEXT = "#FFFFFF";
const RUN_DIM = "rgba(255,255,255,0.7)";

const Ring = ({ size, stroke, progress, color, track }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={c * (1 - Math.max(0, Math.min(1, progress)))}
      />
    </Svg>
  );
};

const BeginnerTimerScreen = ({ navigation, route }) => {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { theme, preferences } = useContext(UserContext);
  const { colors, typography } = theme;

  const levelId = route.params?.level || preferences.level;
  const sessions = programmeSessions(levelId, perWeekOf(preferences));
  const wanted = route.params?.index ?? currentIndex(preferences, levelId);
  const session = sessions.find((s) => s.index === wanted) || sessions.find((s) => s.index >= wanted);
  const phases = useMemo(() => (session ? sessionPhases(session) : []), [session]);
  const total = phasesSeconds(phases);

  const [clock, setClock] = useState(null); // null = not started
  const [now, setNow] = useState(() => Date.now());
  const lastIndex = useRef(-1);
  const lastTick = useRef(null);
  const saidMidway = useRef(null);

  // Tick while running. Wall-clock, so a background spell just catches up.
  useEffect(() => {
    if (!clock || clock.pausedAt || finished) return undefined;
    const id = setInterval(() => setNow(Date.now()), 100);
    const sub = AppState.addEventListener("change", (s) => s === "active" && setNow(Date.now()));
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [clock, finished]);

  const elapsed = elapsedOf(clock, now);
  const pos = positionAt(phases, elapsed);
  const phase = phases[pos.index];
  const next = phases[pos.index + 1];
  const finished = !!clock && pos.done;
  const running = !!clock && !clock.pausedAt && !finished;
  const celebrated = useRef(false);

  // Phase changes: voice + a firm buzz. Last 3 s: a tick each second.
  useEffect(() => {
    if (!clock) return;
    if (finished) {
      if (!celebrated.current) {
        celebrated.current = true;
        clearAlerts();
        haptics.success();
        say(DONE_ANNOUNCEMENT);
      }
      return;
    }
    if (running && phase.kind === "run" && phase.seconds >= 120 && pos.phaseElapsed >= phase.seconds / 2 && saidMidway.current !== pos.index) {
      saidMidway.current = pos.index;
      say(midwayLine(phase));
    }
    if (pos.index !== lastIndex.current) {
      lastIndex.current = pos.index;
      if (!clock.pausedAt) {
        haptics.medium();
        say(phaseAnnouncement(phase, next));
      }
    }
    const left = Math.ceil(pos.remaining);
    if (running && left <= 3 && left > 0 && lastTick.current !== `${pos.index}:${left}`) {
      lastTick.current = `${pos.index}:${left}`;
      haptics.light();
      if (left === 3 && next) say(next.kind === "run" ? "Prépare-toi à courir." : "Prépare-toi à marcher.");
    }
  }, [clock, pos.index, pos.remaining, pos.phaseElapsed, finished, running, phase, next]);

  useEffect(
    () => () => {
      hush();
      clearAlerts();
    },
    [],
  );

  // The background slides between "run" and "walk" colours
  const runAmount = useSharedValue(0);
  useEffect(() => {
    runAmount.value = withTiming(clock && !finished && phase?.kind === "run" ? 1 : 0, { duration: 450 });
  }, [clock, finished, phase?.kind, runAmount]);
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (clock && !finished) pulse.value = withSequence(withSpring(1.06, { damping: 12 }), withSpring(1, { damping: 14 }));
  }, [pos.index, clock, finished, pulse]);
  const bgStyle = useAnimatedStyle(() => ({ opacity: runAmount.value }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  if (!session) return null;

  const isRun = !!clock && !finished && phase?.kind === "run";
  const fg = isRun ? RUN_TEXT : colors.text;
  const dim = isRun ? RUN_DIM : colors.text;
  const soft = isRun ? RUN_SOFT : colors.accentSoft;
  const ringColor = isRun ? RUN_TEXT : colors.accentText;

  const start = async () => {
    lastIndex.current = -1;
    saidMidway.current = null;
    celebrated.current = false;
    await askNotifications(); // so the phone still buzzes in a pocket
    const t = Date.now();
    const c = startClock(t);
    setClock(c);
    setNow(t);
    scheduleAlerts(phases, c, t);
  };
  const toggle = () => {
    const t = Date.now();
    setNow(t);
    if (clock.pausedAt) {
      const c = resumeClock(clock, t);
      setClock(c);
      scheduleAlerts(phases, c, t);
      say("C'est reparti.");
    } else {
      setClock(pauseClock(clock, t));
      clearAlerts();
      hush();
    }
  };
  const skip = () => {
    const t = Date.now();
    setNow(t);
    const c = skipPhase(clock, phases, t);
    setClock(c);
    if (!c.pausedAt) scheduleAlerts(phases, c, t);
  };
  const stop = () => {
    hush();
    clearAlerts();
    navigation.goBack();
  };

  const title = `${PROGRAMMES[levelId].name} · S${session.week} · ${sessionLabel(session)}`;
  const nextLabel = next ? `${next.kind === "run" ? "Cours" : "Marche"} ${formatCountdown(next.seconds)}` : "Fin de la séance";

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle={isRun || theme.dark ? "light-content" : "dark-content"} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: RUN_BG }, bgStyle]} />

      {/* Top bar */}
      <View style={styles.top}>
        <Pressable onPress={stop} small hitSlop={10}>
          <View style={[styles.round, { backgroundColor: soft }]}>
            <Glyph name="cross" size={18} color={fg} />
          </View>
        </Pressable>
        <Text numberOfLines={1} style={[typography.finePrint, { color: dim, opacity: isRun ? 1 : 0.6, flex: 1, textAlign: "center", fontSize: 15 }]}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* READY */}
      {!clock && (
        <View style={styles.middle}>
          <View style={{ gap: 6, alignItems: "center" }}>
            <Text style={[typography.finePrint, { fontSize: 15 }]}>{`${runMinutes(session)}' de course · ${formatCountdown(total)} en tout`}</Text>
            <Text style={[styles.hero, { color: colors.text }]}>{sessionLabel(session)}</Text>
          </View>
          <View style={[styles.plan, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {phases.map((p, i) => (
              <View key={i} style={[styles.planRow, i < phases.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[styles.dot, { backgroundColor: p.kind === "run" ? colors.accent : colors.border }]} />
                <Text style={[typography.heading, { flex: 1 }, p.kind === "run" && typography.bold, p.kind === "walk" && { opacity: 0.6 }]}>{p.label}</Text>
                <Text style={[typography.heading, typography.mono, { opacity: 0.8 }]}>{formatCountdown(p.seconds)}</Text>
              </View>
            ))}
          </View>
          <Text style={[typography.finePrint, styles.hint]}>Le son te guide — monte le volume ou mets une oreillette. Le téléphone vibre avant chaque changement.</Text>
        </View>
      )}

      {/* RUNNING */}
      {!!clock && !finished && (
        <View style={styles.middle}>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={[styles.kicker, { color: dim }]}>{phase.label.toUpperCase()}</Text>
            <Text style={[styles.hero, { color: fg }]}>{phase.kind === "run" ? "Cours" : "Marche"}</Text>
          </View>

          <Animated.View style={[styles.ringWrap, pulseStyle]}>
            <Ring size={280} stroke={14} progress={pos.remaining / phase.seconds} color={ringColor} track={soft} />
            <View style={styles.ringInner}>
              <Text style={[styles.clock, typography.mono, { color: fg }]}>{formatCountdown(pos.remaining)}</Text>
              <Text style={[typography.finePrint, { color: dim, opacity: isRun ? 1 : 0.6, fontSize: 15 }]}>{phase.cue}</Text>
            </View>
          </Animated.View>

          <View style={{ alignItems: "center", gap: 10, width: "100%" }}>
            <Text style={[typography.finePrint, { color: dim, opacity: isRun ? 1 : 0.6 }]}>
              Ensuite <Text style={[typography.bold, { color: fg }]}>{nextLabel}</Text>
              {"  ·  "}reste {formatCountdown(pos.total)}
            </Text>
            <View style={styles.segments}>
              {phases.map((p, i) => {
                const flex = Math.max(p.seconds, 20);
                const done = i < pos.index;
                const current = i === pos.index;
                const fill = done ? 1 : current ? 1 - pos.remaining / p.seconds : 0;
                return (
                  <View key={i} style={[styles.segment, { flex, backgroundColor: soft }]}>
                    <View style={{ width: `${fill * 100}%`, height: "100%", backgroundColor: p.kind === "run" ? ringColor : dim, opacity: p.kind === "run" ? 1 : 0.5 }} />
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* DONE */}
      {finished && (
        <View style={styles.middle}>
          <View style={{ alignItems: "center", gap: 6 }}>
            <Text style={[styles.kicker, { color: colors.accentText }]}>SÉANCE TERMINÉE</Text>
            <Text style={[styles.hero, { color: colors.text }]}>Bravo</Text>
            <Text style={[typography.finePrint, { fontSize: 15 }]}>{`${sessionLabel(session)} · ${runMinutes(session)}' de course`}</Text>
          </View>
          <View style={[styles.doneRing]}>
            <Ring size={200} stroke={14} progress={1} color={colors.accentText} track={colors.accentSoft} />
            <View style={styles.ringInner}>
              <Glyph name="check" size={64} color={colors.accentText} strokeWidth={2.4} />
            </View>
          </View>
          <Text style={[typography.finePrint, styles.hint]}>Marche encore un peu, bois un coup. Ensuite, dis-nous comment c&apos;était.</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {!clock && (
          <Pressable onPress={start}>
            <View style={[styles.big, { backgroundColor: colors.accent }]}>
              <Glyph name="play" size={34} color="white" />
            </View>
          </Pressable>
        )}
        {!!clock && !finished && (
          <>
            <Pressable onPress={skip} small hitSlop={8}>
              <View style={[styles.side, { backgroundColor: soft }]}>
                <Text style={[typography.finePrint, typography.bold, { color: fg, opacity: 1 }]}>Passer</Text>
              </View>
            </Pressable>
            <Pressable onPress={toggle}>
              <View style={[styles.big, { backgroundColor: isRun ? "white" : colors.accent }]}>
                <Glyph name={clock.pausedAt ? "play" : "pause"} size={34} color={isRun ? RUN_BG : "white"} />
              </View>
            </Pressable>
            <Pressable onPress={stop} small hitSlop={8}>
              <View style={[styles.side, { backgroundColor: soft }]}>
                <Text style={[typography.finePrint, typography.bold, { color: fg, opacity: 1 }]}>Arrêter</Text>
              </View>
            </Pressable>
          </>
        )}
        {finished && (
          <Pressable onPress={stop}>
            <View style={[styles.wide, { backgroundColor: colors.accent }]}>
              <Text style={styles.wideText}>Noter la séance</Text>
            </View>
          </Pressable>
        )}
      </View>
      {!!clock && !finished && clock.pausedAt && (
        <Text style={[typography.finePrint, { color: dim, textAlign: "center", opacity: isRun ? 1 : 0.6 }]}>En pause</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  top: { flexDirection: "row", alignItems: "center", gap: 8 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  middle: { flex: 1, justifyContent: "space-evenly", alignItems: "center", gap: 18, paddingVertical: 10 },
  hero: { fontFamily: "Archivo-BlackItalic", fontSize: 56, lineHeight: 62, letterSpacing: -1.2 },
  kicker: { fontFamily: "DiatypePreTrial-Medium", fontSize: 14, letterSpacing: 1.6 },
  ringWrap: { width: 280, height: 280, alignItems: "center", justifyContent: "center" },
  doneRing: { width: 200, height: 200, alignItems: "center", justifyContent: "center" },
  ringInner: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 36 },
  clock: { fontSize: 72, lineHeight: 80, letterSpacing: -2 },
  segments: { flexDirection: "row", gap: 3, width: "100%", height: 6 },
  segment: { borderRadius: 3, overflow: "hidden" },
  plan: { width: "100%", borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 4, maxHeight: 300 },
  planRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  hint: { textAlign: "center", fontSize: 14, paddingHorizontal: 10 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18, paddingTop: 6 },
  big: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" },
  side: { paddingHorizontal: 18, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", minWidth: 92 },
  wide: { height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", alignSelf: "stretch", minWidth: 260 },
  wideText: { color: "white", fontSize: 22, fontFamily: "DiatypePre-Regular" },
});

export default BeginnerTimerScreen;
