import { toSeconds, formatClock } from "./paces";

/*
  The session builder works in "blocs" — one line per rep type:

    { repeat: 6, run: 400, unit: "m", vma: 100, rest: 60 }
      → 6 × (400 m at 100 % VMA, 1' jog)

  A bloc with repeat 1 is a single rep (pyramids are a list of those).
  These convert to the step format of js/lib/sessions.js and back, so
  sessions written in the file and in the app are the same thing.
*/

export const newBloc = () => ({ repeat: 1, run: 400, unit: "m", vma: 100, rest: 60 });

export const blocsToSteps = (blocs) =>
  blocs.flatMap((b) => {
    const run = b.unit === "s" ? formatClock(Number(b.run)) : Number(b.run);
    const rep = { run, vma: Number(b.vma) };
    const rest = Number(b.rest) > 0 ? { jog: formatClock(Number(b.rest)) } : null;
    if (Number(b.repeat) > 1) return [{ repeat: Number(b.repeat), steps: rest ? [rep, rest] : [rep] }];
    return rest ? [rep, rest] : [rep];
  });

/* Steps → blocs, or null when the steps use something the builder can't show */
export const stepsToBlocs = (steps) => {
  const blocs = [];
  const toBloc = (rep, rest, repeat) => {
    if (rep.run === undefined || rep.vma === undefined) return null;
    const timed = typeof rep.run === "string";
    return {
      repeat,
      run: timed ? toSeconds(rep.run) : rep.run,
      unit: timed ? "s" : "m",
      vma: rep.vma,
      rest: rest?.jog ? toSeconds(rest.jog) : 0,
    };
  };
  let i = 0;
  while (i < steps.length) {
    const s = steps[i];
    if (s.repeat) {
      if (s.steps.length > 2 || s.rest) return null;
      const b = toBloc(s.steps[0], s.steps[1], s.repeat);
      if (!b || (s.steps[1] && !s.steps[1].jog)) return null;
      blocs.push(b);
      i += 1;
    } else if (s.run !== undefined) {
      const rest = steps[i + 1]?.jog ? steps[i + 1] : null;
      const b = toBloc(s, rest, 1);
      if (!b) return null;
      blocs.push(b);
      i += rest ? 2 : 1;
    } else {
      return null;
    }
  }
  return blocs;
};

export const KINDS = [
  { id: "pyramid", name: "Pyramide" },
  { id: "vo2", name: "VO2max" },
  { id: "threshold", name: "Seuil" },
  { id: "easy", name: "Footing" },
  { id: "test", name: "Test VMA" },
];

export const slug = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);

/* "15/11/2026" → "2026-11-15", or null */
export const parseDate = (text) => {
  const m = String(text).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

export const STANDARD_WARMUP = [
  { easy: "15:00" },
  { drills: "Montées de genoux, talons-fesses, pas chassés, foulées bondissantes" },
  { repeat: 3, steps: [{ run: 80, vma: 90, note: "Accélération progressive" }, { walk: "0:45", note: "Retour en marchant" }] },
];
export const STANDARD_COOLDOWN = [{ easy: "10:00", note: "Très facile, puis étirements" }];
