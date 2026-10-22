import React, { useEffect, useRef, useContext } from "react";
import { Dimensions, StyleSheet, Pressable, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSequence,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
} from "react-native-reanimated";
import haptics from "../utils/haptics";

import UserContext from "../variables/context";

const OptionPicker = ({
  options = ["1", "2", "3", "4", "5+"],
  extension,
  value,
  setValue,
  disabled,
  style,
}) => {
  const ScrollY = useSharedValue(0);
  const scale = useSharedValue(1);
  const scrollView = useRef();
  const {
    theme: { colors, typography },
  } = useContext(UserContext);

  useEffect(() => {
    if (value) {
      scrollView.current.scrollTo({
        x: 0,
        y: options.findIndex((i) => i === value) * OPTION_HEIGHT,
        animated: false,
      });
    } else {
      setValue(options[0]);
    }
  }, []);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    ScrollY.value = event.contentOffset.y;
    runOnJS(setValue)(
      options[Math.round(event.contentOffset.y / OPTION_HEIGHT)],
    );
  });

  const animatedSelection = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollView}
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={OPTION_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={() => {
          scale.value = withSequence(withSpring(1.02), withSpring(1));
          haptics.light();
        }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        bounces={false}
      >
        {options.map((item, index) => {
          const animatedOption = useAnimatedStyle(() => ({
            transform: [
              {
                translateY: interpolate(
                  ScrollY.value,
                  [
                    OPTION_HEIGHT * (index - 1),
                    OPTION_HEIGHT * index,
                    OPTION_HEIGHT * (index + 1),
                  ],
                  [10, 0, -10],
                  Extrapolate.CLAMP,
                ),
              },
              {
                scale: interpolate(
                  ScrollY.value,
                  [
                    OPTION_HEIGHT * (index - 1),
                    OPTION_HEIGHT * index,
                    OPTION_HEIGHT * (index + 1),
                  ],
                  [1, 1.25, 1],
                  Extrapolate.CLAMP,
                ),
              },
            ],
            opacity: interpolate(
              ScrollY.value,
              [
                OPTION_HEIGHT * (index - 1),
                OPTION_HEIGHT * index,
                OPTION_HEIGHT * (index + 1),
              ],
              [0.7, 1, 0.7],
            ),
          }));
          return (
            <Pressable
              key={index}
              onPress={() =>
                scrollView.current.scrollTo({
                  x: 0,
                  y: 50 * index,
                  animated: true,
                })
              }
            >
              <Animated.View style={[styles.optionContainer, animatedOption]}>
                <Text style={[styles.optionText, { color: colors.text }]}>
                  {item}
                  {typeof extension === "object"
                    ? extension[item]
                    : extension || ""}
                </Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </Animated.ScrollView>
      <Animated.View
        style={[
          styles.answerUnderlay,
          animatedSelection,
          { backgroundColor: colors.card },
        ]}
      />
    </View>
  );
};

const PICKER_HEIGHT = 400;
const OPTION_HEIGHT = 50;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  listContainer: {
    maxHeight: PICKER_HEIGHT,
    marginHorizontal: OPTION_HEIGHT,
    width: "100%",
    zIndex: 1,
  },
  listContent: {
    paddingVertical: PICKER_HEIGHT / 2 - OPTION_HEIGHT / 2,
    width: "100%",
  },
  optionContainer: {
    height: OPTION_HEIGHT,
    borderRadius: OPTION_HEIGHT / 2,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  optionText: {
    fontSize: 24,
    paddingBottom: 2,
  },
  answerUnderlay: {
    ...StyleSheet.absoluteFillObject,
    top: PICKER_HEIGHT / 2 - OPTION_HEIGHT / 2,
    height: OPTION_HEIGHT,
    left: OPTION_HEIGHT / 3,
    right: OPTION_HEIGHT / 3,
    borderRadius: OPTION_HEIGHT / 2,
  },
});

export default OptionPicker;
