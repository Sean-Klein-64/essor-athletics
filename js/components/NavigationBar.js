import React, { useContext } from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Icon from "./Icon";
import Pressable from "./Pressable";
import MarqueeText from "./MarqueeText";
import UserContext from "../variables/context";

const NavigationBar = ({
  navigation,
  title,
  type,
  isModal,
  showDoneButton,
}) => {
  const {
    theme: { typography, colors },
  } = useContext(UserContext);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        width: "100%",
        paddingHorizontal: isModal ? 10 : 20,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 1,
        height: isModal ? 60 : 60 + insets.top,
        paddingTop: isModal ? 0 : insets.top,
      }}
    >
      {type === "back" ? (
        <Icon fill="80%" icon="left" onPress={navigation.goBack} />
      ) : (
        <View style={{ width: 40 }} />
      )}
      <MarqueeText
        style={{ paddingTop: 2, marginLeft: showDoneButton ? 12 : 0 }}
      >
        {title}
      </MarqueeText>
      {type === "close" ? (
        <Icon icon="cross" rotation="180deg" onPress={navigation.goBack} />
      ) : showDoneButton ? (
        <Pressable small onPress={navigation.goBack}>
          <View style={{ width: 48, marginRight: 4 }}>
            <Text
              style={[
                typography.copy,
                typography.bold,
                { color: colors.accent },
              ]}
            >
              Done
            </Text>
          </View>
        </Pressable>
      ) : (
        <View style={{ width: 40 }} />
      )}
    </View>
  );
};

export default NavigationBar;
