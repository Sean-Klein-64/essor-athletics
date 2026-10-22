import React from "react";
import { Dimensions } from "react-native";

/* Transitions */
import horizontalSlideTransition from "./transitions/horizontalSlide";
import horizontalSlideWithinModalTransition from "./transitions/horizontalSlideWithinModal";
import verticalSlideTransition from "./transitions/verticalSlide";

import verticalSlideModalTransition from "./transitions/verticalSlideModal";
import horizontalSlideModalTransition from "./transitions/horizontalSlideModal";
import verticalOverlayModalTransition from "./transitions/verticalOverlayModal";
import verticalReplaceModalTransition from "./transitions/verticalReplaceModal";

const { width, height } = Dimensions.get("window");

const transitionSpec = {
  open: {
    animation: "spring",
    config: {
      stiffness: 1000,
      damping: 1000,
      mass: 2,
      overshootClamping: false,
      restDisplacementThreshold: 0.1,
      restSpeedThreshold: 0.1,
    },
  },
  close: {
    animation: "timing",
    config: { duration: 150 },
  },
};

const basicOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: "transparent" },
  transitionSpec,
};

const modalOptions = {
  cardOverlayEnabled: true,
};

/* Standard Horizontal Slide */
export const horizontalSlide = {
  ...basicOptions,

  cardStyleInterpolator: horizontalSlideTransition,
  gestureDirection: "horizontal",
};

/* Inverted Horizontal Slide */
export const horizontalSlideInverted = {
  ...basicOptions,

  cardStyleInterpolator: horizontalSlideTransition,
  gestureDirection: "horizontal-inverted",
  gestureResponseDistance: { horizontal: width },
};

/* Standard Modal Options */
export const verticalOverlayModal = {
  ...basicOptions,
  ...modalOptions,

  cardStyleInterpolator: verticalOverlayModalTransition,
  gestureDirection: "vertical",
  gestureResponseDistance: { vertical: height },
};

/* Inverted Vertical Slide */
export const verticalSlideInverted = {
  ...basicOptions,

  cardStyleInterpolator: verticalSlideTransition,
  gestureDirection: "vertical-inverted",
  gestureResponseDistance: { vertical: height / 25 },
};

/* Fancy Slide Overlay */
export const verticalSlideModal = {
  ...basicOptions,
  ...modalOptions,

  cardStyleInterpolator: verticalSlideModalTransition,
  gestureDirection: "vertical",
  gestureResponseDistance: { vertical: height },
};

/* Fancy Slide Overlay */
export const horizontalSlideModal = {
  ...basicOptions,
  ...modalOptions,

  cardStyleInterpolator: horizontalSlideModalTransition,
  gestureDirection: "horizontal",
  gestureResponseDistance: { horizontal: width },
};

/* Fancy Slide Internal Horizontal Navigation */
export const horizontalSlideWithinModal = {
  ...basicOptions,
  ...modalOptions,

  cardStyleInterpolator: horizontalSlideWithinModalTransition,
  gestureDirection: "horizontal",
  gestureResponseDistance: { horizontal: width },
};

/* Customize Options */
export const verticalReplaceModal = {
  ...basicOptions,
  ...modalOptions,

  cardStyleInterpolator: verticalReplaceModalTransition,
  gestureDirection: "vertical",
  gestureResponseDistance: { vertical: height },
};
