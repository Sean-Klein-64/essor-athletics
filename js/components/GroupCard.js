import React, { useContext } from "react";
import { View, Text, StyleSheet, Linking } from "react-native";

import Pressable from "./Pressable";
import Glyph from "./Glyph";
import SectionLabel from "./SectionLabel";
import UserContext from "../variables/context";
import { COMMUNITY } from "../lib/config";

/*
  "Le groupe" — the two places the club lives outside the app: the WhatsApp
  group (where people talk) and the Strava club (where the runs get posted).
  One button each; a link left empty in config isn't shown, and the card
  disappears when both are.
*/

const LINKS = [
  { key: "whatsapp", title: "Groupe WhatsApp", sub: "Les infos de la semaine, les photos, qui court quand", action: "Rejoindre" },
  { key: "strava", title: "Club Strava", sub: "Poste tes sorties au club — on les voit tous", action: "Rejoindre" },
];

const GroupCard = () => {
  const { theme } = useContext(UserContext);
  const { colors, typography } = theme;
  const links = LINKS.filter((l) => COMMUNITY[l.key]);
  if (!links.length) return null;

  return (
    <View style={styles.section}>
      <SectionLabel>Le groupe</SectionLabel>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {links.map((l, i) => (
          <Pressable key={l.key} onPress={() => Linking.openURL(COMMUNITY[l.key]).catch(() => {})} animation={false}>
            <View style={[styles.row, i < links.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[typography.heading, typography.bold]}>{l.title}</Text>
                <Text style={[typography.finePrint, { fontSize: 13 }]}>{l.sub}</Text>
              </View>
              <View style={[styles.button, { borderColor: colors.accent }]}>
                <Text style={[typography.heading, typography.bold, { fontSize: 14, color: colors.accentText }]}>{l.action}</Text>
                <Glyph name="right" size={14} color={colors.accentText} strokeWidth={2.4} />
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { gap: 10 },
  card: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  button: { flexDirection: "row", alignItems: "center", gap: 4, height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1 },
});

export default GroupCard;
