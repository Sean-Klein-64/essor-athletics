import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import WelcomeScreen from "../../screens/WelcomeScreen";
import QuestionScreen from "../../screens/QuestionScreen";
import CoachCodeScreen from "../../screens/CoachCodeScreen";
import { horizontalSlide } from "../screenOptions";

const OnboardingNavigator = createStackNavigator();

/*
  Shown until sign-up is done once.
  Welcome → Question × n (the questionnaire, level, VMA) → app
  Welcome → CoachCode → app (coach view)
*/
const OnboardingStack = () => (
  <OnboardingNavigator.Navigator screenOptions={horizontalSlide}>
    <OnboardingNavigator.Screen name="Welcome" component={WelcomeScreen} />
    <OnboardingNavigator.Screen name="Question" component={QuestionScreen} />
    <OnboardingNavigator.Screen name="CoachCode" component={CoachCodeScreen} />
  </OnboardingNavigator.Navigator>
);

export default OnboardingStack;
