import React from "react";
import { View, Text } from "react-native";

/*
  "essor" in Archivo Black Italic (the Essor wordmark typeface), with
  "athletics" set small beside or under it.

    <Wordmark size={26} color={colors.text} />           Home header
    <Wordmark size={64} stacked color="#FFFFFF" />       Welcome
*/

const Wordmark = ({ size = 26, stacked = false, color = "#FFFFFF", accent, style }) => {
  const small = stacked ? size * 0.3 : size * 0.52;
  return (
    <View
      style={[
        stacked
          ? { alignItems: "center" }
          : { flexDirection: "row", alignItems: "baseline", gap: size * 0.25 },
        style,
      ]}
    >
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: "Archivo-BlackItalic",
          fontSize: size,
          lineHeight: size * 1.2,
          letterSpacing: -size * 0.02,
          color,
        }}
      >
        essor
      </Text>
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: "DiatypePre-Regular",
          fontSize: small,
          letterSpacing: stacked ? small * 0.35 : -small * 0.02,
          color: accent || color,
          opacity: accent ? 1 : 0.6,
          marginTop: stacked ? -size * 0.05 : 0,
        }}
      >
        athletics
      </Text>
    </View>
  );
};

export default Wordmark;
