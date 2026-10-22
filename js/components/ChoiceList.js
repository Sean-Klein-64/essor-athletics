import React, { useContext } from "react";
import { View, Text, StyleSheet } from "react-native";

import Pressable from "./Pressable";
import Glyph from "./Glyph";
import UserContext from "../variables/context";

/*
  A list of cards, one selectable. Options: { id, name, description }.
  Used for picking a level.
*/

const ChoiceList = ({ options, value, onChange }) => {
  const {
    theme: { colors, typography },
  } = useContext(UserContext);

  return (
    <View style={styles.list}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable key={option.id} onPress={() => onChange(option.id)}>
            <View
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[
                styles.card,
                {
                  backgroundColor: selected ? colors.accentSoft : colors.card,
                  borderColor: selected ? colors.accentText : colors.border,
                },
              ]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[typography.heading, typography.bold]}>{option.name}</Text>
                {!!option.description && (
                  <Text style={[typography.finePrint, { fontSize: 15 }]}>{option.description}</Text>
                )}
              </View>
              <View
                style={[
                  styles.check,
                  { backgroundColor: selected ? colors.accent : colors.border },
                ]}
              >
                {selected && <Glyph name="check" size={16} color="white" strokeWidth={2.4} />}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  list: { gap: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ChoiceList;
