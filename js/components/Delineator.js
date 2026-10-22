import React, { useContext } from "react";
import { View } from "react-native";

import UserContext from "../variables/context";

const Delineator = ({ style }) => {
  const { theme } = useContext(UserContext);

  return (
    <View
      style={{
        flex: 1,
        height: 2,
        maxHeight: 2,
        borderRadius: 1,
        marginVertical: 10,
        backgroundColor: theme.colors.border,
        alignSelf: "stretch",
        ...style,
      }}
    />
  );
};

export default Delineator;
