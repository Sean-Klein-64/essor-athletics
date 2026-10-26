import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import MainScreen from "../../screens/MainScreen";
import SessionScreen from "../../screens/SessionScreen";
import ProfileScreen from "../../screens/ProfileScreen";
import VmaScreen from "../../screens/VmaScreen";
import RecordScreen from "../../screens/RecordScreen";
import QuestionScreen from "../../screens/QuestionScreen";
import ProgrammeScreen from "../../screens/ProgrammeScreen";
import BeginnerSessionScreen from "../../screens/BeginnerSessionScreen";
import CoachCodeScreen from "../../screens/CoachCodeScreen";
import SessionEditorScreen from "../../screens/SessionEditorScreen";
import CoachSessionScreen from "../../screens/CoachSessionScreen";
import CoachAthleteScreen from "../../screens/CoachAthleteScreen";
import MyWeekScreen from "../../screens/MyWeekScreen";
import GoalScreen from "../../screens/GoalScreen";
import WeekScreen from "../../screens/WeekScreen";
import ObjectivesScreen from "../../screens/ObjectivesScreen";
import MyRaceScreen from "../../screens/MyRaceScreen";
import { horizontalSlide, verticalSlideModal } from "../screenOptions";

const AppNavigator = createStackNavigator();

/*
  The app once sign-up is done.
    Home             member view (next session…) or coach view (MainScreen)
    Session          one club session for your level ({ id })
    Profile          VMA, zones, records, name / level / FC max / coach / theme
    Vma              set the VMA, typed or from the 6' test ({ mode: "test" })
    Record           one distance's times ({ id: "10k" })
    Question         reopens a sign-up question ({ field })
    Programme        a Débuter programme in full ({ level })
    BeginnerSession  one walk-run session ({ level, index })
    CoachCode        unlock the coach view
    SessionEditor    coach: write / edit a club session ({ id })
    CoachSession     coach: the session hub — who's coming, their paces ({ id })
    CoachAthlete     coach: one runner in full ({ athlete, sessionId })
    MyWeek           coach: Sean's own week
    Goal             pick your race and goal time for the group goal
    Week             Levels 1–3: the other runs of the week around Friday
    Objectives       Mes objectifs: club race, own race, smaller goals
    MyRace           the runner's own race (name, city, date, distance, goal)
*/
const AppStack = () => (
  <AppNavigator.Navigator screenOptions={horizontalSlide}>
    <AppNavigator.Screen name="Home" component={MainScreen} />
    <AppNavigator.Screen name="Session" component={SessionScreen} options={verticalSlideModal} />
    <AppNavigator.Screen name="Profile" component={ProfileScreen} options={verticalSlideModal} />
    <AppNavigator.Screen name="Vma" component={VmaScreen} options={verticalSlideModal} />
    <AppNavigator.Screen name="Record" component={RecordScreen} options={verticalSlideModal} />
    <AppNavigator.Screen name="Question" component={QuestionScreen} options={verticalSlideModal} />
    <AppNavigator.Screen name="Programme" component={ProgrammeScreen} options={verticalSlideModal} />
    <AppNavigator.Screen name="BeginnerSession" component={BeginnerSessionScreen} options={verticalSlideModal} />
    <AppNavigator.Screen name="CoachCode" component={CoachCodeScreen} options={verticalSlideModal} />
    <AppNavigator.Screen name="SessionEditor" component={SessionEditorScreen} options={verticalSlideModal} />
    <AppNavigator.Screen name="CoachSession" component={CoachSessionScreen} options={verticalSlideModal} />
    <AppNavigator.Screen name="CoachAthlete" component={CoachAthleteScreen} />
    <AppNavigator.Screen name="MyWeek" component={MyWeekScreen} options={verticalSlideModal} />
    <AppNavigator.Screen name="Goal" component={GoalScreen} options={verticalSlideModal} />
    <AppNavigator.Screen name="Week" component={WeekScreen} options={verticalSlideModal} />
    <AppNavigator.Screen name="Objectives" component={ObjectivesScreen} options={verticalSlideModal} />
    <AppNavigator.Screen name="MyRace" component={MyRaceScreen} />
  </AppNavigator.Navigator>
);

export default AppStack;
