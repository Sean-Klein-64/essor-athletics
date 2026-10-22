import React, { useContext } from "react";
import { Text } from "react-native";

import UserContext from "../variables/context";

/* Small uppercase label above a group of cards (Programme style) */
const SectionLabel = ({ children, style }) => {
  const {
    theme: { typography },
  } = useContext(UserContext);
  return (
    <Text
      style={[
        typography.finePrint,
        { fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", marginLeft: 4 },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

export default SectionLabel;
