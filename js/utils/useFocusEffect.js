import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";

/* Run `func` each time the screen comes into focus (optionally after a delay) */
export default function useFocusEffect(func, delay = 0) {
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () =>
      setTimeout(() => func(), delay),
    );
    return unsubscribe;
  }, []);

  return true;
}
