import React, { useContext, useState } from "react";
import { View, Text, StyleSheet } from "react-native";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Button from "../components/Button";
import Input from "../components/Input";
import Pressable from "../components/Pressable";
import UserContext from "../variables/context";

import { parseDecimal, vmaFromSixMinutes } from "../lib/paces";
import { formatShortDate } from "../lib/plan";

/*
  Set the VMA two ways:
    "km/h"    — typed straight in
    "Test 6'" — the distance from the 6-minute test; ÷ 100 gives the VMA
  Opens on the test when route.params.mode === "test" (from the test session).
*/

const Tab = ({ id, label, mode, onSelect, colors, typography }) => {
  const selected = mode === id;
  return (
    <Pressable small onPress={() => onSelect(id)}>
      <View
        style={[
          styles.tab,
          selected
            ? { backgroundColor: colors.accent, borderColor: colors.accent }
            : { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[typography.heading, typography.bold, { fontSize: 15, color: selected ? "white" : colors.text }]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
};

const VmaScreen = ({ navigation, route }) => {
  const {
    theme: { colors, typography },
    preferences,
    saveVma,
  } = useContext(UserContext);
  const [mode, setMode] = useState(route.params?.mode === "test" ? "test" : "typed");
  const [text, setText] = useState("");

  const number = parseDecimal(text);
  const vma = mode === "test" ? (number ? vmaFromSixMinutes(number) : null) : number;
  const isValid = !!vma && vma >= 6 && vma < 30;
  const history = [...(preferences.vmaHistory || [])].reverse().slice(0, 5);

  const save = async () => {
    await saveVma(vma, mode === "test" ? "test" : "typed");
    navigation.goBack();
  };

  const select = (id) => {
    setMode(id);
    setText("");
  };

  return (
    <SlideScreenContainer title="VMA" type="back" navigation={navigation} route={route}>
      <View style={styles.body}>
        <View style={{ gap: 16, width: "100%" }}>
          <View style={styles.tabs}>
            <Tab id="typed" label="Je la connais" mode={mode} onSelect={select} colors={colors} typography={typography} />
            <Tab id="test" label="Test 6'" mode={mode} onSelect={select} colors={colors} typography={typography} />
          </View>
          <Text style={[typography.copy, styles.prompt]}>
            {mode === "test" ? "Combien de mètres en 6 minutes ?" : "Ta VMA en km/h"}
          </Text>
          <Input
            key={mode}
            autoFocus
            placeholder={mode === "test" ? "mètres" : "km/h"}
            onChangeText={setText}
            value={text}
            keyboardType={mode === "test" ? "number-pad" : "decimal-pad"}
          />
          {mode === "test" && (
            <Text style={[typography.heading, styles.result, { color: colors.accentText }]}>
              {isValid ? `VMA ${String(vma).replace(".", ",")} km/h` : " "}
            </Text>
          )}
          {!!history.length && (
            <View style={styles.history}>
              {history.map((h, i) => (
                <Text key={i} style={[typography.finePrint, { fontSize: 14, textAlign: "center" }]}>
                  {formatShortDate(h.date)} · {String(h.value).replace(".", ",")} km/h
                  {h.source === "test" ? " · test" : ""}
                </Text>
              ))}
            </View>
          )}
        </View>
        <View style={{ width: "100%" }}>
          <Text style={[typography.finePrint, styles.tip]}>
            {mode === "test"
              ? "La distance en mètres ÷ 100 = ta VMA. 1\u00A0550 m → 15,5 km/h."
              : "Toutes les allures de tes séances se recalculent dessus."}
          </Text>
          <Button disabled={!isValid} onPress={save}>
            Enregistrer
          </Button>
        </View>
      </View>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, width: "100%", padding: 20, justifyContent: "space-between" },
  tabs: { flexDirection: "row", gap: 8, justifyContent: "center" },
  tab: { height: 38, paddingHorizontal: 16, borderRadius: 19, borderWidth: 1, justifyContent: "center" },
  prompt: { textAlign: "center", opacity: 0.5 },
  result: { textAlign: "center" },
  history: { gap: 2, marginTop: 8 },
  tip: { textAlign: "center", paddingHorizontal: "8%", marginBottom: 10 },
});

export default VmaScreen;
