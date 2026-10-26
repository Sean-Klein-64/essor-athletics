import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import WelcomeScreen from "../../screens/WelcomeScreen";
import QuestionScreen from "../../screens/QuestionScreen";
import CoachCodeScreen from "../../screens/CoachCodeScreen";
import SignInScreen from "../../screens/SignInScreen";
import { horizontalSlide } from "../screenOptions";

const OnboardingNavigator = createStackNavigator();

/*
  Shown until sign-up is done once.
  Welcome → SignIn (members only: phone + first name from the website
            questionnaire, approved by Sean) → app
  Welcome → CoachCode → app (coach view)
  The questionnaire itself lives on the website; Question is kept for
  Profile edits (one answer at a time).
*/
const OnboardingStack = () => (
  <OnboardingNavigator.Navigator screenOptions={horizontalSlide}>
    <OnboardingNavigator.Screen name="Welcome" component={WelcomeScreen} />
    <OnboardingNavigator.Screen name="SignIn" component={SignInScreen} />
    <OnboardingNavigator.Screen name="Question" component={QuestionScreen} />
    <OnboardingNavigator.Screen name="CoachCode" component={CoachCodeScreen} />
  </OnboardingNavigator.Navigator>
);

export default OnboardingStack;
