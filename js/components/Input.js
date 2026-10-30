import React, { useContext, useState, forwardRef } from "react";
import { StyleSheet, TextInput } from "react-native";

import UserContext from "../variables/context";

const Input = forwardRef(
  (
    {
      label,
      placeholder,
      onChangeText,
      value,
      type,
      note,
      error,
      disabled,
      autoCapitalize,
      secureTextEntry,
      keyboardType,
      onFocus,
      returnKeyLabel,
      returnKeyType,
      onSubmitEditing,
      autoCorrect,
      enablesReturnKeyAutomatically,
      autoFocus,
      compact,
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState();
    const {
      theme: { colors },
    } = useContext(UserContext);

    return (
      <TextInput
        ref={ref}
        style={[
          styles.inputContainer,
          compact && { marginHorizontal: 0, marginTop: 6, paddingVertical: 8, fontSize: 20 },
          {
            color: colors.text,
            backgroundColor: colors.card,
            borderColor: isFocused ? colors.border : "transparent",
          },
        ]}
        autoFocus={autoFocus}
        onChangeText={onChangeText}
        value={value}
        editable={!disabled}
        placeholder={placeholder}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        placeholderTextColor={"grey"}
        type={type}
        returnKeyType={returnKeyType}
        enablesReturnKeyAutomatically={true}
        onSubmitEditing={onSubmitEditing}
        autoCorrect={autoCorrect}
        textAlign="center"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    );
  },
);

const styles = StyleSheet.create({
  inputContainer: {
    marginTop: 10,
    marginHorizontal: 30,
    paddingHorizontal: 12,
    alignSelf: "stretch",
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    fontSize: 24,
  },
  label: {
    fontSize: 16,
    marginBottom: 2,
  },
  input: {
    fontSize: 24,
    padding: 0,
  },
  noteContainer: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});

Input.displayName = "Input";

export default Input;
