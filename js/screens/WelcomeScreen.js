import React, { useEffect, useContext } from "react";
import { StyleSheet, View, Text, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

import Wordmark from "../components/Wordmark";
import Button from "../components/Button";
import Pressable from "../components/Pressable";
import UserContext from "../variables/context";

/*
  First screen: the track lanes draw in behind the wordmark, then the
  line and the buttons fade up. Members sign in (phone + first name from
  the website questionnaire); coaches go to the coach code.
*/

const ease = Easing.bezier(0.25, 0.1, 0.25, 1);

/* Six lanes of a 400 m track, seen from above */
const Track = ({ width, color }) => {
  const lanes = 6;
  const gap = 14;
  const h = width * 1.55;
  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
      {Array.from({ length: lanes }).map((_, i) => {
        const inset = i * gap;
        const w = width - inset * 2;
        return (
          <Rect
            key={i}
            x={inset + 0.5}
            y={inset + 0.5}
            width={w - 1}
            height={h - inset * 2 - 1}
            rx={w / 2}
            fill="none"
            stroke={color}
            strokeWidth={1}
            opacity={0.55 - i * 0.07}
          />
        );
      })}
    </Svg>
  );
};

const WelcomeScreen = ({ navigation }) => {
  const { theme } = useContext(UserContext);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const track = useSharedValue(0);
  const text = useSharedValue(0);
  const button = useSharedValue(0);

  useEffect(() => {
    track.value = withTiming(1, { duration: 1400, easing: ease });
    text.value = withDelay(300, withTiming(1, { duration: 700, easing: ease }));
    button.value = withDelay(800, withTiming(1, { duration: 600, easing: ease }));
  }, []);

  const trackStyle = useAnimatedStyle(() => ({
    opacity: track.value,
    transform: [{ scale: 0.92 + track.value * 0.08 }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: text.value }));
  const buttonStyle = useAnimatedStyle(() => ({ opacity: button.value }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.track, trackStyle]} pointerEvents="none">
        <Track width={width * 0.82} color="#7CC4A2" />
      </Animated.View>

      <Animated.View style={[styles.center, textStyle]}>
        <Wordmark size={68} stacked color="#FFFFFF" accent="#7CC4A2" />
        <Text style={styles.tagline}>Ta VMA, tes records,{"\n"}tes séances.</Text>
      </Animated.View>

      <Animated.View style={[styles.buttonContainer, { bottom: insets.bottom + 24 }, buttonStyle]}>
        <Button
          onPress={() => navigation.navigate("SignIn")}
          style={{ backgroundColor: theme.colors.accent }}
        >
          Je cours avec Essor
        </Button>
        <Pressable onPress={() => navigation.navigate("CoachCode")} small>
          <Text style={styles.coach}>Je suis coach</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" },
  track: { position: "absolute", alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center", gap: 22, paddingBottom: 60 },
  tagline: {
    textAlign: "center",
    fontFamily: "DiatypePre-Regular",
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: "white",
    opacity: 0.85,
  },
  buttonContainer: { position: "absolute", left: 40, right: 40, gap: 6 },
  coach: {
    textAlign: "center",
    fontFamily: "DiatypePre-Regular",
    fontSize: 17,
    color: "white",
    opacity: 0.6,
    paddingVertical: 12,
  },
});

export default WelcomeScreen;
