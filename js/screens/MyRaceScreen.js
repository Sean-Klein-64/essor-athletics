import React, { useContext, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Button from "../components/Button";
import Input from "../components/Input";
import Pressable from "../components/Pressable";
import UserContext from "../variables/context";

import { RACE_DISTANCES, parseDayKey, daysBetween, vmaRaceSeconds, goalLine, AFTER_DAYS } from "../lib/objectives";
import { photoQueryFor } from "../lib/photo";
import { parseClock, parseDecimal, formatClock } from "../lib/paces";
import { formatShortDate, todayKey } from "../lib/plan";
import { reportProgress } from "../lib/member";

/*
  Ma course — the runner's own race: name, city, date, distance, goal time.
  Saved as preferences.myRace = { name, place, date, metres, seconds, photoQuery }.
  The Home countdown follows it while it's coming up.
*/

const MyRaceScreen = ({ navigation, route }) => {
  const {
    theme: { colors, typography },
    preferences: p,
    setPreference,
  } = useContext(UserContext);
  const saved = p.myRace || {};
  const savedPreset = RACE_DISTANCES.find((d) => saved.metres && Math.abs(d.metres - saved.metres) < 1);

  const [name, setName] = useState(saved.name || "");
  const [place, setPlace] = useState(saved.place || "");
  const [date, setDate] = useState(saved.date ? formatShortDate(saved.date) : "");
  const [distanceId, setDistanceId] = useState(savedPreset?.id || (saved.metres ? "other" : "10k"));
  const [km, setKm] = useState(!savedPreset && saved.metres ? String(saved.metres / 1000).replace(".", ",") : "");
  const [time, setTime] = useState(saved.seconds ? formatClock(saved.seconds) : "");
  const [photoWords, setPhotoWords] = useState(saved.photoQuery || "");

  const preset = RACE_DISTANCES.find((d) => d.id === distanceId);
  const kmValue = parseDecimal(km);
  const metres = preset ? preset.metres : kmValue && kmValue > 0 && kmValue <= 200 ? Math.round(kmValue * 1000) : null;
  const dateKey = parseDayKey(date);
  const days = dateKey ? daysBetween(todayKey(), dateKey) : null;
  const seconds = time.trim() ? parseClock(time) : null;
  const timeOk = !time.trim() || (!!seconds && seconds >= 300);
  const suggested = metres ? vmaRaceSeconds(metres, p.vma) : null;

  const problems = [
    !name.trim() && "le nom",
    !dateKey && "la date (JJ/MM/AAAA)",
    dateKey && days < -AFTER_DAYS && "une date à venir",
    !metres && "la distance",
    !timeOk && "un temps valide (ex. 45:00)",
  ].filter(Boolean);
  const isValid = !problems.length;

  const save = async () => {
    const myRace = {
      name: name.trim(),
      place: place.trim(),
      date: dateKey,
      metres,
      seconds: seconds || null,
      photoQuery: photoWords.trim() || null,
    };
    await setPreference("myRace", myRace);
    reportProgress({ ...p, myRace });
    navigation.goBack();
  };

  const remove = async () => {
    await setPreference("myRace", null);
    reportProgress({ ...p, myRace: null });
    navigation.goBack();
  };

  const label = (text) => <Text style={[typography.finePrint, styles.label]}>{text}</Text>;

  return (
    <SlideScreenContainer title="Ma course" type="back" navigation={navigation} route={route}>
      <ScrollView style={{ width: "100%" }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {label("La course")}
        <Input compact placeholder="Marathon de Rome" value={name} onChangeText={setName} autoCapitalize="words" />
        {label("Ville")}
        <Input compact placeholder="Rome" value={place} onChangeText={setPlace} autoCapitalize="words" />
        {label("Date")}
        <Input compact placeholder="22/03/2027" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" />
        {days != null && days >= 0 && <Text style={[typography.finePrint, styles.help]}>{days === 0 ? "C'est aujourd'hui !" : `Dans ${days} jours`}</Text>}

        {label("Distance")}
        <View style={styles.tabs}>
          {[...RACE_DISTANCES, { id: "other", name: "Autre" }].map((d) => {
            const on = d.id === distanceId;
            return (
              <Pressable key={d.id} small onPress={() => setDistanceId(d.id)}>
                <View style={[styles.tab, on ? { backgroundColor: colors.accent, borderColor: colors.accent } : { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[typography.heading, typography.bold, { fontSize: 15, color: on ? "white" : colors.text }]}>{d.name}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        {distanceId === "other" && <Input compact placeholder="15 (km)" value={km} onChangeText={setKm} keyboardType="decimal-pad" />}

        {label("Objectif (facultatif)")}
        <Input compact placeholder={suggested ? formatClock(suggested) : "45:00"} value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" />
        <Text style={[typography.finePrint, styles.help]}>
          {seconds && metres ? goalLine(metres, seconds) : suggested ? `Ta VMA dit ${formatClock(suggested)}` : p.vma ? " " : "Ajoute ta VMA pour une suggestion"}
        </Text>
        {!!suggested && !time.trim() && (
          <Pressable small onPress={() => setTime(formatClock(suggested))}>
            <Text style={[typography.finePrint, styles.help, { color: colors.accentText, opacity: 1 }]}>Utiliser {formatClock(suggested)}</Text>
          </Pressable>
        )}

        {label("Mots pour la photo (facultatif)")}
        <Input compact placeholder={photoQueryFor({ place, name }) || "Rome Colosseum"} value={photoWords} onChangeText={setPhotoWords} />
        <Text style={[typography.finePrint, styles.help]}>La photo du compte à rebours est cherchée avec ces mots.</Text>

        <Button disabled={!isValid} onPress={save}>
          Enregistrer ma course
        </Button>
        {!isValid && (name || date) ? <Text style={[typography.finePrint, styles.help]}>Il manque {problems.join(", ")}.</Text> : null}
        {!!p.myRace && (
          <Pressable small onPress={remove}>
            <Text style={[typography.finePrint, styles.help, { opacity: 1, color: "#C0392B", paddingVertical: 10 }]}>Retirer ma course</Text>
          </Pressable>
        )}
      </ScrollView>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  body: { padding: 20, paddingTop: 4, gap: 6, paddingBottom: 80 },
  label: { fontSize: 13, marginTop: 12, marginLeft: 6 },
  help: { fontSize: 13, textAlign: "center" },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 6 },
  tab: { height: 38, paddingHorizontal: 16, borderRadius: 19, borderWidth: 1, justifyContent: "center" },
});

export default MyRaceScreen;
