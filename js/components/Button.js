import React, { useContext } from "react";
import { StyleSheet, View, Text, ActivityIndicator } from "react-native";

import Pressable from "./Pressable";
import UserContext from "../variables/context";

const Button = ({
  disabled,
  onPress,
  loading,
  children,
  shadow,
  style,
  backgroundColor,
  textColor,
}) => {
  const { theme } = useContext(UserContext);

  return (
    <Pressable disabled={disabled} onPress={onPress}>
      <View
        style={[
          styles.buttonContainer,
          {
            backgroundColor: disabled
              ? theme.colors.border
              : theme.colors.accent,
            shadowColor: theme.colors.accent,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: shadow && !disabled ? 0.25 : 0,
            shadowRadius: 5,
            elevation: 5,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text style={[styles.text, { color: disabled ? "grey" : textColor || "white" }]}>
            {children}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    height: 48,
    borderRadius: 24,
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  text: {
    fontSize: 24,
    marginBottom: 2,
  },
});

export default Button;
