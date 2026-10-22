import React, { useState, useContext } from "react";
import { View, StyleSheet, Text } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Button from "../components/Button";
import Input from "../components/Input";
import Pressable from "../components/Pressable";
import ChoiceList from "../components/ChoiceList";

import onboarding, { findQuestion, nextIndex } from "../lib/onboarding";
import { parseDecimal } from "../lib/paces";
import UserContext from "../variables/context";

/*
  One question per screen, from js/lib/onboarding.js (the sign-up
  questionnaire, then level and VMA).
    Onboarding — route.params.index: saves, pushes the next question, and
      marks onboarding done after the last one (App.js then shows the app).
    Profile    — route.params.field: change one answer, then go back.
*/

const QuestionScreen = ({ navigation, route }) => {
  const {
    theme: { typography, colors },
    preferences,
    setPreference,
    saveVma,
  } = useContext(UserContext);

  const isEdit = !!route.params?.field;
  const index = isEdit ? -1 : route.params?.index || 0;
  const question = isEdit ? findQuestion(route.params.field) : onboarding[index];
  const stored = preferences[question.field];
  const suggested = question.suggest && stored === undefined ? question.suggest(preferences) : undefined;
  const [answer, setAnswer] = useState(
    stored === undefined
      ? (suggested ?? "")
      : question.type === "vma"
        ? String(stored).replace(".", ",")
        : stored,
  );

  const isValid =
    question.type === "vma"
      ? !!parseDecimal(answer) && parseDecimal(answer) < 30
      : question.type === "bpm"
        ? Number(answer) >= 120 && Number(answer) <= 230
        : !!String(answer).trim();

  const finish = async (answers) => {
    if (isEdit) return navigation.goBack();
    const next = nextIndex(index, answers);
    if (next >= onboarding.length) {
      await setPreference("signedUp", new Date().toISOString());
      await setPreference("onboarded", true);
    } else {
      navigation.push("Question", { index: next });
    }
  };

  const handleContinue = async () => {
    let value = answer;
    if (question.type === "vma") {
      value = parseDecimal(answer);
      await saveVma(value, "typed");
    } else {
      if (question.type === "bpm") value = Number(answer);
      if (question.type === "text") value = answer.trim();
      await setPreference(question.field, value);
    }
    finish({ ...preferences, [question.field]: value });
  };

  const skip = async () => {
    if (question.type === "text") await setPreference(question.field, "");
    finish(preferences);
  };

  const tip = suggested && question.suggestTip ? question.suggestTip(suggested) : question.tip;

  return (
    <SlideScreenContainer
      title={question.title}
      type={index > 0 || isEdit ? "back" : undefined}
      navigation={navigation}
      route={route}
      ignoreKeyboard={question.type === "choice"}
    >
      <View style={styles.body}>
        <Text style={[typography.copy, styles.prompt]}>{question.prompt}</Text>

        {question.type === "text" && (
          <Input
            autoFocus
            placeholder={question.placeholder}
            onChangeText={setAnswer}
            value={answer}
            autoCapitalize={question.field === "name" ? "words" : "sentences"}
            autoCorrect={question.field !== "name"}
            returnKeyType="next"
            onSubmitEditing={() => isValid && handleContinue()}
          />
        )}

        {question.type === "vma" && (
          <Input autoFocus placeholder={question.placeholder} onChangeText={setAnswer} value={answer} keyboardType="decimal-pad" />
        )}

        {question.type === "bpm" && (
          <Input
            autoFocus
            placeholder={question.placeholder}
            onChangeText={setAnswer}
            value={answer === undefined ? "" : String(answer)}
            keyboardType="number-pad"
          />
        )}

        {question.type === "choice" && (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            <ChoiceList options={question.options} value={answer} onChange={setAnswer} />
          </ScrollView>
        )}

        <View>
          <Text style={[typography.finePrint, styles.tip, suggested && { color: colors.accentText, opacity: 1 }]}>{tip}</Text>
          <Button disabled={!isValid} onPress={handleContinue}>
            {isEdit ? "Enregistrer" : question.cta}
          </Button>
          {!!question.skip && !isEdit && (
            <Pressable onPress={skip} small>
              <Text style={[typography.finePrint, styles.skip]}>{question.skip}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, width: "100%", paddingHorizontal: 20, paddingVertical: 20, justifyContent: "space-between" },
  prompt: { textAlign: "center", paddingHorizontal: "6%", opacity: 0.5 },
  list: { width: "100%", marginVertical: 20 },
  tip: { textAlign: "center", paddingHorizontal: "8%", marginBottom: 10 },
  skip: { textAlign: "center", paddingVertical: 14 },
});

export default QuestionScreen;
