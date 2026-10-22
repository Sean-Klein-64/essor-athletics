import React, { useEffect, memo, useContext } from "react";
import { StyleSheet, View, Image, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import Pressable from "../components/Pressable";
import Icon from "../components/Icon";
import UserContext from "../variables/context";

const ListItem = memo(
  ({ icon, emoji, name, subText, isNavigator, isSelected, onPress }) => {
    const checkMarkVisible = useSharedValue(0.9);
    const {
      theme: { colors, typography },
    } = useContext(UserContext);

    useEffect(() => {
      checkMarkVisible.value = withSpring(isSelected ? 1 : 0.9, {
        damping: 20,
        mass: 0.5,
        stiffness: 100,
      });
    }, [isSelected]);

    const animatedCheckMark = useAnimatedStyle(() => ({
      transform: [{ scale: checkMarkVisible.value }],
      opacity: checkMarkVisible.value,
    }));

    return (
      <Pressable hitSlop={10} onPress={onPress}>
        <View style={styles.container}>
          {!!emoji && (
            <Icon
              emoji={emoji}
              width={36}
              height={36}
              style={{ marginRight: 10 }}
            />
          )}
          {!!icon && <Icon icon={icon} width={36} height={36} />}

          <View style={styles.text}>
            <Text style={typography.copy} numberOfLines={1}>
              {name}
            </Text>
            {!!subText && (
              <Text style={[typography.finePrint, styles.subText]}>
                {subText}
              </Text>
            )}
          </View>

          <Icon
            icon="check"
            width={28}
            height={28}
            fill="80%"
            color={isSelected ? "white" : colors.text}
            background={isSelected ? colors.accent : colors.border}
          />

          {!!isNavigator && (
            <Icon
              icon="right"
              shadow={false}
              width={28}
              height={28}
              fill="100%"
              background="transparent"
            />
          )}
        </View>
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    width: "100%",
    minHeight: 36,
    paddingVertical: 6,
    paddingHorizontal: 15,

    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    flex: 1,
    marginRight: 15,
  },
  subText: {
    marginTop: -3,
  },
  checkmark: {
    width: 24,
    height: 24,
  },
  navigator: {
    marginLeft: 10,
    marginRight: 5,
  },
});

export default memo(ListItem);
