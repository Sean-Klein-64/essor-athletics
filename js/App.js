import React, { useEffect, useRef, useState } from "react";
import { useColorScheme, StatusBar, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import OnboardingStack from "./navigation/stacks/OnboardingStack";
import AppStack from "./navigation/stacks/AppStack";
import UserContext from "./variables/context";
import { todayKey } from "./lib/plan";

const LoadingScreen = () => <View style={{ flex: 1, backgroundColor: "black" }} />;

/*
  Programme's theme, with Essor's vert sapin as the accent instead of
  Programme blue. `accent` fills buttons (white text on top);
  `accentText` is the accent used as text/icon colour, lighter in dark mode
  so it still reads on near-black.
*/
function Theme(dark, background, card, border) {
  this.dark = dark;
  this.contrast = dark ? [0.6, 0.75] : [0.5, 0.75];
  this.colors = {
    background,
    card,
    border,
    text: dark ? "white" : "black",
    accent: dark ? "#2C6B51" : "#1E4D3A",
    accentText: dark ? "#7CC4A2" : "#1E4D3A",
    accentSoft: dark ? "rgba(124,196,162,0.14)" : "rgba(30,77,58,0.08)",
  };
  this.typography = {
    title: {
      fontSize: 28,
      letterSpacing: -0.8,
      lineHeight: 28 * 1.2,
      fontFamily: "DiatypePre-Regular",
      color: this.colors.text,
    },
    body: {
      fontSize: 24,
      letterSpacing: -0.6,
      lineHeight: 24 * 1.2,
      fontFamily: "DiatypePre-Regular",
      color: this.colors.text,
    },
    heading: {
      fontSize: 18,
      letterSpacing: -0.6,
      lineHeight: 18 * 1.2,
      fontFamily: "DiatypePre-Regular",
      color: this.colors.text,
    },
    copy: {
      fontSize: 20,
      letterSpacing: -0.4,
      lineHeight: 20 * 1.3,
      fontFamily: "DiatypePre-Regular",
      color: this.colors.text,
    },
    finePrint: {
      fontSize: 16,
      letterSpacing: -0.2,
      lineHeight: 16 * 1.3,
      fontFamily: "DiatypePre-Regular",
      color: this.colors.text,
      opacity: this.contrast[0],
    },
    bold: { fontFamily: "DiatypePreTrial-Medium" },
    mono: { fontFamily: "ABCDiatypeMonoTrial-Regular", letterSpacing: -0.6 },
  };
}

const themes = {
  light: new Theme(false, "#FAFAF8", "#FFFFFF", "#EFEFEB"),
  dark: new Theme(true, "#0A0A0A", "#1A1A1A", "#202020"),
};

const RootNavigator = createStackNavigator();

/*
  Everything lives on the phone (AsyncStorage) — no account yet.
  Shape:
    name, level, runContinuous, runsPerWeek, fiveK, races, injury,
    injuryDetail, goal          the sign-up questionnaire (js/lib/onboarding.js)
    hrMax                       max heart rate, optional (zones show bpm)
    programme: { [levelId]: index }   where a Débuter runner is in their programme
    coach, view                 coach unlocked; "coach" | "member" view
    coachSessions: { [id]: session }  sessions a coach wrote on this phone
    vma                         current VMA in km/h (or undefined)
    vmaHistory: [{ value, date, source: "typed" | "test" }]
    records: { "10k": [{ seconds, date }] }   see js/lib/records.js
    done: { [sessionId]: "YYYY-MM-DD" }
    going: { [sessionId]: true }   "Je viens", mirrored to the shared list
    deviceId                    random id that stands in for an account
    onboarded
*/
const PREFERENCES_KEY = "preferences";
const DEFAULT_PREFERENCES = { records: {}, vmaHistory: [], done: {}, going: {} };

const newDeviceId = () =>
  `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [selectedTheme, setSelectedTheme] = useState();
  const systemTheme = useColorScheme();

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
      const loaded = raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES;
      if (!loaded.deviceId) {
        loaded.deviceId = newDeviceId();
        await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(loaded));
      }
      setPreferences(loaded);
      setSelectedTheme(await AsyncStorage.getItem("theme"));
      setIsLoading(false);
    })();
  }, []);

  // Kept in a ref so two quick saves in a row don't overwrite each other
  const latest = useRef(preferences);
  latest.current = preferences;

  const setPreference = async (key, value) => {
    const next = { ...latest.current, [key]: value };
    latest.current = next;
    setPreferences(next);
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
  };

  /* A new VMA becomes the current one and joins the history */
  const saveVma = async (value, source = "typed", date = todayKey()) => {
    const history = [...(latest.current.vmaHistory || []), { value, date, source }];
    await setPreference("vmaHistory", history);
    await setPreference("vma", value);
  };

  /* Log a race / time trial for one distance */
  const saveRecord = async (distanceId, seconds, date = todayKey()) => {
    const records = latest.current.records || {};
    await setPreference("records", {
      ...records,
      [distanceId]: [...(records[distanceId] || []), { seconds, date }],
    });
  };

  const removeRecord = async (distanceId, entry) => {
    const records = latest.current.records || {};
    await setPreference("records", {
      ...records,
      [distanceId]: (records[distanceId] || []).filter(
        (e) => !(e.seconds === entry.seconds && e.date === entry.date),
      ),
    });
  };

  const setTheme = async (newTheme) => {
    setSelectedTheme(newTheme || undefined);
    if (newTheme) AsyncStorage.setItem("theme", newTheme);
    else AsyncStorage.removeItem("theme");
  };

  const dark = (selectedTheme || systemTheme) === "dark";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={{ colors: { background: "black" } }}>
          <StatusBar
            translucent
            backgroundColor="transparent"
            barStyle={dark ? "light-content" : "dark-content"}
          />
          <UserContext.Provider
            value={{
              preferences,
              setPreference,
              saveVma,
              saveRecord,
              removeRecord,
              theme: dark ? themes.dark : themes.light,
              selectedTheme,
              setTheme,
            }}
          >
            <RootNavigator.Navigator screenOptions={{ headerShown: false, animationEnabled: false }}>
              {isLoading ? (
                <RootNavigator.Screen name="LoadingStack" component={LoadingScreen} />
              ) : preferences.onboarded ? (
                <RootNavigator.Screen name="AppStack" component={AppStack} />
              ) : (
                <RootNavigator.Screen name="OnboardingStack" component={OnboardingStack} />
              )}
            </RootNavigator.Navigator>
          </UserContext.Provider>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
