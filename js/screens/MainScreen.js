import React, { useContext } from "react";

import HomeScreen from "./HomeScreen";
import CoachHomeScreen from "./CoachHomeScreen";
import UserContext from "../variables/context";

/*
  "Home": the member view, or the coach view for a coach who hasn't
  switched to "Vue membre" (preferences.view).
*/
const MainScreen = (props) => {
  const { preferences } = useContext(UserContext);
  const coachView = !!preferences.coach && preferences.view !== "member";
  return coachView ? <CoachHomeScreen {...props} /> : <HomeScreen {...props} />;
};

export default MainScreen;
