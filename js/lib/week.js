import { zoneById, zonePace, paceFromSpeed, speedAt } from "./paces";

/*
  The rest of the week for Levels 1–3: Friday is the club session, the
  other runs are easy, and they are sized for THIS runner:

  1. Starting volume comes from what they actually ran — the questionnaire's
     average km/week over the last 3 months (kmWeek) — not from their level.
     No answer yet → a level default (Level 3 small, Level 1 bigger).
  2. Volume moves with the cycle: +5 % a week, a lighter week 4 (−15 %),
     capped at +25 % over the starting point. A hold instead of a step up
     when the last two logged sessions felt hard (feel ≥ 4) or the last
     Friday was missed.
  3. Experience gates intensity: fewer than 2 runs a week before joining →
     no strides yet, and at most 3 runs a week.
  4. The minutes are split over the runs the runner wants (1–5, Friday
     counted): the long run takes ~35 % of the solo time, the rest is
     shared; every run is at least 25'. Paces from their VMA zones.

  Rules from the Running hub: easy runs truly easy, one quality day
  (Friday), the long run on its own, never two hard days back to back.
*/

export const RUNS_OPTIONS = [1, 2, 3, 4, 5];

export const guessRuns = (preferences) =>
  preferences.runsWeek || { never: 2, once: 2, twice: 3, more: 4 }[preferences.runsPerWeek] || 3;

/* km/week they were already doing, from the questionnaire bucket (midpoints) */
export const KM_BY_ANSWER = { 0: 0, under10: 7, "10to20": 15, "20to40": 30, over40: 45 };
const KM_BY_LEVEL = { level3: 12, level2: 20, level1: 30 }; // when kmWeek is unknown

export const baseKm = (preferences) => {
  const fromAnswer = KM_BY_ANSWER[preferences.kmWeek];
  if (fromAnswer !== undefined) return Math.max(fromAnswer, 8); // 0 km still gets a gentle start
  return KM_BY_LEVEL[preferences.level] || 20;
};

/* Easy pace in s/km from the VMA (General Aerobic zone, middle), else a safe default */
export const easyPaceSeconds = (vma) => (vma ? paceFromSpeed(speedAt(vma, 65.5)) : 390);

const FRIDAY_MINUTES = 45; // what the club session counts for in the week's volume

/* ── Progression ─────────────────────────────────────────────────────── */

export const PROGRESSION = { step: 0.05, cap: 0.25, easyWeek: 4, easyFactor: 0.85 };

/* Week number in the cycle (1-based) from the club sessions' dates, 1 before the first */
export const cycleWeek = (sessions = [], today) => {
  const dates = sessions.map((s) => s.date).filter(Boolean).sort();
  if (!dates[0] || today < dates[0]) return 1;
  const [y1, m1, d1] = dates[0].split("-").map(Number);
  const [y2, m2, d2] = today.split("-").map(Number);
  const days = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
  return Math.floor(days / 7) + 1;
};

/*
  Should this week hold rather than step up? From the runner's own logs:
  the last two logged sessions felt hard (feel ≥ 4), or the most recent
  past club session was not done. { hold, reason } — reason "" when not.
*/
export const holdCheck = (preferences, sessions = [], today) => {
  const logs = Object.entries(preferences.log || {})
    .map(([id, l]) => ({ id, ...l }))
    .sort((a, b) => (a.at || "").localeCompare(b.at || ""));
  const lastTwo = logs.slice(-2);
  if (lastTwo.length === 2 && lastTwo.every((l) => (l.feel || 0) >= 4)) return { hold: true, reason: "Tes deux dernières séances étaient dures — on garde le même volume cette semaine." };
  const past = sessions.filter((s) => s.date && s.date < today).sort((a, b) => a.date.localeCompare(b.date));
  const last = past[past.length - 1];
  if (last && !preferences.done?.[last.id] && !preferences.log?.[last.id]) return { hold: true, reason: "Vendredi dernier a sauté — on reprend au même volume, sans monter." };
  return { hold: false, reason: "" };
};

/* The volume multiplier for a cycle week, before any hold */
export const volumeFactor = (week) => {
  if (week === PROGRESSION.easyWeek) return PROGRESSION.easyFactor;
  const stepsUp = Math.max(0, week - 1) - (week > PROGRESSION.easyWeek ? 1 : 0); // the easy week doesn't count as a step
  return Math.min(1 + stepsUp * PROGRESSION.step, 1 + PROGRESSION.cap);
};

/* ── Taper ───────────────────────────────────────────────────────────── */

/*
  The last two weeks before the race: less volume, the legs kept lively.
    8–14 days out  "taper"  −30 %, long run capped at 40'
    ≤ 7 days out   "race"   −50 %, long run capped at 30' (a "sortie" the Sunday before)
  Strides stay; nothing new. { phase, factor, longCap, note } or null.
*/
export const TAPER = {
  taper: { factor: 0.7, longCap: 40, note: "Affûtage : −30 % de volume, lignes droites gardées, rien de nouveau." },
  race: { factor: 0.5, longCap: 30, note: "Semaine de course : −50 %, jambes vives, dors et bois bien. La forme est déjà là." },
};

export const taperFor = (daysToRace) => {
  if (daysToRace === null || daysToRace === undefined || daysToRace < 0) return null;
  if (daysToRace <= 7) return { phase: "race", ...TAPER.race };
  if (daysToRace <= 14) return { phase: "taper", ...TAPER.taper };
  return null;
};

/* ── Experience gates ────────────────────────────────────────────────── */

const isNewToRunning = (p) => p.runsPerWeek === "never" || p.runsPerWeek === "once" || p.kmWeek === "0" || p.kmWeek === "under10";

/* ── The week ────────────────────────────────────────────────────────── */

const round5 = (m) => Math.max(25, Math.round(m / 5) * 5);

const FRIDAY = { day: "Vendredi", kind: "club", title: "Run club", note: "La séance de la semaine — fractionné sur la piste de Floride, 16h30" };
const EASY = { kind: "easy", zone: "ga", note: "Facile du début à la fin : tu dois pouvoir parler" };
const STRIDES = { kind: "easy", zone: "ga", title: "Footing + lignes droites", note: "Finis par 4 × 80 m en accélérant, relâché" };
const LONG = { day: "Dimanche", kind: "long", zone: "endurance", title: "Sortie longue", note: "La plus longue de la semaine, allure régulière" };
const SHORT_BEFORE = { day: "Jeudi", kind: "easy", zone: "ga", title: "Footing court", note: "Très facile — la veille du club" };
const RECOVERY = { day: "Lundi", kind: "easy", zone: "recovery", title: "Récup", note: "Juste faire circuler, aucune allure à tenir" };

/* Which days the solo runs fall on, by how many runs in the week (Friday counted) */
const SLOTS = {
  1: [],
  2: [{ ...LONG }],
  3: [{ ...EASY, day: "Mardi", title: "Footing" }, { ...LONG }],
  4: [{ ...EASY, day: "Mardi", title: "Footing" }, { ...SHORT_BEFORE }, { ...LONG }],
  5: [{ ...RECOVERY }, { ...EASY, day: "Mardi", title: "Footing" }, { ...SHORT_BEFORE }, { ...LONG }],
};

/*
  The week as a list of days with everything worked out, plus the volume
  it adds up to: { days, volume: { km, minutes, week, factor, hold, reason, base } }.
  `sessions` and `today` size the cycle week; without them it's week 1.
*/
export const weekPlan = (preferences, { sessions = [], today = null, daysToRace = null } = {}) => {
  const wanted = Math.min(5, Math.max(1, guessRuns(preferences)));
  const runs = isNewToRunning(preferences) ? Math.min(wanted, 3) : wanted;
  const week = today ? cycleWeek(sessions, today) : 1;
  const taper = taperFor(daysToRace);
  const check = today && !taper ? holdCheck(preferences, sessions, today) : { hold: false, reason: "" };
  const hold = check.hold;
  const reason = taper ? taper.note : check.reason;
  const cycleFactor = hold ? volumeFactor(Math.max(1, week - 1)) : volumeFactor(week);
  const factor = taper ? cycleFactor * taper.factor : cycleFactor;

  const base = baseKm(preferences);
  const pace = easyPaceSeconds(preferences.vma);
  const totalMinutes = Math.max(FRIDAY_MINUTES + 25, (base * factor * pace) / 60); // never less than Friday + one short run
  const soloMinutes = Math.max(0, totalMinutes - FRIDAY_MINUTES);

  const slots = SLOTS[runs].map((s) => ({ ...s }));
  if (runs >= 3 && !isNewToRunning(preferences)) Object.assign(slots.find((s) => s.day === "Mardi"), { title: STRIDES.title, note: STRIDES.note });
  const longShare = slots.length > 1 ? 0.35 : 1;
  const soloDays = slots.map((s) => {
    const share = s.kind === "long" ? longShare : (1 - (slots.some((x) => x.kind === "long") ? longShare : 0)) / Math.max(1, slots.filter((x) => x.kind !== "long").length);
    let minutes = round5(soloMinutes * share);
    if (taper && s.kind === "long") minutes = Math.min(minutes, taper.longCap);
    const zone = zoneById(s.zone);
    return { ...s, minutes, zoneName: zone.name, pace: preferences.vma ? zonePace(preferences.vma, zone.vma) : null, hr: null };
  });

  const order = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const days = [...soloDays, { ...FRIDAY }].sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));
  const minutes = soloDays.reduce((t, d) => t + d.minutes, 0) + FRIDAY_MINUTES;
  const km = Math.round((minutes * 60) / pace);
  return { days, volume: { km, minutes, week, factor, hold, reason, base, taper: taper?.phase || null } };
};

/* "≈ 32 km cette semaine · semaine 3 du cycle · +10 %" / "≈ 16 km · semaine de course · −50 %" */
export const volumeLine = ({ km, week, factor, hold, taper }) => {
  const pct = Math.round((factor - 1) * 100);
  if (taper) return `≈ ${km} km · ${taper === "race" ? "semaine de course" : "semaine d'affûtage"} · ${pct > 0 ? "+" : "−"}${Math.abs(pct)} %`;
  const change = hold ? "volume maintenu" : pct === 0 ? "volume de départ" : `${pct > 0 ? "+" : "−"}${Math.abs(pct)} %`;
  return `≈ ${km} km cette semaine · semaine ${week} du cycle · ${change}`;
};

export const RULES = [
  "Le vendredi est la seule séance dure : tout le reste est facile.",
  "Un footing doit rester une conversation. Si tu ne peux pas parler, ralentis.",
  "La sortie longue monte doucement : jamais plus de 10 minutes de plus que la semaine d'avant.",
  "Un jour sans courir avant et après le club si tu peux.",
];
