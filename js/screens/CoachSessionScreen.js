import React, { useCallback, useContext, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, LayoutAnimation } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SlideScreenContainer from "../components/SlideScreenContainer";
import Pressable from "../components/Pressable";
import Glyph from "../components/Glyph";
import SectionLabel from "../components/SectionLabel";
import UserContext from "../variables/context";

import useSessions from "../lib/store";
import { formatDay } from "../lib/plan";
import { BOOKING } from "../lib/config";
import { levelById } from "../lib/levels";
import { paceFromSpeed, speedAt } from "../lib/paces";
import { beginnerLine } from "../lib/history";
import {
  loadCoachData,
  getSessionAttendees,
  groupByLevel,
  sessionTargets,
  sessionBlocks,
  fastVolume,
  paceGroups,
  isClubLevel,
  isBeginnerLevel,
  athleteBeginner,
  effectiveLevel,
  wodifyAttendance,
  isPastSession,
} from "../lib/coach";

/*
  Coach Session Hub — one Friday, seen from the track (same as docs/coach.html).
  The session up top: a Level 1 / 2 / 3 switch and the main set as blocks of
  reps. Then who's coming — from Wodify when there's a list for that date
  (booked before, present after), else every Level 1–3 runner — as pace
  groups, a pace table, or a list by level. Tap a runner for their targets,
  "Profil complet" for everything (CoachAthlete).
*/

const CLUB = ["level1", "level2", "level3"];
const paceAt = (vma, pct) => paceFromSpeed(speedAt(vma, pct));
const clock = (sec) => { const s = Math.round(sec); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

/* ── The session card ── */
const SessionCard = ({ session, level, setLevel, onEdit, colors, typography }) => {
  const blocks = sessionBlocks(session, level);
  const targets = sessionTargets(session, level, 15);
  const pcts = [...new Set(targets.map((t) => t.pct))].sort((a, b) => a - b);
  const vol = fastVolume(session, level);
  let n = 0;
  return (
    <View style={[styles.hero, { backgroundColor: colors.accent }]}>
      <Text style={[typography.finePrint, styles.kicker]}>
        {formatDay(session.date)} · {BOOKING.time} · {BOOKING.place}
      </Text>
      <Text style={styles.title}>{session.title}</Text>
      {!!session.summary && <Text style={[typography.finePrint, styles.summary]}>{session.summary}</Text>}

      <View style={styles.levelSwitch}>
        {CLUB.map((id) => {
          const on = id === level;
          return (
            <Pressable key={id} onPress={() => setLevel(id)} small animation={false} style={{ flex: 1 }}>
              <View style={[styles.levelBtn, on && { backgroundColor: colors.accentSoftOnAccent || "#7CC4A2" }]}>
                <Text style={[typography.finePrint, typography.bold, { opacity: 1, fontSize: 15, color: on ? "#0A0A0A" : "rgba(255,255,255,0.75)" }]}>{levelById(id).name}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.facts}>
        {!!pcts.length && <Fact k="Intensité" v={`${pcts.join(" / ")} % VMA`} typography={typography} />}
        {!!vol && <Fact k="Volume vite" v={vol >= 1000 ? `${String(vol / 1000).replace(".", ",")} km` : `${vol} m`} typography={typography} />}
        <Fact k="Blocs" v={String(blocks.filter((b) => !b.rest).length)} typography={typography} />
      </View>

      <View style={{ gap: 6 }}>
        {blocks.map((b, i) =>
          b.rest ? (
            <View key={i} style={styles.gap}>
              <View style={styles.gapLine} />
              <Text style={[typography.finePrint, styles.gapText]}>{b.rest}</Text>
              <View style={styles.gapLine} />
            </View>
          ) : (
            <View key={i} style={styles.block}>
              <View style={styles.blockHead}>
                <Text style={styles.count}>
                  {b.reps}
                  <Text style={styles.countX}>×</Text>
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.heading, typography.bold, { color: "white", fontSize: 20 }]}>{b.what}</Text>
                  <Text style={[typography.finePrint, styles.blockSub]}>
                    Bloc {++n}
                    {b.rec ? ` · récup ${b.rec} entre chaque` : ""}
                  </Text>
                </View>
              </View>
              <View style={styles.dots}>
                {b.items.map((it, j) => (
                  <View key={j} style={[styles.dotPill, b.what !== "répétitions" && styles.dotOnly]}>
                    <View style={styles.dotNum}>
                      <Text style={styles.dotNumText}>{j + 1}</Text>
                    </View>
                    {b.what === "répétitions" && <Text style={[typography.finePrint, styles.dotText]}>{it}</Text>}
                  </View>
                ))}
              </View>
            </View>
          ),
        )}
      </View>

      <Pressable onPress={onEdit} small>
        <Text style={[typography.finePrint, styles.editLink]}>Modifier la séance</Text>
      </Pressable>
    </View>
  );
};

const Fact = ({ k, v, typography }) => (
  <View style={styles.fact}>
    <Text style={[typography.finePrint, styles.factK]}>{k}</Text>
    <Text style={[typography.heading, typography.bold, { color: "white", fontSize: 16 }]}>{v}</Text>
  </View>
);

/* ── One runner: compact, tap for the quick info ── */
const AthleteRow = ({ athlete, session, sessions, wodify, open, onToggle, onProfile, listed, past, colors, typography }) => {
  const level = effectiveLevel(athlete);
  const club = isClubLevel(level);
  const targets = sessionTargets(session, level, athlete.vma);
  const first = targets[0];
  const beginner = isBeginnerLevel(level) ? athleteBeginner(athlete) : null;
  const att = wodify ? wodifyAttendance(athlete, sessions, wodify) : [];
  const counted = att.filter((x) => x.status === "present" || x.status === "absent");
  const here = counted.filter((x) => x.status === "present").length;
  const flag = athlete.injury === "yes";
  return (
    <View style={[styles.athRow, { borderTopColor: colors.border }]}>
      <Pressable onPress={onToggle} animation={false}>
        <View style={styles.athTop}>
          {listed ? (
            <View style={[styles.check, { backgroundColor: colors.accentText }]}>
              <Glyph name="check" size={13} color="#0A0A0A" strokeWidth={2.8} />
            </View>
          ) : (
            <View style={[styles.check, { borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed" }]} />
          )}
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[typography.heading, typography.bold]} numberOfLines={1}>{athlete.name}</Text>
            <View style={styles.tags}>
              <Tag text={levelById(level).name} level={level} colors={colors} typography={typography} />
              {flag && <Tag text="Douleur" warn colors={colors} typography={typography} />}
              {!!counted.length && (
                <Text style={[typography.finePrint, { fontSize: 12.5 }]}>
                  {here}/{counted.length} séance{here > 1 ? "s" : ""}
                </Text>
              )}
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {athlete.vma && first ? (
              <>
                <Text style={[typography.heading, typography.mono, typography.bold, { color: colors.accentText, fontSize: 18 }]}>{first.target}</Text>
                <Text style={[typography.finePrint, { fontSize: 12 }]}>{first.label} · VMA {athlete.vma.toFixed(1)}</Text>
              </>
            ) : athlete.vma ? (
              <Text style={[typography.heading, typography.mono, typography.bold, { color: colors.accentText }]}>{athlete.vma.toFixed(1)}</Text>
            ) : club ? (
              <Text style={[typography.finePrint, typography.bold, { color: "#E9C46A", opacity: 1, fontSize: 14 }]}>Pas de VMA</Text>
            ) : (
              <Text style={[typography.finePrint, { fontSize: 13 }]}>marche-course</Text>
            )}
          </View>
        </View>
      </Pressable>

      {open && (
        <View style={styles.more}>
          {club && targets.length ? (
            <View style={styles.grid}>
              {targets.map((t) => (
                <Cell key={`${t.label}-${t.pct}`} k={`${t.reps > 1 ? `${t.reps} × ` : ""}${t.label} · ${t.pct} %`} v={t.target} colors={colors} typography={typography} />
              ))}
              <Cell k="Allure VMA" v={`${clock(paceAt(athlete.vma, 100))} /km`} colors={colors} typography={typography} />
              <Cell k="Allure 10 km" v={`${clock(paceAt(athlete.vma, 90))} /km`} colors={colors} typography={typography} />
              <Cell k="Footing" v={`${clock(paceAt(athlete.vma, 68))}–${clock(paceAt(athlete.vma, 63))}`} colors={colors} typography={typography} />
              {!!athlete.vmaTestMetres && <Cell k="Test 6'" v={`${athlete.vmaTestMetres} m`} colors={colors} typography={typography} />}
            </View>
          ) : beginner ? (
            <Text style={[typography.finePrint, { fontSize: 14 }]}>{beginnerLine(beginner)}</Text>
          ) : (
            <Text style={[typography.finePrint, { fontSize: 14 }]}>{club ? "VMA à mesurer — allures dès le test" : "Programme Débuter — marche-course, pas de séance club"}</Text>
          )}
          {flag && (
            <View style={styles.injury}>
              <Text style={[typography.finePrint, { color: "#F3C4B6", opacity: 1, fontSize: 14 }]}>{athlete.injuryDetail || "Douleur signalée au questionnaire"}</Text>
            </View>
          )}
          <Pressable onPress={onProfile} small>
            <View style={[styles.profileBtn, { borderColor: colors.border }]}>
              <Text style={[typography.finePrint, typography.bold, { opacity: 1, fontSize: 14 }]}>Voir le profil complet</Text>
              <Glyph name="right" size={14} color={colors.text} />
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const Tag = ({ text, level, warn, colors, typography }) => {
  const l1 = level === "level1";
  const l2 = level === "level2";
  const style = warn
    ? { borderColor: "#E07A5F" }
    : l1
      ? { backgroundColor: colors.accentText, borderColor: colors.accentText }
      : l2
        ? { borderColor: colors.accentText }
        : { borderColor: colors.border };
  const color = warn ? "#E07A5F" : l1 ? "#0A0A0A" : l2 ? colors.accentText : colors.text;
  return (
    <View style={[styles.tag, style]}>
      <Text style={[typography.finePrint, { opacity: 1, fontSize: 11.5, color }]}>{text}</Text>
    </View>
  );
};

const Cell = ({ k, v, colors, typography }) => (
  <View style={[styles.cell, { backgroundColor: colors.background, borderColor: colors.border }]}>
    <Text style={[typography.finePrint, styles.cellK]} numberOfLines={1}>{k}</Text>
    <Text style={[typography.heading, typography.mono, typography.bold, { fontSize: 15 }]}>{v}</Text>
  </View>
);

/* ── The pace table ── */
const Cellx = ({ w, children, hot, left, bold, colors, typography }) => (
  <Text style={[typography.finePrint, typography.mono, { width: w, opacity: 1, fontSize: hot ? 15 : 14, textAlign: left ? "left" : "right", color: hot ? colors.accentText : colors.text, fontWeight: hot || bold ? "600" : "400" }]} numberOfLines={1}>
    {children}
  </Text>
);
const PaceTable = ({ groups, noVma, session, colors, typography }) => {
  const cols = [];
  CLUB.forEach((l) =>
    sessionTargets(session, l, 15).forEach((t) => {
      if (!cols.some((c) => c.label === t.label && c.pct === t.pct)) cols.push(t);
    }),
  );
  const rows = [...groups.flatMap((g, gi) => g.athletes.map((a, i) => ({ a, cut: gi > 0 && i === 0 }))), ...noVma.map((a) => ({ a }))];
  const W = { name: 150, lvl: 44, vma: 52, col: 64, pace: 76, ef: 104 };
  return (
    <View style={[styles.tableWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[styles.tr, { borderTopWidth: 0 }]}>
            {["Coureur", "Niv.", "VMA", ...cols.map((c) => c.label), "VMA /km", "10 km", "Footing"].map((h, i) => (
              <Text key={h + i} style={[typography.finePrint, styles.th, { width: [W.name, W.lvl, W.vma, ...cols.map(() => W.col), W.pace, W.pace, W.ef][i], textAlign: i === 0 ? "left" : "right" }]}>{h}</Text>
            ))}
          </View>
          {rows.map(({ a, cut }) => {
            const lvl = effectiveLevel(a);
            const mine = sessionTargets(session, lvl, a.vma);
            return (
              <View key={a.id} style={[styles.tr, { borderTopColor: cut ? colors.accentText : colors.border, borderTopWidth: cut ? 2 : 1 }]}>
                <Cellx colors={colors} typography={typography} w={W.name} left bold>{a.name}</Cellx>
                <Cellx colors={colors} typography={typography} w={W.lvl}>{levelById(lvl).name.replace("Level ", "L")}</Cellx>
                <Cellx colors={colors} typography={typography} w={W.vma}>{a.vma ? a.vma.toFixed(1) : "—"}</Cellx>
                {cols.map((c) => {
                  const t = mine.find((x) => x.label === c.label && x.pct === c.pct);
                  return <Cellx colors={colors} typography={typography} key={c.label + c.pct} w={W.col} hot>{t ? t.target : "—"}</Cellx>;
                })}
                <Cellx colors={colors} typography={typography} w={W.pace}>{a.vma ? clock(paceAt(a.vma, 100)) : "—"}</Cellx>
                <Cellx colors={colors} typography={typography} w={W.pace}>{a.vma ? clock(paceAt(a.vma, 90)) : "—"}</Cellx>
                <Cellx colors={colors} typography={typography} w={W.ef}>{a.vma ? `${clock(paceAt(a.vma, 68))}–${clock(paceAt(a.vma, 63))}` : "—"}</Cellx>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const CoachSessionScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { theme } = useContext(UserContext);
  const { colors, typography } = theme;
  const { sessions, byId } = useSessions();
  const session = byId(route.params?.id);

  const [data, setData] = useState(null); // { athletes, extras, source, wodify }
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [level, setLevel] = useState("level2");
  const [view, setView] = useState("groups"); // groups | table | list
  const [filter, setFilter] = useState(null);
  const [open, setOpen] = useState({});

  const sessionId = session?.id;
  const load = useCallback(
    (force) =>
      loadCoachData({ force })
        .then((d) => getSessionAttendees(session, d))
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((e) => {
          setError(e.message === "setup" ? "setup" : "offline");
          setData((x) => x || { athletes: [], extras: [], source: "roster", wodify: null });
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the session object is rebuilt on every render; its id is what matters
    [sessionId],
  );

  useEffect(() => {
    if (sessionId) load(false);
  }, [sessionId, load]);

  const refresh = () => {
    setRefreshing(true);
    load(true).then(() => setRefreshing(false));
  };
  const toggle = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => ({ ...o, [id]: !o[id] }));
  };

  if (!session) return null;

  const athletes = data?.athletes || [];
  const wodify = data?.wodify || null;
  const listed = data?.source === "booked" || data?.source === "present";
  const past = isPastSession(session);
  const groups = paceGroups(athletes, session);
  const club = athletes.filter((a) => isClubLevel(effectiveLevel(a)));
  const noVma = club.filter((a) => !a.vma).sort((x, y) => x.name.localeCompare(y.name, "fr"));
  const others = athletes.filter((a) => !isClubLevel(effectiveLevel(a))).sort((x, y) => x.name.localeCompare(y.name, "fr"));
  const byLevel = groupByLevel(athletes.map((a) => ({ ...a, level: effectiveLevel(a) })));
  const shown = filter ? byLevel.filter((g) => g.id === filter) : byLevel;
  const who = past ? "Présents" : "Réservés";

  const row = (a) => (
    <AthleteRow
      key={a.id}
      athlete={athletes.find((x) => x.id === a.id) || a}
      session={session}
      sessions={sessions}
      wodify={wodify}
      listed={listed}
      past={past}
      open={!!open[a.id]}
      onToggle={() => toggle(a.id)}
      onProfile={() => navigation.navigate("CoachAthlete", { athlete: athletes.find((x) => x.id === a.id) || a, sessionId: session.id, wodify })}
      colors={colors}
      typography={typography}
    />
  );
  const card = (children, key) => (
    <View key={key} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>
  );

  return (
    <SlideScreenContainer title="Séance coach" type="back" navigation={navigation} route={route} ignoreKeyboard>
      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accentText} />}
      >
        <SessionCard session={session} level={level} setLevel={setLevel} onEdit={() => navigation.navigate("SessionEditor", { id: session.id })} colors={colors} typography={typography} />

        {/* The numbers */}
        <View style={styles.stats}>
          <Stat k={listed ? who : "Athlètes club"} v={data ? (listed ? athletes.length + (data.extras || []).length : club.length) : "…"} colors={colors} typography={typography} />
          <Stat k="Groupes" v={data ? groups.length : "…"} colors={colors} typography={typography} />
          <Stat k="Sans VMA" v={data ? noVma.length : "…"} warn={noVma.length > 0} colors={colors} typography={typography} />
          <Stat k="Douleurs" v={data ? athletes.filter((a) => a.injury === "yes").length : "…"} warn={athletes.some((a) => a.injury === "yes")} colors={colors} typography={typography} />
        </View>

        {data && !listed && !error && (
          <View style={[styles.notice, { borderColor: colors.border }]}>
            <Text style={[typography.finePrint, { fontSize: 14, lineHeight: 19 }]}>
              {past ? "Pas de liste de présence Wodify pour cette séance" : "Pas encore de réservations Wodify pour cette séance"} — tous les athlètes Level 1–3 sont affichés.
            </Text>
          </View>
        )}
        {error === "setup" && (
          <View style={[styles.notice, { borderColor: colors.border }]}>
            <Text style={[typography.finePrint, { fontSize: 14, lineHeight: 19 }]}>La base n{"'"}est pas prête pour le hub coach : lance supabase/coach_page.sql dans Supabase, puis tire pour rafraîchir.</Text>
          </View>
        )}
        {error === "offline" && <Text style={[typography.finePrint, styles.empty]}>Hors ligne — tire pour réessayer.</Text>}

        {/* Groupes / Tableau / Liste */}
        <View style={[styles.seg, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            ["groups", "Groupes"],
            ["table", "Tableau"],
            ["list", listed ? who : "Liste"],
          ].map(([id, label]) => {
            const on = id === view;
            return (
              <Pressable key={id} onPress={() => setView(id)} small animation={false} style={{ flex: 1 }}>
                <View style={[styles.segBtn, on && { backgroundColor: colors.accentSoft, borderColor: colors.accentText, borderWidth: 1 }]}>
                  <Text style={[typography.finePrint, { opacity: 1, fontSize: 15, color: on ? colors.text : colors.text + "AA" }]}>{label}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {data === null && <Text style={[typography.finePrint, styles.empty]}>Chargement…</Text>}

        {data && view === "groups" && (
          <View style={{ gap: 12 }}>
            {groups.map((g, i) => (
              <View key={i} style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.groupHead, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.groupTitle}>Groupe {i + 1}</Text>
                    <Text style={[typography.finePrint, { fontSize: 13 }]}>
                      {g.athletes.length} coureur{g.athletes.length > 1 ? "s" : ""} · VMA {g.vmaLow.toFixed(1)}
                      {g.athletes.length > 1 ? `–${g.vmaHigh.toFixed(1)}` : ""}
                    </Text>
                  </View>
                  {!!g.target && (
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[typography.heading, typography.mono, typography.bold, { color: colors.accentText, fontSize: 20 }]}>{g.target}</Text>
                      <Text style={[typography.finePrint, { fontSize: 12 }]}>par {g.rep}</Text>
                    </View>
                  )}
                </View>
                {g.athletes.map(row)}
              </View>
            ))}
            {!groups.length && <Text style={[typography.finePrint, styles.empty]}>Aucun athlète avec une VMA pour former des groupes.</Text>}
            {!!noVma.length && (
              <>
                <SectionLabel>Sans VMA · {noVma.length}</SectionLabel>
                {card(noVma.map(row), "novma")}
              </>
            )}
            {!!others.length && (
              <>
                <SectionLabel>Débuter / niveau à confirmer · {others.length}</SectionLabel>
                {card(others.map(row), "others")}
              </>
            )}
            {!!data.extras?.length && (
              <>
                <SectionLabel>{who} sans fiche · {data.extras.length}</SectionLabel>
                {card(<Text style={[typography.finePrint, { fontSize: 14, padding: 14 }]}>{data.extras.join(" · ")}</Text>, "extras")}
              </>
            )}
          </View>
        )}

        {data && view === "table" && (
          <View style={{ gap: 8 }}>
            <PaceTable groups={groups} noVma={noVma} session={session} colors={colors} typography={typography} />
            <Text style={[typography.finePrint, { fontSize: 13 }]}>Temps cible par répétition en vert · trait vert = nouveau groupe · fais glisser pour les autres allures.</Text>
          </View>
        )}

        {data && view === "list" && (
          <View style={{ gap: 12 }}>
            {byLevel.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ marginHorizontal: -20 }}>
                {[{ id: null, name: "Tous", n: athletes.length }, ...byLevel.map((g) => ({ id: g.id, name: g.name, n: g.athletes.length }))].map((c) => {
                  const selected = c.id === filter;
                  return (
                    <Pressable key={String(c.id)} onPress={() => setFilter(c.id)} small>
                      <View style={[styles.chip, selected ? { backgroundColor: colors.accent, borderColor: colors.accent } : { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[typography.finePrint, typography.bold, { opacity: 1, fontSize: 14, color: selected ? "white" : colors.text }]}>{c.name}</Text>
                        <Text style={[typography.finePrint, { opacity: 1, fontSize: 13, color: selected ? "rgba(255,255,255,0.75)" : colors.text }]}>{c.n}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            {shown.map((g) => (
              <View key={g.id} style={{ gap: 8 }}>
                <SectionLabel>
                  {g.name} · {g.athletes.length}
                </SectionLabel>
                {card(g.athletes.map(row), g.id)}
              </View>
            ))}
          </View>
        )}

        {!!wodify?.updatedAt && (
          <Text style={[typography.finePrint, styles.empty, { fontSize: 13 }]}>
            Wodify synchronisé le {new Date(wodify.updatedAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </Text>
        )}
      </ScrollView>
    </SlideScreenContainer>
  );
};

const Stat = ({ k, v, warn, colors, typography }) => (
  <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <Text style={[typography.finePrint, styles.statK]} numberOfLines={1}>{k}</Text>
    <Text style={[styles.statV, { color: warn ? "#E9C46A" : colors.text }]}>{v}</Text>
  </View>
);

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 16 },
  hero: { borderRadius: 24, padding: 18, gap: 10, overflow: "hidden" },
  kicker: { fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: "rgba(255,255,255,0.75)", opacity: 1 },
  title: { fontFamily: "Archivo-BlackItalic", fontSize: 38, lineHeight: 42, letterSpacing: -0.8, color: "white" },
  summary: { fontSize: 15, lineHeight: 20, color: "rgba(255,255,255,0.9)", opacity: 1 },
  levelSwitch: { flexDirection: "row", gap: 4, backgroundColor: "rgba(0,0,0,0.25)", borderRadius: 14, padding: 4 },
  levelBtn: { height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  facts: { flexDirection: "row", gap: 6 },
  fact: { flex: 1, backgroundColor: "rgba(0,0,0,0.22)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  factK: { fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: "rgba(255,255,255,0.65)", opacity: 1 },
  block: { backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 14, padding: 12, gap: 10 },
  blockHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  count: { fontFamily: "Archivo-BlackItalic", fontSize: 44, lineHeight: 46, color: "#7CC4A2", letterSpacing: -1 },
  countX: { fontSize: 26 },
  blockSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", opacity: 1 },
  dots: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dotPill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#7CC4A2", backgroundColor: "rgba(124,196,162,0.16)", borderRadius: 999, paddingLeft: 3, paddingRight: 10, height: 30 },
  dotOnly: { borderWidth: 0, backgroundColor: "transparent", paddingLeft: 0, paddingRight: 0 },
  dotNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#7CC4A2", alignItems: "center", justifyContent: "center" },
  dotNumText: { fontSize: 12, fontWeight: "700", color: "#0A0A0A" },
  dotText: { fontSize: 13, color: "white", opacity: 1, fontWeight: "600" },
  gap: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  gapLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.25)" },
  gapText: { fontSize: 13, color: "rgba(255,255,255,0.85)", opacity: 1 },
  editLink: { textAlign: "center", color: "rgba(255,255,255,0.8)", opacity: 1, fontSize: 14, paddingVertical: 2 },
  stats: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8 },
  statK: { fontSize: 10.5, letterSpacing: 0.6, textTransform: "uppercase" },
  statV: { fontFamily: "Archivo-BlackItalic", fontSize: 26, lineHeight: 30 },
  notice: { borderRadius: 14, borderWidth: 1, borderStyle: "dashed", padding: 12 },
  seg: { flexDirection: "row", gap: 6, borderWidth: 1, borderRadius: 14, padding: 4 },
  segBtn: { height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  listCard: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  groupHead: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  groupTitle: { fontFamily: "Archivo-BlackItalic", fontSize: 22, color: "white" },
  athRow: { borderTopWidth: 1, marginTop: -1 },
  athTop: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  tags: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  more: { paddingLeft: 46, paddingRight: 14, paddingBottom: 14, gap: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cell: { width: "48%", borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  cellK: { fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" },
  injury: { borderWidth: 1, borderColor: "#E07A5F", borderRadius: 12, padding: 10 },
  profileBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderWidth: 1, borderRadius: 18, height: 36, paddingHorizontal: 14 },
  tableWrap: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  tr: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, height: 44, borderTopWidth: 1 },
  th: { fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase" },
  chips: { flexDirection: "row", gap: 8, paddingHorizontal: 20 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1 },
  empty: { textAlign: "center", fontSize: 14, paddingVertical: 12 },
});

export default CoachSessionScreen;
