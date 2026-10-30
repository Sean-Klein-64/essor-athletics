import { useEffect, useRef } from "react";
import { useNavigation } from "@react-navigation/native";

/* Run `func` each time the screen comes into focus (optionally after a delay) */
export default function useFocusEffect(func, delay = 0) {
  const navigation = useNavigation();
  const latest = useRef(func);
  useEffect(() => {
    latest.current = func;
  }, [func]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => setTimeout(() => latest.current(), delay));
    return unsubscribe;
  }, [navigation, delay]);
}
