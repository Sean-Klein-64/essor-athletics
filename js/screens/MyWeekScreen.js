import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import SlideScreenContainer from "../components/SlideScreenContainer";
import UserContext from "../variables/context";
import myWeek from "../lib/myWeek";

/* Sean's own training week — coach view only (js/lib/myWeek.js) */

const MyWeekScreen = ({ navigation, route }) => {
  const {
    theme: { colors, typography },
  } = useContext(UserContext);
  const todayIndex = (new Date().getDay() + 6) % 7;

  return (
    <SlideScreenContainer title="Ma semaine" type="back" navigation={navigation} route={route} ignoreKeyboard>
      <ScrollView style={{ width: "100%" }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[typography.finePrint, styles.intro]}>Cycle jusqu’au Marathon de Bordeaux · visible seulement en mode coach</Text>
        {myWeek.map((d, i) => {
          const isToday = i === todayIndex;
          return (
            <View
              key={d.day}
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: isToday ? colors.accentText : colors.border },
                d.kind === "rest" && { opacity: 0.6 },
              ]}
            >
              <View style={styles.cardHead}>
                <Text style={[typography.finePrint, { fontSize: 13 }, isToday && { color: colors.accentText, opacity: 1 }]}>
                  {d.day}
                  {isToday ? "  ·  aujourd'hui" : ""}
                </Text>
                <Text style={[styles.kind, { color: colors.accentText }]}>{d.kind === "strength" ? "FORCE" : d.kind === "run" ? "COURSE" : "REPOS"}</Text>
              </View>
              <Text style={[typography.heading, typography.bold]}>{d.title}</Text>
              {d.lines.map((l, j) => (
                <Text key={j} style={[typography.finePrint, { fontSize: 14, lineHeight: 18 }]}>
                  {l}
                </Text>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 4, gap: 10, paddingBottom: 50 },
  intro: { fontSize: 14, marginBottom: 6 },
  card: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 4 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kind: { fontFamily: "DiatypePreTrial-Medium", fontSize: 11, letterSpacing: 0.8 },
});

export default MyWeekScreen;
