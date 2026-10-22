import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import WelcomeScreen from "../../screens/WelcomeScreen";
import QuestionScreen from "../../screens/QuestionScreen";
import { horizontalSlide } from "../screenOptions";

const OnboardingNavigator = createStackNavigator();

/*
  Shown until the first-run questions are answered once.
  Welcome → Question (prénom) → Question (niveau) → Question (VMA) → app.
*/

const OnboardingStack = () => (
  <OnboardingNavigator.Navigator screenOptions={horizontalSlide}>
    <OnboardingNavigator.Screen name="Welcome" component={WelcomeScreen} />
    <OnboardingNavigator.Screen name="Question" component={QuestionScreen} />
  </OnboardingNavigator.Navigator>
);

export default OnboardingStack;
