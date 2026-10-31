/*
  The Débuter chrono: a walk-run session turned into a list of timed
  phases, and the maths to know where the runner is from the clock.

  Everything is wall-clock based (Date.now()), not tick-counted, so the
  timer stays right if the phone locks or the app goes to the background:
  when it comes back it just recomputes from how much time has passed.

  Phases of a session (from sessionPlan in beginner.js):
    5' marche (échauffement) → N × (course / marche) → 5' marche (retour au calme)
  A continuous session is one long run between the two walks.
*/

const toSeconds = (minutes) => Math.round(minutes * 60);

export const WARMUP_SECONDS = 5 * 60;
export const COOLDOWN_SECONDS = 5 * 60;

/* The phases, in order. `set` is 1-based, `sets` the total of the main block. */
export const sessionPhases = (session) => {
  const phases = [{ kind: "walk", part: "warmup", label: "Échauffement", cue: "Marche rapide", seconds: WARMUP_SECONDS }];
  const sets = session.walk ? session.sets : 1;
  for (let i = 1; i <= sets; i++) {
    phases.push({
      kind: "run",
      part: "main",
      label: session.walk ? `Course ${i}/${sets}` : "Course",
      cue: session.test ? "Sans t'arrêter — c'est le test" : "À une allure où tu peux parler",
      seconds: toSeconds(session.run),
      set: i,
      sets,
    });
    if (session.walk && i < sets) {
      phases.push({ kind: "walk", part: "main", label: `Marche ${i}/${sets - 1}`, cue: "De la récup, pas une pause", seconds: toSeconds(session.walk), set: i, sets });
    }
  }
  phases.push({ kind: "walk", part: "cooldown", label: "Retour au calme", cue: "Marche, puis étirements", seconds: COOLDOWN_SECONDS });
  return phases;
};

export const phasesSeconds = (phases) => phases.reduce((t, p) => t + p.seconds, 0);

/*
  Where the runner is after `elapsed` seconds: the phase index, seconds
  left in it, and seconds left overall. Past the end → done.
*/
export const positionAt = (phases, elapsed) => {
  let start = 0;
  for (let i = 0; i < phases.length; i++) {
    const end = start + phases[i].seconds;
    if (elapsed < end) {
      return { index: i, remaining: end - elapsed, phaseElapsed: elapsed - start, total: phasesSeconds(phases) - elapsed, done: false };
    }
    start = end;
  }
  return { index: phases.length - 1, remaining: 0, phaseElapsed: phases[phases.length - 1].seconds, total: 0, done: true };
};

/* Seconds elapsed from a clock state {startedAt, pausedAt, pausedTotal} at time `now` (ms) */
export const elapsedOf = (clock, now) => {
  if (clock?.startedAt == null) return 0;
  const until = clock.pausedAt ?? now;
  return Math.max(0, (until - clock.startedAt - (clock.pausedTotal || 0)) / 1000);
};

export const startClock = (now) => ({ startedAt: now, pausedAt: null, pausedTotal: 0 });
export const pauseClock = (clock, now) => (clock.pausedAt ? clock : { ...clock, pausedAt: now });
export const resumeClock = (clock, now) =>
  clock.pausedAt ? { ...clock, pausedAt: null, pausedTotal: (clock.pausedTotal || 0) + (now - clock.pausedAt) } : clock;

/* Jump to the start of the next phase: pretend the session started earlier by what was left */
export const skipPhase = (clock, phases, now) => {
  const pos = positionAt(phases, elapsedOf(clock, now));
  if (pos.done) return clock;
  return { ...clock, startedAt: clock.startedAt - Math.ceil(pos.remaining) * 1000 };
};

/* "12:34" from seconds; "0:07" under a minute */
export const formatCountdown = (seconds) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/* What to say when a phase starts (expo-speech, fr-FR) */
export const phaseAnnouncement = (phase, nextPhase) => {
  const mins = (sec) => (sec % 60 === 0 ? `${sec / 60} minute${sec >= 120 ? "s" : ""}` : `${Math.floor(sec / 60)} minutes ${sec % 60}`);
  if (phase.part === "warmup") return `Échauffement. ${mins(phase.seconds)} de marche rapide.`;
  if (phase.part === "cooldown") return `Retour au calme. ${mins(phase.seconds)} de marche.`;
  if (phase.kind === "run") {
    const which = phase.sets > 1 ? `Course ${phase.set} sur ${phase.sets}. ` : "";
    return `${which}Cours, ${mins(phase.seconds)}.`;
  }
  const after = nextPhase?.kind === "run" ? "" : " C'était la dernière.";
  return `Marche, ${mins(phase.seconds)}.${after}`;
};

export const DONE_ANNOUNCEMENT = "Séance terminée. Bravo !";
