import { Linking, Platform } from "react-native";

import { WODIFY_BOOKING_URL } from "./config";
import { wodifyTargets } from "./booking";

/* Opens Wodify. Returns the url that opened (for the "which way works" check). */
export const openWodify = async (os = Platform.OS) => {
  for (const { url, probe } of wodifyTargets(os)) {
    try {
      if (probe && os === "ios" && !(await Linking.canOpenURL(url))) continue;
      await Linking.openURL(url);
      return url;
    } catch {
      // not installed / not handled — next one
    }
  }
  return null;
};

export const openWodifySite = () => Linking.openURL(WODIFY_BOOKING_URL);
