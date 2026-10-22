import * as Haptics from "expo-haptics";

/*
  Small wrapper so components say what they mean ("light tap", "error")
  rather than reaching for the library directly. Every call is fire-and-forget.
*/
const haptics = {
  light: () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  medium: () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  success: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    ),
  error: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
      () => {},
    ),
};

export default haptics;
