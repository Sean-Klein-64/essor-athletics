import React, { useContext } from "react";
import { Pressable, View } from "react-native";

import UserContext from "../variables/context";

import ChevronLeft from "../../assets/icons/ChevronLeft.svg";
import Close from "../../assets/icons/Close.svg";

/*
  A round tappable icon button — the back and close buttons of the
  navigation bar. (The in-content icons are drawn by Glyph.)
  Add an entry to ICONS to use another file from assets/icons.
*/

const ICONS = {
  left: ChevronLeft,
  cross: Close,
};

const Icon = ({
  icon,
  color,
  background,
  width = 40,
  height = 40,
  fill = "70%",
  shadow = true,
  hitSlop = 20,
  onPress,
  onLongPress,
  style,
}) => {
  const {
    theme: { colors, dark },
  } = useContext(UserContext);

  const Svg = ICONS[icon];
  const showBorder = shadow && background !== colors.accent;

  return (
    <Pressable hitSlop={hitSlop} onPress={onPress} onLongPress={onLongPress} disabled={!(onPress || onLongPress)}>
      <View
        style={[
          {
            width,
            height,
            borderRadius: 40,
            backgroundColor: background || colors.card,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "black",
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 6,
            shadowOpacity: dark && showBorder ? 0.25 : 0,
            borderColor: colors.border,
            borderWidth: !dark && showBorder ? 1 : 0,
          },
          style,
        ]}
      >
        {!!Svg && <Svg style={{ color: color || colors.text }} width={fill} height={fill} />}
      </View>
    </Pressable>
  );
};

export default Icon;
