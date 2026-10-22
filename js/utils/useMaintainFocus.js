import React, { useEffect, useRef } from "react";
import { useNavigation } from "@react-navigation/native";

export default function useMaintainFocus() {
  const navigation = useNavigation();
  const focusRef = useRef();

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () =>
      focusRef.current?.focus(),
    );

    return unsubscribe;
  }, []);

  return focusRef;
}
