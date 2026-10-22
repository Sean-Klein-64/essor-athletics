import React, { useContext, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import UserContext from "../variables/context";

/*
  Text that scrolls itself when it's too wide to fit — used for the title
  bar, where a long routine name ("Cowboy / Prone Crossover / Sphinx")
  would otherwise run off the screen.

  It measures itself first: while it fits, it sits still and centred like
  any other title. Only when the text is wider than the space does it
  start moving, pausing at each end so the beginning and the end are both
  readable. The text is drawn twice, so the loop has no visible jump.
*/

const SPEED = 40; // points per second — slow enough to read
const PAUSE = 1400; // ms held at each end
const GAP = 48; // space between the two copies

const MarqueeText = ({ children, style, numberOfLines = 1 }) => {
  const {
    theme: { typography },
  } = useContext(UserContext);
  const [boxWidth, setBoxWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const x = useSharedValue(0);

  const overflows = boxWidth > 0 && textWidth > boxWidth + 1;
  const distance = textWidth + GAP;

  useEffect(() => {
    cancelAnimation(x);
    x.value = 0;
    if (!overflows) return;
    const duration = (distance / SPEED) * 1000;
    x.value = withRepeat(
      withSequence(
        withDelay(PAUSE, withTiming(-distance, { duration, easing: Easing.linear })),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(x);
  }, [overflows, distance]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  /* The hidden copy is measured inside a very wide box, so it reports the
     width the text actually wants rather than the width it's squeezed into
     — without that it can never look too wide and would never scroll. */
  return (
    <View
      style={styles.box}
      onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)}
      accessibilityLabel={typeof children === "string" ? children : undefined}
    >
      <View style={styles.measureBox} pointerEvents="none">
        <Text
          style={[typography.body, typography.bold, style]}
          numberOfLines={1}
          onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
        >
          {children}
        </Text>
      </View>
      {overflows ? (
        <Animated.View style={[styles.track, animated]}>
          <Text style={[typography.body, typography.bold, style, styles.copy]}>
            {children}
          </Text>
          <View style={{ width: GAP }} />
          <Text style={[typography.body, typography.bold, style, styles.copy]}>
            {children}
          </Text>
        </Animated.View>
      ) : (
        <Text
          style={[typography.body, typography.bold, style, styles.still]}
          numberOfLines={numberOfLines}
        >
          {children}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // marginHorizontal keeps a scrolling title clear of the back arrow
  box: { flex: 1, overflow: "hidden", justifyContent: "center", marginHorizontal: 8 },
  measureBox: {
    position: "absolute",
    opacity: 0,
    left: 0,
    top: 0,
    width: 4000, // room for the text to report its natural width
    flexDirection: "row",
  },
  track: { flexDirection: "row", alignItems: "center", width: 4000 },
  // natural width, never squeezed to fit the bar
  copy: { flexShrink: 0, flexGrow: 0 },
  still: { textAlign: "center" },
});

export default MarqueeText;
