import React, { useContext } from "react";
import { StyleSheet, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import NavigationBar from "../components/NavigationBar";
import useKeyboardHeight from "../utils/useKeyboardHeight";
import UserContext from "../variables/context";

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
    theme: { colors },
  } = useContext(UserContext);

  /* Animation Values */
  const keyboardHeight = useKeyboardHeight(
    route?.params?.keyboardHeight || insets.bottom,
    10,
    true,
  );


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
