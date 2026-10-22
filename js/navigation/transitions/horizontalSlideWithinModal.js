import { Animated } from "react-native";

const horizontalSlideTransition = ({
  current,
  next,
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
    cardStyle: {
      transform: [
        {
          translateX: Animated.multiply(
            progress.interpolate({
              inputRange: [0, 1, 2],
              outputRange: [
                screen.width, // Focused, but offscreen in the beginning
                0, // Fully focused
                -1 * screen.width, // Fully unfocused
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
                0.9, // Focused, but offscreen in the beginning
                1, // Fully focused
                0.95, // Fully unfocused
              ],
              extrapolate: "clamp",
            }),
            inverted
          ),
        },
      ],
      opacity: Animated.multiply(
        progress.interpolate({
          inputRange: [0, 1, 2],
          outputRange: [
            0.6, // Focused, but offscreen in the beginning
            1, // Fully focused
            0.4, // Fully unfocused
          ],
          extrapolate: "clamp",
        }),
        inverted
      ),
    },
  };
};

export default horizontalSlideTransition;
