import React, { useContext, useCallback } from "react";
import { Dimensions, StyleSheet, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import NavigationBar from "../components/NavigationBar";
import useKeyboardHeight from "../utils/useKeyboardHeight";
import useFocusEffect from "../utils/useFocusEffect";
import useMaintainFocus from "../utils/useMaintainFocus";
import UserContext from "../variables/context";

const { width, height } = Dimensions.get("window");

const SlideScreenContainer = ({
  navigation,
  route,
  type,
  title,
  ignoreKeyboard,
  showDoneButton,
  style,
  children,
}) => {
  /* Constants */
  const insets = useSafeAreaInsets();
  const {
    theme: { colors, typography },
  } = useContext(UserContext);

  /* Animation Values */
  const keyboardHeight = useKeyboardHeight(
    route?.params?.keyboardHeight || insets.bottom,
    10,
    true,
  );

  // useFocusEffect(() => keyboardHeight.value = withTiming(insets.bottom, { duration: 20 }), 0);

  /* Animated styles for the container avoiding the keyboard */
  const animatedContainer = useAnimatedStyle(() => ({
    marginTop: insets.top,
    marginBottom: !ignoreKeyboard ? keyboardHeight.value : insets.bottom,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.background },
        animatedContainer,
        style,
      ]}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <NavigationBar
        navigation={navigation}
        title={title}
        type={type}
        isModal
        showDoneButton={showDoneButton}
      />

      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    width: "100%",
    borderRadius: 25,
    overflow: "hidden",
  },
  scrollView: {
    width: "100%",
  },
});

export default SlideScreenContainer;
