import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";

import Pressable from "./Pressable";
import Glyph from "./Glyph";
import UserContext from "../variables/context";
import { BOOKING, WODIFY_HINT } from "../lib/config";
import { openWodify, openWodifySite } from "../lib/wodify";
import { bookingState, bookingRules } from "../lib/booking";
import { formatDay, todayKey } from "../lib/plan";

/*
  Booking the Friday session in Wodify: when and where, the button (or the
  day bookings open), the rules, and a "J'ai réservé" tick that's kept on
  this phone so the runner sees at a glance which Fridays are booked.
  No access to the class yet → the questionnaire comes first.
*/

const BookingCard = ({ session }) => {
  const { theme, preferences, setPreference } = useContext(UserContext);
  const { colors, typography } = theme;
  const booked = !!preferences.booked?.[session.id];
  const state = bookingState(session.date, todayKey(), booked);
  if (state.status === "past") return null;

  const setBooked = (value) => {
    const map = { ...(preferences.booked || {}) };
    if (value) map[session.id] = true;
    else delete map[session.id];
    setPreference("booked", map);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: booked ? colors.accent : colors.border }]}>
      <View style={styles.header}>
        <Glyph name={booked ? "check" : "bookmark"} size={18} color={colors.accentText} strokeWidth={2.2} />
        <View style={{ flex: 1 }}>
          <Text style={typography.heading}>
            {booked ? "Réservé sur Wodify" : "Réserve ta place"}
          </Text>
          <Text style={[typography.finePrint, { fontSize: 13 }]}>
            {formatDay(session.date)} · {BOOKING.time} · {BOOKING.place}
          </Text>
        </View>
      </View>

      {state.status === "open" && (
        <View style={{ gap: 6 }}>
          <Pressable onPress={() => openWodify()}>
            <View style={[styles.primary, { backgroundColor: colors.accent }]}>
              <Text style={[typography.heading, typography.bold, styles.primaryText]}>{"Réserver dans l'app Wodify"}</Text>
              <Glyph name="right" size={16} color="white" />
            </View>
          </Pressable>
          <Text style={[typography.finePrint, styles.hint]}>{WODIFY_HINT}</Text>
          <Pressable onPress={openWodifySite} small>
            <Text style={[typography.finePrint, styles.hint, { color: colors.accentText, opacity: 1 }]}>{"Pas l'app ? Réserver sur le site"}</Text>
          </Pressable>
        </View>
      )}

      {state.status === "soon" && (
        <View style={[styles.primary, { backgroundColor: colors.border }]}>
          <Text style={[typography.heading, styles.primaryText, { color: colors.text }]}>
            Réservations dès le {formatDay(state.opensOn)}
          </Text>
        </View>
      )}

      {state.status !== "soon" && (
        <Pressable onPress={() => setBooked(!booked)} small>
          <View style={[styles.tick, { borderColor: colors.border }]}>
            <View style={[styles.box, booked ? { backgroundColor: colors.accent, borderColor: colors.accent } : { borderColor: colors.border }]}>
              {booked && <Glyph name="check" size={12} color="white" strokeWidth={2.8} />}
            </View>
            <Text style={[typography.finePrint, { opacity: 1, fontSize: 14 }]}>
              {booked ? "C'est noté. Touche pour annuler la coche." : "J'ai réservé"}
            </Text>
          </View>
        </Pressable>
      )}

      <Text style={[typography.finePrint, styles.rules]}>{bookingRules()}</Text>
      {!booked && (
        <Text style={[typography.finePrint, styles.rules]}>
          Le cours n’apparaît pas dans Wodify ? Il faut d’abord remplir le questionnaire : Sean t’ouvre l’accès ensuite.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  primary: { height: 48, borderRadius: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { fontSize: 17, color: "white" },
  tick: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  box: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  rules: { fontSize: 12, lineHeight: 16 },
  hint: { fontSize: 13, textAlign: "center" },
});

export default BookingCard;
