import React, { useEffect } from "react";
import { StyleSheet, View, Platform } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import Wordmark from "./Wordmark";
import { still, clip, SECONDS } from "../lib/launch";

/*
  Plays over the app on every cold start, straight after the native splash,
  then fades away to reveal Home.

    0.0 s  the clip (or still) is there, slowly zooming, under a dark wash
    0.4 s  the wordmark rises up through it
    end    the whole screen fades out

  With Reduce Motion on, it's just a short fade. The clip is muted and
  plays once; if it fails to load the still carries on underneath.
*/

const ease = Easing.out(Easing.cubic);

let VideoView, useVideoPlayer;
if (clip && Platform.OS !== "web") {
  ({ VideoView, useVideoPlayer } = require("expo-video"));
}

const Clip = () => {
  const player = useVideoPlayer(clip, (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
};

const LaunchAnimation = ({ onDone }) => {
  const reduced = useReducedMotion();
  const zoom = useSharedValue(1);
  const words = useSharedValue(reduced ? 1 : 0);
  const screen = useSharedValue(1);

  useEffect(() => {
    const total = (reduced ? 0.9 : SECONDS) * 1000;
    const finish = () => onDone?.();
    if (!reduced) {
      zoom.value = withTiming(1.08, { duration: total, easing: Easing.linear });
      words.value = withDelay(400, withTiming(1, { duration: 700, easing: ease }));
    }
    screen.value = withDelay(total - 450, withTiming(0, { duration: 450, easing: Easing.linear }, (done) => done && runOnJS(finish)()));
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screen.value }));
  const zoomStyle = useAnimatedStyle(() => ({ transform: [{ scale: zoom.value }] }));
  const wordsStyle = useAnimatedStyle(() => ({
    opacity: words.value,
    transform: [{ translateY: (1 - words.value) * 18 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, screenStyle]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, zoomStyle]}>
        <Animated.Image source={still} style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]} resizeMode="cover" />
        {clip && Platform.OS !== "web" && <Clip />}
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, styles.wash]} />
      <Animated.View style={[styles.words, wordsStyle]}>
        <Wordmark size={72} stacked color="#FFFFFF" accent="#7CC4A2" />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: { backgroundColor: "#0A0A0A", alignItems: "center", justifyContent: "center" },
  wash: { backgroundColor: "rgba(10,10,10,0.42)" },
  words: { alignItems: "center" },
});

export default LaunchAnimation;
