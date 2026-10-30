import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, Linking } from "react-native";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Button from "../components/Button";
import Input from "../components/Input";
import Pressable from "../components/Pressable";
import UserContext from "../variables/context";
import { syncMember, SITE_URL } from "../lib/member";

/*
  Members-only sign-in. The runner types the phone number and first name
  they gave in the website questionnaire; if Sean has given them app access,
  their name, level, start week, answers and VMA come straight in and the
  app opens. Otherwise we say what's missing:
    pending → questionnaire found, Sean hasn't opened their access yet
    none    → no questionnaire with that number: fill it in on the site first
*/

const SignInScreen = ({ navigation, route }) => {
  const ctx = useContext(UserContext);
  const { theme: { typography, colors }, preferences, setPreference } = ctx;
  const [phone, setPhone] = useState(preferences.member?.phone || "");
  const [first, setFirst] = useState(preferences.member?.first || "");
  const [state, setState] = useState(null); // null | "busy" | "pending" | "none" | "offline"

  const isValid = phone.replace(/\D/g, "").length >= 9 && first.trim().length > 0;

  const submit = async () => {
    setState("busy");
    try {
      const status = await syncMember(ctx, phone.trim(), first.trim(), { first: true });
      if (status === "ok") {
        if (!preferences.signedUp) await setPreference("signedUp", new Date().toISOString());
        await setPreference("onboarded", true); // App.js swaps to the app
      } else setState(status);
    } catch {
      setState("offline");
    }
  };

  const message = {
    pending: "Ton questionnaire est bien là. Sean ouvre ton accès dès que le Run Club est ajouté à ton abonnement — tu recevras un message.",
    none: "On ne trouve pas de questionnaire avec ce numéro et ce prénom. Vérifie-les, ou remplis le questionnaire sur le site : c'est par là que tout commence.",
    offline: "Pas de connexion pour l'instant. Réessaie dans un moment.",
  }[state];

  return (
    <SlideScreenContainer title="Connexion" type="back" navigation={navigation} route={route}>
      <View style={styles.body}>
        <View style={{ gap: 14, width: "100%" }}>
          <Text style={[typography.copy, styles.prompt]}>Ton numéro</Text>
          <Input
            autoFocus
            placeholder="06 …"
            onChangeText={(t) => { setPhone(t); setState(null); }}
            value={phone}
            keyboardType="phone-pad"
          />
          <Text style={[typography.copy, styles.prompt, { marginTop: 10 }]}>Ton prénom</Text>
          <Input
            placeholder="Prénom"
            onChangeText={(t) => { setFirst(t); setState(null); }}
            value={first}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={() => isValid && submit()}
          />
          {!!message && (
            <Text style={[typography.finePrint, styles.message, { color: state === "pending" ? colors.text : colors.accentText }]}>
              {message}
            </Text>
          )}
          {state === "none" && (
            <Pressable onPress={() => Linking.openURL(SITE_URL)} small>
              <Text style={[typography.heading, styles.link, { color: colors.accentText }]}>Remplir le questionnaire</Text>
            </Pressable>
          )}
        </View>
        <View style={{ width: "100%" }}>
          <Text style={[typography.finePrint, styles.tip]}>
            L’app est réservée aux adhérents d’Essor inscrits au Run Club. Le numéro et le prénom de ton questionnaire suffisent.
          </Text>
          <Button disabled={!isValid || state === "busy"} loading={state === "busy"} onPress={submit}>
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
  message: { textAlign: "center", opacity: 1, paddingHorizontal: "4%", marginTop: 6 },
  link: { textAlign: "center", paddingVertical: 8 },
  tip: { textAlign: "center", paddingHorizontal: "6%", marginBottom: 10 },
});

export default SignInScreen;
