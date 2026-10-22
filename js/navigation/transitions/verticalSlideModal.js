import { Animated } from "react-native";

const verticalSlideModalTransition = ({
  next,
  current,
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
                screen.width, // Focused, but offscreen in the beginning
                0, // Fully focused
                0, // Fully unfocused
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
                1, // Focused, but offscreen in the beginning
                1, // Fully focused
                0.95, // Fully unfocused
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
          inputRange: [0, 1, 1.25, 2],
          outputRange: [
            0, // Focused, but offscreen in the beginning
            0, // Fully focused
            35,
            35, // Fully unfocused
          ],
          extrapolate: "clamp",
        }),
        inverted
      ),
    },
    overlayStyle: {
      paddingHorizontal: 20,
      opacity: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
    },
  };
};

export default verticalSlideModalTransition;
