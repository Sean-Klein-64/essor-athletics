import { Animated } from "react-native";

const verticalSlideModalTransition = ({
  next,
  current,
  index,
  inverted,
  layouts: { screen },
}) => {
  const progress = Animated.add(
    current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: "clamp",
    }),
    next
      ? next.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
          extrapolate: "clamp",
        })
      : 0
  );

  return {
    containerStyle: {},
    cardStyle: {
      transform: [
        {
          translateY: Animated.multiply(
            progress.interpolate({
              inputRange: [0, 1, 2],
              outputRange: [
                screen.height, // Next Route
                0,             // Current Route
                -15,           // Last Route
              ],
              extrapolate: "clamp",
            }),
            inverted
          ),
        },
        {
          scale: Animated.multiply(
            progress.interpolate({
              inputRange: [0, 1, 2],
              outputRange: [
                1,    // Next Route
                1,    // Current Route
                0.85, // Last Route
              ],
              extrapolate: "clamp",
            }),
            inverted
          ),
        },
      ],
      overflow: "hidden",
      borderRadius: Animated.multiply(
        progress.interpolate({
          inputRange: [0, 1, 2],
          outputRange: [
            0, // Focused, but offscreen in the beginning
            40, // Fully focused
            35, // Fully unfocused
          ],
          extrapolate: "clamp",
        }),
        inverted
      ),
    },
    overlayStyle: {
      opacity: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
        extrapolate: "clamp",
      }),
    },
  };
};

export default verticalSlideModalTransition;
