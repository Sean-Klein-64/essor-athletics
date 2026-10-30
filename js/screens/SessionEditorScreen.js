import React, { useContext, useState } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Button from "../components/Button";
import Pressable from "../components/Pressable";
import Glyph from "../components/Glyph";
import SectionLabel from "../components/SectionLabel";
import UserContext from "../variables/context";

import useSessions from "../lib/store";
import { describeStep, formatShortDate } from "../lib/plan";
import {
  newBloc, blocsToSteps, stepsToBlocs, KINDS, slug, parseDate, STANDARD_WARMUP, STANDARD_COOLDOWN,
} from "../lib/editor";

/*
  Coach: write or edit a club session. Title, date, type, one line of
  summary, then the main set for each level as blocs (N × distance or
  time at % VMA, recovery). Warm-up and cool-down are the standard ones.
  A session written in the file with steps the builder can't show (walks,
  tests, nested sets) keeps its steps; only the top part is editable.
*/

const CLUB = ["level1", "level2", "level3"];
const NAMES = { level1: "Level 1", level2: "Level 2", level3: "Level 3" };

const Field = ({ value, onChange, width = 56, keyboardType = "number-pad", colors, placeholder }) => (
  <TextInput
    value={String(value ?? "")}
    onChangeText={onChange}
    keyboardType={keyboardType}
    placeholder={placeholder}
    placeholderTextColor="grey"
    style={[styles.field, { width, color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
    textAlign="center"
  />
);

const SessionEditorScreen = ({ navigation, route }) => {
  const { theme, preferences } = useContext(UserContext);
  const { colors, typography } = theme;
  const { byId, save, shared } = useSessions();
  const existing = route.params?.id ? byId(route.params.id) : null;

  const [title, setTitle] = useState(existing?.title || "");
  const [date, setDate] = useState(existing ? formatShortDate(existing.date) : "");
  const [kind, setKind] = useState(existing?.kind || "pyramid");
  const [summary, setSummary] = useState(existing?.summary || "");
  const [blocs, setBlocs] = useState(() =>
    Object.fromEntries(
      CLUB.map((l) => {
        const steps = existing?.levels?.[l];
        const parsed = steps ? stepsToBlocs(steps) : [newBloc()];
        return [l, parsed];
      }),
    ),
  );
  const [saving, setSaving] = useState(false);

  const dateKey = parseDate(date);
  const isValid = title.trim().length > 0 && !!dateKey;

  const update = (level, i, key, value) =>
    setBlocs((b) => ({ ...b, [level]: b[level].map((bloc, j) => (j === i ? { ...bloc, [key]: value } : bloc)) }));
  const add = (level) => setBlocs((b) => ({ ...b, [level]: [...b[level], { ...(b[level][b[level].length - 1] || newBloc()) }] }));
  const remove = (level, i) => setBlocs((b) => ({ ...b, [level]: b[level].filter((_, j) => j !== i) }));
  const copyDown = () => setBlocs((b) => ({ ...b, level2: b.level1.map((x) => ({ ...x })), level3: b.level1.map((x) => ({ ...x })) }));

  const submit = async () => {
    setSaving(true);
    const levels = { ...(existing?.levels || {}) };
    CLUB.forEach((l) => {
      if (blocs[l]) levels[l] = blocsToSteps(blocs[l]);
    });
    await save({
      id: existing?.id || `${dateKey}-${slug(title) || "seance"}`,
      date: dateKey,
      title: title.trim(),
      kind,
      summary: summary.trim(),
      warmup: existing?.warmup || STANDARD_WARMUP,
      cooldown: existing?.cooldown || STANDARD_COOLDOWN,
      levels,
    });
    setSaving(false);
    navigation.goBack();
  };

  const preview = (level) =>
    blocs[level]
      ? blocsToSteps(blocs[level]).map((s) => describeStep(s, preferences.vma || 15))
      : (existing?.levels?.[level] || []).map((s) => describeStep(s, preferences.vma || 15));

  return (
    <SlideScreenContainer title={existing ? "Modifier" : "Nouvelle séance"} type="back" navigation={navigation} route={route}>
      <ScrollView style={{ width: "100%" }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Titre — Pyramide, 30/30, 1 km…"
            placeholderTextColor="grey"
            style={[styles.title, { color: colors.text }]}
          />
          <View style={styles.line}>
            <Text style={[typography.finePrint, { flex: 1 }]}>Date</Text>
            <Field value={date} onChange={setDate} width={120} keyboardType="numbers-and-punctuation" placeholder="JJ/MM/AAAA" colors={colors} />
          </View>
          <View style={styles.kinds}>
            {KINDS.map((k) => (
              <Pressable key={k.id} small onPress={() => setKind(k.id)}>
                <View style={[styles.chip, kind === k.id ? { backgroundColor: colors.accent, borderColor: colors.accent } : { borderColor: colors.border }]}>
                  <Text style={[typography.finePrint, { opacity: 1, fontSize: 13, color: kind === k.id ? "white" : colors.text }]}>{k.name}</Text>
                </View>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={summary}
            onChangeText={setSummary}
            placeholder="Une ligne pour dire à quoi sert la séance"
            placeholderTextColor="grey"
            multiline
            style={[styles.summary, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
          />
        </View>

        <Text style={[typography.finePrint, styles.hint]}>Échauffement et retour au calme standard ajoutés automatiquement.</Text>

        {CLUB.map((level) => (
          <View key={level} style={styles.section}>
            <View style={styles.sectionHead}>
              <SectionLabel>{NAMES[level]}</SectionLabel>
              {level === "level1" && blocs.level1 && (
                <Pressable small onPress={copyDown}>
                  <Text style={[typography.finePrint, { color: colors.accentText, opacity: 1, fontSize: 13 }]}>Copier vers 2 et 3</Text>
                </Pressable>
              )}
            </View>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {blocs[level] ? (
                <>
                  <View style={styles.headRow}>
                    {["×", "Course", "", "% VMA", "Récup (s)"].map((h, i) => (
                      <Text key={i} style={[typography.finePrint, styles.head, i === 1 && { width: 70 }, i === 2 && { width: 44 }]}>{h}</Text>
                    ))}
                    <View style={{ width: 28 }} />
                  </View>
                  {blocs[level].map((b, i) => (
                    <View key={i} style={styles.blocRow}>
                      <Field value={b.repeat} onChange={(v) => update(level, i, "repeat", v)} width={44} colors={colors} />
                      <Field value={b.run} onChange={(v) => update(level, i, "run", v)} width={70} colors={colors} />
                      <Pressable small onPress={() => update(level, i, "unit", b.unit === "m" ? "s" : "m")}>
                        <View style={[styles.unit, { borderColor: colors.border }]}>
                          <Text style={[typography.finePrint, { opacity: 1, fontSize: 13 }]}>{b.unit === "m" ? "m" : "sec"}</Text>
                        </View>
                      </Pressable>
                      <Field value={b.vma} onChange={(v) => update(level, i, "vma", v)} width={56} colors={colors} />
                      <Field value={b.rest} onChange={(v) => update(level, i, "rest", v)} width={60} colors={colors} />
                      <Pressable small hitSlop={6} onPress={() => remove(level, i)}>
                        <View style={styles.remove}>
                          <Glyph name="cross" size={14} color={colors.text} />
                        </View>
                      </Pressable>
                    </View>
                  ))}
                  <Pressable small onPress={() => add(level)}>
                    <View style={styles.addRow}>
                      <Glyph name="plus" size={14} color={colors.accentText} strokeWidth={2.4} />
                      <Text style={[typography.finePrint, { color: colors.accentText, opacity: 1, fontSize: 14 }]}>Ajouter un bloc</Text>
                    </View>
                  </Pressable>
                </>
              ) : (
                <Text style={[typography.finePrint, { fontSize: 14, paddingVertical: 8 }]}>
                  Cette séance est écrite dans un format que l’éditeur ne gère pas encore (marche, test, séries imbriquées). Elle reste telle quelle.
                </Text>
              )}
              <View style={[styles.preview, { borderTopColor: colors.border }]}>
                {preview(level).map((row, i) => (
                  <Text key={i} style={[typography.finePrint, { fontSize: 13 }]}>
                    {row.kind === "repeat"
                      ? `${row.title} ${row.children.map((c) => c.title + (c.target ? ` → ${c.target}` : "")).join(" / ")}`
                      : `${row.title}${row.target ? ` → ${row.target}` : ""}`}
                  </Text>
                ))}
                <Text style={[typography.finePrint, { fontSize: 12, marginTop: 2 }]}>Aperçu avec VMA {String(preferences.vma || 15).replace(".", ",")}</Text>
              </View>
            </View>
          </View>
        ))}

        <Button disabled={!isValid || saving} loading={saving} onPress={submit}>
          {shared ? "Publier" : "Enregistrer sur ce téléphone"}
        </Button>
        {!shared && (
          <Text style={[typography.finePrint, styles.hint]}>
            La base partagée n’est pas encore activée : la séance ne sera visible que sur ce téléphone.
          </Text>
        )}
      </ScrollView>
    </SlideScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 4, gap: 16, paddingBottom: 60 },
  card: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 10 },
  title: { fontFamily: "Archivo-BlackItalic", fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  line: { flexDirection: "row", alignItems: "center", gap: 8 },
  kinds: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { height: 30, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1, justifyContent: "center" },
  summary: { fontFamily: "DiatypePre-Regular", fontSize: 15, borderWidth: 1, borderRadius: 12, padding: 10, minHeight: 60 },
  hint: { textAlign: "center", fontSize: 13 },
  section: { gap: 8 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingRight: 4 },
  headRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  head: { fontSize: 11, width: 44, textAlign: "center" },
  blocRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  field: { height: 38, borderWidth: 1, borderRadius: 10, fontFamily: "DiatypePre-Regular", fontSize: 16, paddingHorizontal: 4 },
  unit: { width: 44, height: 38, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  remove: { width: 28, height: 38, alignItems: "center", justifyContent: "center", opacity: 0.5 },
  addRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  preview: { borderTopWidth: 1, paddingTop: 8, gap: 2 },
});

export default SessionEditorScreen;
