import React from "react";
import Animated, {
  useSharedValue,
  withSpring,
  withDelay,
  useAnimatedStyle,
} from "react-native-reanimated";
import {
  GestureDetector,
  useTapGesture,
  useLongPressGesture,
  useExclusiveGestures,
} from "react-native-gesture-handler";

import haptics from "../utils/haptics";
import useFocusEffect from "../utils/useFocusEffect";

/*
  Programme's tappable wrapper: squashes slightly while pressed, springs back,
  taps the haptic engine, then calls onPress. Everything in the app that can
  be tapped goes through this so it all feels the same.
  Optional onLongPress: holding ~0.4 s fires it (with a firmer haptic)
  instead of onPress.
*/

const Pressable = ({
  children,
  disabled,
  onPress,
  onLongPress,
  small,
  hitSlop,
  haptics: useHaptics = true,
  animation = true,
}) => {
  const scale = useSharedValue(1);

  useFocusEffect(() => {
    scale.value = withSpring(1);
  });

  const squash = () => {
    scale.value = withSpring(small ? 0.75 : 0.95, {
      damping: 2,
      mass: 1,
      stiffness: 75,
      overshootClamping: true,
    });
    scale.value = withDelay(400, withSpring(1));
  };

  const release = () => {
    scale.value = withSpring(1);
  };

  const tap = useTapGesture({
    enabled: !!onPress,
    runOnJS: true,
    hitSlop,
    onBegin: squash,
    onActivate: () => {
      release();
      if (useHaptics) haptics.light();
      if (!disabled && onPress) onPress();
    },
    onFinalize: release,
  });

  const longPress = useLongPressGesture({
    enabled: !!onLongPress && !disabled,
    runOnJS: true,
    minDuration: 400,
    hitSlop,
    onBegin: squash,
    onActivate: () => {
      release();
      haptics.medium();
      if (onLongPress) onLongPress();
    },
    onFinalize: release,
  });

  // Long press wins if held; a quick tap falls through to onPress
  const both = useExclusiveGestures(longPress, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: animation ? scale.value : 1 }],
  }));

  return (
    <GestureDetector gesture={onLongPress ? both : tap}>
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </GestureDetector>
  );
};

export default Pressable;
