import React, { useContext, useState } from "react";
import { View, Text, StyleSheet } from "react-native";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Button from "../components/Button";
import Input from "../components/Input";
import UserContext from "../variables/context";
import { COACH_CODE } from "../lib/config";

/*
  Coach sign-in: the coach code (js/lib/config.js) and a first name.
  Unlocks the coach view; the member view stays a tap away.
  Also opened from Profile → "Mode coach" for someone who signed up as a member.
*/

const CoachCodeScreen = ({ navigation, route }) => {
  const {
    theme: { typography, colors },
    preferences,
    setPreference,
  } = useContext(UserContext);
  const [code, setCode] = useState("");
  const [name, setName] = useState(preferences.name || "");
  const [wrong, setWrong] = useState(false);
  const needsName = !preferences.name;
  const isValid = code.trim().length > 0 && (!needsName || name.trim().length > 0);

  const submit = async () => {
    if (code.trim().toLowerCase() !== COACH_CODE.toLowerCase()) return setWrong(true);
    if (needsName) await setPreference("name", name.trim());
    await setPreference("coach", true);
    await setPreference("view", "coach");
    if (!preferences.onboarded) await setPreference("onboarded", true);
    else navigation.goBack();
  };

  return (
    <SlideScreenContainer title="Coach" type="back" navigation={navigation} route={route}>
      <View style={styles.body}>
        <View style={{ gap: 14, width: "100%" }}>
          <Text style={[typography.copy, styles.prompt]}>Le code coach</Text>
          <Input
            autoFocus
            placeholder="Code"
            onChangeText={(t) => {
              setCode(t);
              setWrong(false);
            }}
            value={code}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          {needsName && (
            <>
              <Text style={[typography.copy, styles.prompt, { marginTop: 10 }]}>Ton prénom</Text>
              <Input placeholder="Prénom" onChangeText={setName} value={name} autoCapitalize="words" autoCorrect={false} />
            </>
          )}
          {wrong && <Text style={[typography.finePrint, styles.wrong, { color: colors.accentText }]}>Ce n’est pas le bon code.</Text>}
        </View>
        <View style={{ width: "100%" }}>
          <Text style={[typography.finePrint, styles.tip]}>
            Le mode coach permet d’écrire les séances et de voir ta propre semaine. Tu peux basculer en vue membre quand tu veux.
          </Text>
          <Button disabled={!isValid} onPress={submit}>
            Entrer
          </Button>
        </View>
      </View>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, width: "100%", padding: 20, justifyContent: "space-between" },
  prompt: { textAlign: "center", opacity: 0.5 },
  wrong: { textAlign: "center", opacity: 1 },
  tip: { textAlign: "center", paddingHorizontal: "6%", marginBottom: 10 },
});

export default CoachCodeScreen;
