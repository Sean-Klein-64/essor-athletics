import React, { useState, useContext } from "react";
import { View, StyleSheet, Text } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Button from "../components/Button";
import Input from "../components/Input";
import Pressable from "../components/Pressable";
import ChoiceList from "../components/ChoiceList";

import onboarding from "../lib/onboarding";
import { parseDecimal } from "../lib/paces";
import UserContext from "../variables/context";

/*
  One question per screen, from js/lib/onboarding.js.
    Onboarding — route.params.index: saves, pushes the next question, and
      marks onboarding done after the last one (App.js then shows the app).
    Profile    — route.params.field: change one answer, then go back.
*/

const QuestionScreen = ({ navigation, route }) => {
  const {
    theme: { typography },
    preferences,
    setPreference,
    saveVma,
  } = useContext(UserContext);

  const isEdit = !!route.params?.field;
  const index = isEdit
    ? onboarding.findIndex((q) => q.field === route.params.field)
    : route.params?.index || 0;
  const question = onboarding[index];
  const stored = preferences[question.field];
  const [answer, setAnswer] = useState(
    stored === undefined ? "" : question.type === "vma" ? String(stored).replace(".", ",") : stored,
  );

  const isValid =
    question.type === "vma"
      ? !!parseDecimal(answer) && parseDecimal(answer) < 30
      : !!String(answer).trim();

  const finish = async () => {
    if (isEdit) return navigation.goBack();
    if (index + 1 >= onboarding.length) {
      await setPreference("onboarded", true);
    } else {
      navigation.push("Question", { index: index + 1 });
    }
  };

  const handleContinue = async () => {
    if (question.type === "vma") await saveVma(parseDecimal(answer), "typed");
    else await setPreference(question.field, question.type === "text" ? answer.trim() : answer);
    finish();
  };

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
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => isValid && handleContinue()}
          />
        )}

        {question.type === "vma" && (
          <Input
            autoFocus
            placeholder={question.placeholder}
            onChangeText={setAnswer}
            value={answer}
            keyboardType="decimal-pad"
          />
        )}

        {question.type === "choice" && (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            <ChoiceList options={question.options} value={answer} onChange={setAnswer} />
          </ScrollView>
        )}

        <View>
          <Text style={[typography.finePrint, styles.tip]}>{question.tip}</Text>
          <Button disabled={!isValid} onPress={handleContinue}>
            {isEdit ? "Enregistrer" : question.cta}
          </Button>
          {!!question.skip && !isEdit && (
            <Pressable onPress={finish} small>
              <Text style={[typography.finePrint, styles.skip]}>{question.skip}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: "space-between",
  },
  prompt: { textAlign: "center", paddingHorizontal: "10%", opacity: 0.5 },
  list: { width: "100%", marginVertical: 20 },
  tip: { textAlign: "center", paddingHorizontal: "8%", marginBottom: 10 },
  skip: { textAlign: "center", paddingVertical: 14 },
});

export default QuestionScreen;
