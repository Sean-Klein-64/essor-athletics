import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import HomeScreen from "../../screens/HomeScreen";
import SessionScreen from "../../screens/SessionScreen";
import ProfileScreen from "../../screens/ProfileScreen";
import VmaScreen from "../../screens/VmaScreen";
import RecordScreen from "../../screens/RecordScreen";
import QuestionScreen from "../../screens/QuestionScreen";
import { horizontalSlide, verticalSlideModal } from "../screenOptions";

const AppNavigator = createStackNavigator();

/*
  The app once onboarding is done.
    Home      next session, what's coming, what's done
    Session   one session in full for your level ({ id })
    Profile   VMA, paces, records, name / level / theme
    Vma       set the VMA, typed or from the 6' test ({ mode: "test" })
    Record    one distance's times ({ id: "10k" })
    Question  reopens a first-run question to change it ({ field })
*/

const AppStack = () => (
  <AppNavigator.Navigator screenOptions={horizontalSlide}>
    <AppNavigator.Screen name="Home" component={HomeScreen} />
    <AppNavigator.Screen name="Session" component={SessionScreen} options={verticalSlideModal} />
    <AppNavigator.Screen name="Profile" component={ProfileScreen} options={verticalSlideModal} />
    <AppNavigator.Screen name="Vma" component={VmaScreen} options={verticalSlideModal} />
    <AppNavigator.Screen name="Record" component={RecordScreen} options={verticalSlideModal} />
    <AppNavigator.Screen name="Question" component={QuestionScreen} options={verticalSlideModal} />
  </AppNavigator.Navigator>
);

export default AppStack;
