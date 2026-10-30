import { useEffect } from "react";
import { Keyboard } from "react-native";
import { useSharedValue, withSpring } from "react-native-reanimated";

const springConfig = {
  damping: 20,
  mass: 0.5,
  stiffness: 100,
};

export default function useKeyboardHeight(
  initialValue,
  paddingBottom = 20,
  sticky,
) {
  const keyboardHeight = useSharedValue(initialValue);

  /* Animate the view on initial render based on keyboard height */
  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", (e) => {
      const height = e.endCoordinates.height + paddingBottom;
      const isFirstRender = keyboardHeight.value === initialValue;

      keyboardHeight.value = isFirstRender
        ? height
        : withSpring(height, springConfig);
    });

    const hide = Keyboard.addListener("keyboardWillHide", () => {
      if (!sticky)
        keyboardHeight.value = withSpring(initialValue, springConfig);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [initialValue, keyboardHeight, paddingBottom, sticky]);

  return keyboardHeight;
}
