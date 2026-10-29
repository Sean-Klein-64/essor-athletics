/*
  Checks the running maths and that every session is written correctly.
  Run:  node scripts/test_paces.js
  (bundles the ES modules with esbuild on the fly — nothing to install)
*/
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const assert = require("assert");

const entry = path.join(__dirname, ".entry.js");
const out = path.join(__dirname, ".paces.bundle.js");
fs.writeFileSync(
  entry,
  `export * from "../js/lib/paces"; export * from "../js/lib/plan"; export * from "../js/lib/records";
   export * from "../js/lib/beginner"; export * from "../js/lib/placement"; export * from "../js/lib/editor"; export * from "../js/lib/goal"; export * from "../js/lib/booking"; export * from "../js/lib/member"; export * from "../js/lib/coach"; export * from "../js/lib/log"; export * from "../js/lib/timer"; export * from "../js/lib/outings"; export * from "../js/lib/notes"; export * from "../js/lib/club"; export * from "../js/lib/week"; export * from "../js/lib/objectives"; export * from "../js/lib/photo"; export { default as goal } from "../js/lib/goal";
   export { default as sessions } from "../js/lib/sessions"; export { default as levels } from "../js/lib/levels";`,
);
try {
  execSync(`npx -y esbuild@0.24.0 ${entry} --bundle --platform=node --format=cjs --log-level=error --outfile=${out}`);
} finally {
  fs.unlinkSync(entry);
}
const m = require(out);
fs.unlinkSync(out);

let passed = 0;
const check = (name, fn) => {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
};

console.log("Paces");
check("VMA 15 at 100 % is 4:00 /km", () => assert.strictEqual(m.formatPace(m.paceFromSpeed(m.speedAt(15, 100))), "4:00 /km"));
check("400 m at 100 % of VMA 15 takes 1:36", () => assert.strictEqual(m.formatClock(m.repTime(400, 15, 100)), "1:36"));
check("200 m at 105 % of VMA 15 takes 0:46", () => assert.strictEqual(m.formatClock(m.repTime(200, 15, 105)), "0:46"));
check("30\" at 105 % of VMA 16 covers 140 m", () => assert.strictEqual(Math.round(m.repDistance(30, 16, 105)), 140));
check("1 550 m in the 6' test is VMA 15.5", () => assert.strictEqual(m.vmaFromSixMinutes(1550), 15.5));
check("clock parsing", () => {
  assert.strictEqual(m.parseClock("41:23"), 2483);
  assert.strictEqual(m.parseClock("1:32:10"), 5530);
  assert.strictEqual(m.parseClock("41'23"), 2483);
  assert.strictEqual(m.parseClock("41:75"), null);
  assert.strictEqual(m.parseClock("abc"), null);
});
check("decimal parsing takes a French comma", () => assert.strictEqual(m.parseDecimal("15,5"), 15.5));
check("durations read the French way", () => {
  assert.strictEqual(m.formatDuration(60), "1'");
  assert.strictEqual(m.formatDuration(90), "1'30");
  assert.strictEqual(m.formatDuration(30), '30"');
});
check("Notion zones at VMA 18.3 match the Progression Plan paces", () => {
  const z = (id) => m.zonePace(18.3, m.zoneById(id).vma);
  assert.strictEqual(z("ga"), "4:49 – 5:12 /km"); // Notion: 4:48–5:13
  assert.strictEqual(z("endurance"), "4:33 – 4:58 /km"); // Notion: 4:35–5:00
  assert.strictEqual(z("mp"), "4:06 – 4:15 /km"); // Notion: 4:05–4:15
  assert.strictEqual(z("lt"), "3:41 – 3:46 /km"); // Notion: 3:40–3:47
  assert.strictEqual(z("vo2"), "3:23 – 3:32 /km"); // Notion: 3:22–3:31
  assert.strictEqual(z("recovery"), "> 5:17 /km"); // Notion: slower than 5:15
  assert.strictEqual(z("zone2"), "FC uniquement");
});
check("Notion HR zones at HRmax 202 match the bpm column", () => {
  const h = (id) => m.zoneHeartRate(202, m.zoneById(id).hr);
  assert.strictEqual(h("recovery"), "< 154 bpm");
  assert.strictEqual(h("zone2"), "121 – 141 bpm");
  assert.strictEqual(h("ga"), "141 – 164 bpm");
  assert.strictEqual(h("endurance"), "149 – 170 bpm");
  assert.strictEqual(h("mp"), "160 – 178 bpm");
  assert.strictEqual(h("lt"), "162 – 184 bpm");
  assert.strictEqual(h("vo2"), "190 – 198 bpm");
  assert.strictEqual(h("speed"), null);
  assert.strictEqual(m.zoneHeartRate(undefined, [60, 70]), null);
});

console.log("Records");
check("best picks the fastest", () => {
  const records = { "10k": [{ seconds: 2700, date: "2026-01-01" }, { seconds: 2600, date: "2026-03-01" }] };
  assert.strictEqual(m.best(records, "10k").seconds, 2600);
  assert.strictEqual(m.best(records, "5k"), undefined);
});

console.log("Sessions");
const levelIds = m.levels.filter((l) => l.group === "club").map((l) => l.id);
const KNOWN = ["run", "vma", "easy", "jog", "walk", "test", "drills", "repeat", "steps", "rest", "note"];
const walk = (steps, where) =>
  steps.forEach((s, i) => {
    const at = `${where}[${i}]`;
    Object.keys(s).forEach((k) => assert.ok(KNOWN.includes(k), `${at}: unknown key "${k}"`));
    if (s.run !== undefined) assert.ok(typeof s.vma === "number", `${at}: a run needs vma`);
    if (typeof s.run === "string") assert.ok(m.toSeconds(s.run), `${at}: bad duration "${s.run}"`);
    ["easy", "jog", "walk", "test"].forEach((k) => s[k] && assert.ok(m.toSeconds(s[k]), `${at}: bad duration "${s[k]}"`));
    if (s.repeat) {
      walk(s.steps, `${at}.steps`);
      if (s.rest) walk([s.rest], `${at}.rest`);
    }
  });
const ids = new Set();
m.sessions.forEach((s) => {
  check(`${s.date} ${s.title}`, () => {
    assert.ok(!ids.has(s.id), `duplicate id ${s.id}`);
    ids.add(s.id);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(s.date), "date must be YYYY-MM-DD");
    levelIds.forEach((id) => {
      const plan = m.planFor(s, id);
      assert.ok(plan.main.length, `no main set for ${id}`);
      walk([...plan.warmup, ...plan.main, ...plan.cooldown], `${s.id}.${id}`);
    });
  });
});

console.log("Débuter");
check("three programmes, 6 weeks × 3 sessions, tests move up A → B → C → Level 3", () => {
  const ids = ["beginnerA", "beginnerB", "beginnerC"];
  ids.forEach((id, i) => {
    const sessions = m.programmeSessions(id);
    assert.strictEqual(sessions.length, 18);
    const test = sessions[17];
    assert.ok(test.test, `${id} ends with a test`);
    assert.strictEqual(test.next, ["beginnerB", "beginnerC", "level3"][i]);
    sessions.forEach((s) => assert.ok(m.sessionPlan(s).main.length, `${id} #${s.index} has steps`));
  });
  assert.strictEqual(m.sessionLabel(m.programmeSessions("beginnerA")[0]), "5×(1'/1')");
  assert.strictEqual(m.sessionLabel(m.programmeSessions("beginnerC")[17]), "30' continu");
});
check("questionnaire placement", () => {
  assert.strictEqual(m.suggestLevel({ runContinuous: "under5" }), "beginnerA");
  assert.strictEqual(m.suggestLevel({ runContinuous: "15to30" }), "beginnerC");
  assert.strictEqual(m.suggestLevel({ runContinuous: "over30", runsPerWeek: "once", fiveK: "none" }), "level3");
  assert.strictEqual(m.suggestLevel({ runContinuous: "over30", runsPerWeek: "twice", fiveK: "over30" }), "level2");
  assert.strictEqual(m.suggestLevel({ runContinuous: "over30", runsPerWeek: "once", fiveK: "under25" }), "level1");
});
check("session builder round-trips blocs ↔ steps", () => {
  const blocs = [{ repeat: 6, run: 400, unit: "m", vma: 100, rest: 60 }, { repeat: 1, run: 30, unit: "s", vma: 105, rest: 0 }];
  const steps = m.blocsToSteps(blocs);
  assert.deepStrictEqual(steps, [{ repeat: 6, steps: [{ run: 400, vma: 100 }, { jog: "1:00" }] }, { run: "0:30", vma: 105 }]);
  assert.deepStrictEqual(m.stepsToBlocs(steps), blocs);
  const pyr = [{ run: 200, vma: 105 }, { jog: "1:00" }, { run: 400, vma: 100 }, { jog: "1:00" }, { run: 400, vma: 100 }, { jog: "1:00" }, { run: 200, vma: 105 }];
  assert.strictEqual(m.stepsToBlocs(pyr).length, 4);
  assert.strictEqual(m.stepsToBlocs([{ test: "6:00" }]), null);
});

check("predictions at VMA 18.3: 10 km 36:26, marathon 2:52:56", () => {
  const at = (id) => m.predict(18.3, m.PREDICTIONS.find((r) => r.id === id));
  assert.strictEqual(at("10k").time, "36:26");
  assert.strictEqual(at("marathon").time, "2:52:56");
  assert.strictEqual(at("5k").pace, "3:27 /km");
  assert.strictEqual(m.zonePercent([70, 81], "FC max"), "70–81 % FC max");
});
check("Wodify booking: opens 7 days before, ticks and past sessions", () => {
  assert.deepStrictEqual(m.bookingState("2026-11-06", "2026-10-25"), { status: "soon", opensOn: "2026-10-30" });
  assert.deepStrictEqual(m.bookingState("2026-11-06", "2026-10-30"), { status: "open" });
  assert.deepStrictEqual(m.bookingState("2026-11-06", "2026-11-02", true), { status: "booked" });
  assert.deepStrictEqual(m.bookingState("2026-11-06", "2026-11-07"), { status: "past" });
  assert.strictEqual(m.bookingOpensOn("2026-12-04"), "2026-11-27");
});
check("group goal: 10 km target at VMA 15 is 44:27, days count down", () => {
  assert.strictEqual(m.targetTime(m.goal.distances[0], 15), "44:27");
  assert.strictEqual(m.targetTime(m.goal.distances[0], undefined), null);
  assert.strictEqual(m.daysToGo("2026-12-19"), 1);
  assert.strictEqual(m.daysToGo("2026-12-21"), -1);
});

/* Members-only sign-in: a profile from the website lands on the phone the way Sean set it */
const fakePhone = (prefs) => {
  const p = { records: {}, vmaHistory: [], ...prefs };
  return {
    p,
    ctx: {
      get preferences() { return { ...p }; },
      setPreference: async (k, v) => { p[k] = v; },
      saveVma: async (value, source, date = "2026-10-26") => { p.vmaHistory = [...p.vmaHistory, { value, date, source }]; p.vma = value; },
      saveRecord: async (id, seconds, date) => { p.records = { ...p.records, [id]: [...(p.records[id] || []), { seconds, date }] }; },
    },
  };
};
const profile = (extra) => ({ status: "ok", id: "row-1", name: "Camille Dupont", level: "beginnerC", start_week: 3,
  answers: { runContinuous: "15to30", goal: "run30", bests: { "5k": "28:30", "10k": "" } },
  vma: { vma: 12.4, test_m: 1240, hr_max: 186, history: [{ at: "2026-10-30T17:10:00Z", vma: 12.4, test_m: 1240 }] }, ...extra });
const syncWith = async (phone, prof, opts) => {
  const realFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => prof });
  try { return await m.syncMember(phone.ctx, "06 12 34 56 78", "Camille", opts); } finally { global.fetch = realFetch; }
};
const asyncChecks = [];
const checkAsync = (name, fn) => asyncChecks.push([name, fn]);
checkAsync("sign-in: Débuter C placed at week 3, answers, best and VMA from the website", async () => {
  const ph = fakePhone({});
  assert.strictEqual(await syncWith(ph, profile(), { first: true }), "ok");
  assert.strictEqual(ph.p.level, "beginnerC");
  assert.strictEqual(ph.p.programme.beginnerC, 6); // week 3 = session index 6
  assert.strictEqual(m.nextSession(ph.p, "beginnerC").week, 3);
  assert.strictEqual(ph.p.name, "Camille Dupont");
  assert.strictEqual(ph.p.runContinuous, "15to30");
  assert.deepStrictEqual(ph.p.records["5k"], [{ seconds: 1710, date: null }]);
  assert.strictEqual(ph.p.records["10k"], undefined);
  assert.strictEqual(ph.p.vma, 12.4);
  assert.strictEqual(ph.p.vmaHistory[0].source, "test");
  assert.strictEqual(ph.p.vmaHistory[0].date, "2026-10-30");
  assert.strictEqual(ph.p.hrMax, 186);
  assert.strictEqual(ph.p.member.startWeek, 3);
});
checkAsync("re-check at launch: runner's own progress is kept until Sean changes something", async () => {
  const ph = fakePhone({});
  await syncWith(ph, profile(), { first: true });
  ph.p.programme = { beginnerC: 10 }; // they've done a few sessions since
  await syncWith(ph, profile(), {});
  assert.strictEqual(ph.p.programme.beginnerC, 10);
  ph.p.level = "level3"; // passed the Débuter C test in the app
  await syncWith(ph, profile(), {});
  assert.strictEqual(ph.p.level, "level3");
});
checkAsync("re-check at launch: Sean moves the runner → the phone follows", async () => {
  const ph = fakePhone({});
  await syncWith(ph, profile(), { first: true });
  await syncWith(ph, profile({ start_week: 5 }), {});
  assert.strictEqual(ph.p.programme.beginnerC, 12);
  await syncWith(ph, profile({ level: "level2", start_week: null }), {});
  assert.strictEqual(ph.p.level, "level2");
});
checkAsync("re-check at launch: a newer VMA logged in the app beats an older one from the site", async () => {
  const ph = fakePhone({});
  await syncWith(ph, profile(), { first: true });
  await ph.ctx.saveVma(13.1, "test", "2026-12-04");
  await syncWith(ph, profile(), {});
  assert.strictEqual(ph.p.vma, 13.1);
});
checkAsync("pending / unknown runners don't get in", async () => {
  const ph = fakePhone({});
  assert.strictEqual(await syncWith(ph, { status: "pending" }, { first: true }), "pending");
  assert.strictEqual(await syncWith(ph, { status: "none" }, { first: true }), "none");
  assert.strictEqual(ph.p.member, undefined);
});

const pyramid = m.sessions.find((s) => s.id === "2026-11-06-vo2-10k");
check("coach hub: a roster row becomes an athlete, bests merged, VMA newest wins", () => {
  const a = m.toAthlete({
    id: "x", name: "Léa Martin", level: "level2", start_week: null,
    answers: { bests: { "10k": "52:30" }, goal: "race", races: "10 km", injury: "yes", injuryDetail: "Genou droit" },
    vma: { vma: "14.5", test_m: 1450, history: [{ at: "2026-10-30T16:00:00Z", vma: 14.5 }], updated_at: "2026-10-30T16:00:00Z" },
    progress: { done: { a: "2026-11-06", b: "2026-11-13" }, records: { "10k": 3000, "5k": 1500 }, raceGoal: { distance: "10k", seconds: 2940 }, vma: { value: 15, date: "2026-11-13", source: "test" }, at: "2026-11-14T10:00:00Z" },
  });
  assert.strictEqual(a.vma, 15);
  assert.strictEqual(a.vmaDate, "2026-11-13");
  assert.strictEqual(a.bests["10k"], 3000); // faster than the typed 52:30
  assert.strictEqual(a.bests["5k"], 1500);
  assert.strictEqual(a.sessionsDone, 2);
  assert.strictEqual(m.goalLabel(a), "Course du Bout de l'An · 10 km en 49:00");
  assert.strictEqual(m.injuryLabel(a), "Genou droit");
  assert.strictEqual(m.vmaDateLabel(a), "Test du 13/11/2026");
  const empty = m.toAthlete({ id: "y", name: "Zoé", answers: {}, progress: {} });
  assert.strictEqual(empty.vma, null);
  assert.strictEqual(empty.sessionsDone, null); // phone never reported
  assert.strictEqual(m.goalLabel(empty), "—");
  assert.strictEqual(m.vmaDateLabel(empty), "—");
  assert.deepStrictEqual(m.bestRows(empty).map((r) => r.time), ["—", "—", "—", "—"]);
  assert.deepStrictEqual(m.trainingPaces(null), []);
});

check("coach hub: grouped by level in order, targets from the VMA, structure in one line", () => {
  const list = [
    { id: "1", name: "Zoé", level: "level3" }, { id: "2", name: "Ana", level: "level1" },
    { id: "3", name: "Bob", level: "level3" }, { id: "4", name: "Cat", level: "beginnerB" }, { id: "5", name: "Dan", level: null },
  ];
  const groups = m.groupByLevel(list);
  assert.deepStrictEqual(groups.map((g) => g.id), ["level1", "level3", "beginnerB", "none"]);
  assert.deepStrictEqual(groups[1].athletes.map((a) => a.name), ["Bob", "Zoé"]);
  const vo2 = m.sessions.find((s) => s.id === "2026-11-06-vo2-10k");
  const t = m.sessionTargets(vo2, "level1", 15);
  assert.deepStrictEqual(t, [{ label: "1 km", reps: 5, target: "4:27", pace: "4:27 /km", pct: 90 }]);
  assert.deepStrictEqual(m.sessionTargets(vo2, "level1", null), []);
  const test = m.sessions.find((s) => s.kind === "test");
  assert.deepStrictEqual(m.sessionTargets(test, "level3", 14), [{ label: "Test 6'", reps: 1, target: "1400 m", pace: "à battre", pct: 100 }]);
  assert.deepStrictEqual(m.sessionTargets(vo2, "beginnerA", 15), []);
  const thirty = m.sessions.find((s) => s.id === "2026-11-13-30-30");
  assert.deepStrictEqual(m.sessionTargets(thirty, "level2", 15), [{ label: "30\"", reps: 12, target: "125 m", pace: "4:00 /km", pct: 100 }]);
  assert.strictEqual(m.structureLine(vo2.levels.level1), "5 × 1 km à 90 %, entre les séries 2' marche");
  assert.strictEqual(m.structureLine(thirty.levels.level3), "2 × 4 × (30\" à 100 % + 30\" trot), entre les séries 3' trot");
  assert.strictEqual(m.sessionStructure(vo2)[0].text, "15' footing · Gammes");
});

console.log(`\nExample — ${pyramid.title}, Level 2, VMA 15 (${m.totalLabel(pyramid, "level2", 15)}):`);
const print = (row, indent = "  ") => {
  console.log(`${indent}${row.title}${row.meta ? `  ${row.meta}` : ""}${row.target ? `  → ${row.target}` : ""}${row.sub ? `  (${row.sub})` : ""}`);
  (row.children || []).forEach((c) => print(c, indent + "   "));
  if (row.rest) print({ ...row.rest, title: `entre les séries : ${row.rest.title}` }, indent + "   ");
};
m.planFor(pyramid, "level2").main.forEach((s) => print(m.describeStep(s, 15)));

console.log("\nObjectives, countdown, photo, Wodify");
check("% VMA by distance follows the predictions", () => {
  assert.strictEqual(m.vmaShare(5000), 95);
  assert.strictEqual(m.vmaShare(10000), 90);
  assert.strictEqual(m.vmaShare(42195), 80);
  assert.strictEqual(m.vmaShare(15000), 87.7);
});
check("marathon at VMA 15 is 3:30:59", () => assert.strictEqual(m.formatClock(m.vmaRaceSeconds(42195, 15)), "3:30:59"));
check("dates JJ/MM/AAAA, future allowed", () => {
  assert.strictEqual(m.parseDayKey("22/03/2027"), "2027-03-22");
  assert.strictEqual(m.parseDayKey("31/02/2027"), null);
  assert.strictEqual(m.daysBetween("2026-10-26", "2026-12-20"), 55);
});
check("countdown follows my race, else the club race", () => {
  const club = m.countdownRace({}, "2026-10-26");
  assert.strictEqual(club.kind, "club");
  assert.strictEqual(club.days, 55);
  const mine = m.countdownRace({ myRace: { name: "Marathon de Rome", place: "Rome", date: "2027-03-21", metres: 42195 } }, "2026-10-26");
  assert.strictEqual(mine.kind, "mine");
  assert.strictEqual(m.countdownRace({}, "2026-10-26", { clubLevel: false }), null);
  // own race long gone → back to the club race
  assert.strictEqual(m.countdownRace({ myRace: { name: "X", date: "2026-09-01", metres: 10000 } }, "2026-10-26").kind, "club");
});
check("phases: build, race week, race day, after", () => {
  assert.deepStrictEqual([10, 7, 1, 0, -3].map(m.racePhase), ["build", "raceweek", "raceweek", "raceday", "after"]);
});
check("cycle dots: the Fridays up to the club race", () => {
  const race = m.countdownRace({}, "2026-11-10");
  const dots = m.cycleDots(m.sessions, race, "2026-11-10");
  assert.ok(dots.length >= 2 && dots.every((d) => d.date <= "2026-12-20"));
  assert.ok(/^semaine \d+\/\d+$/.test(m.cycleLabel(dots)));
  assert.strictEqual(m.weeksLabel(120), "dans 17 semaines");
});
check("photo search words: own words, landmark, else city", () => {
  assert.strictEqual(m.photoQueryFor({ place: "Rome" }), "Rome Colosseum");
  assert.strictEqual(m.photoQueryFor({ place: "Hendaye" }), "Hendaye ville");
  assert.strictEqual(m.photoQueryFor({ place: "Rome", photoQuery: "Rome Trevi" }), "Rome Trevi");
});
check("Commons results: landscape JPEGs only, credit kept", () => {
  const json = { query: { pages: {
    1: { index: 2, imageinfo: [{ mime: "image/jpeg", width: 4000, height: 2600, thumburl: "https://x/b.jpg", descriptionurl: "https://c/b", extmetadata: { Artist: { value: "<a href='x'>Jane Doe</a>" }, LicenseShortName: { value: "CC BY-SA 4.0" } } }] },
    2: { index: 1, imageinfo: [{ mime: "image/jpeg", width: 2000, height: 3000, thumburl: "https://x/portrait.jpg" }] },
    3: { index: 3, imageinfo: [{ mime: "image/png", width: 4000, height: 2000, thumburl: "https://x/c.png" }] },
  } } };
  const list = m.photosFrom(json);
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].uri, "https://x/b.jpg");
  assert.strictEqual(list[0].credit, "Photo : Jane Doe · CC BY-SA 4.0 · Wikimedia Commons");
});
check("goals reach the coach inside raceGoal", () => {
  assert.strictEqual(m.goalsReport({}), null);
  const r = m.goalsReport({ raceGoal: { distance: "10k", seconds: 2700 }, objectives: [{ id: "o", text: "Sub 25", done: true }] });
  assert.deepStrictEqual(r, { distance: "10k", seconds: 2700, myRace: null, objectives: [{ text: "Sub 25", done: true }] });
  const a = m.toAthlete({ id: 1, answers: {}, progress: { at: "2026-10-26", raceGoal: { myRace: { name: "Marathon de Rome", date: "2027-03-21", metres: 42195, seconds: 12600 }, objectives: [{ text: "Sub 25", done: false }] } } });
  assert.strictEqual(m.myRaceLabel(a), "Marathon de Rome · 21/03/2027 · Marathon en 3:30:00");
  assert.strictEqual(m.objectivesLabel(a), "Sub 25");
});
check("Wodify: app first, then store, then website", () => {
  const ios = m.wodifyTargets("ios").map((t) => t.url);
  assert.ok(ios[0].startsWith("wodify"));
  assert.ok(ios.includes("itms-apps://apps.apple.com/app/id1563729830"));
  assert.ok(ios[ios.length - 1].includes("app.wodify.com"));
  assert.ok(m.wodifyTargets("android").some((t) => t.url.startsWith("market://")));
});

console.log("Session logs");
check("a pace reads with : or ' and ignores /km", () => {
  assert.strictEqual(m.parsePace("4:12"), 252);
  assert.strictEqual(m.parsePace("4'12 /km"), 252);
  assert.strictEqual(m.parsePace("0:30"), null); // nobody runs 30 s/km
  assert.strictEqual(m.parsePace("abc"), null);
});
check("the target pace of 5 × 1000 m at 90 % of VMA 15 is 4:27 /km", () => {
  const session = { id: "t", levels: { level1: [{ repeat: 5, steps: [{ run: 1000, vma: 90 }], rest: { walk: "2:00" } }] } };
  assert.strictEqual(m.formatPace(m.targetPace(session, "level1", 15)), "4:27 /km");
  assert.strictEqual(m.targetPace(session, "level1", null), null);
  assert.strictEqual(m.targetPace(session, "beginnerA", 15), null);
});
check("a timed rep counts for the distance the VMA predicts", () => {
  const session = { id: "t", levels: { level2: [{ repeat: 4, steps: [{ run: "0:30", vma: 105 }] }] } };
  assert.strictEqual(m.formatPace(m.targetPace(session, "level2", 16)), m.formatPace(m.paceFromSpeed(m.speedAt(16, 105))));
});
check("pace gap reads +/− and 'à l'allure' within 3 s", () => {
  assert.strictEqual(m.paceGap(260, 252).label, "+0:08 /km");
  assert.strictEqual(m.paceGap(245, 252).label, "−0:07 /km");
  assert.strictEqual(m.paceGap(254, 252).label, "à l'allure");
  assert.strictEqual(m.paceGap(null, 252), null);
});
check("a log reads in one line", () => {
  assert.strictEqual(m.logLine({ pace: 252, feel: 4 }), "4:12 /km · Dur");
  assert.strictEqual(m.logLine({ feel: 2 }), "Tranquille");
  assert.strictEqual(m.logLine({}), "Faite");
});
check("the coach's log rows carry the target and sort newest first", () => {
  const sessions = [
    { id: "a", title: "A", date: "2026-11-06", levels: { level1: [{ run: 1000, vma: 90 }] } },
    { id: "b", title: "B", date: "2026-11-13", levels: { level1: [{ run: 1000, vma: 90 }] } },
  ];
  const rows = m.logRows({ level: "level1", vma: 15, logs: { a: { pace: 275, feel: 5 }, b: { pace: 266 } } }, sessions);
  assert.deepStrictEqual(rows.map((r) => r.sessionId), ["b", "a"]);
  assert.strictEqual(rows[1].gap.label, "+0:08 /km");
});
check("progress report carries the logs", () => {
  assert.deepStrictEqual(m.progressReport({ done: { a: "2026-11-06" }, log: { a: { pace: 252 } } }).logs, { a: { pace: 252 } });
});
check("done count includes a bare tick and a log", () => {
  assert.deepStrictEqual(m.doneCount([{ done: { a: "x" } }, { logs: { a: {} } }, {}], "a"), { done: 2, total: 3 });
});

console.log("Guided timer");
check("a walk-run flattens into warm-up, repeats and cool-down", () => {
  const plan = m.sessionPlan({ sets: 5, run: 1, walk: 1 });
  const t = m.timeline(plan);
  assert.strictEqual(t.length, 1 + 10 + 1);
  assert.deepStrictEqual(t.slice(0, 2).map((i) => [i.kind, i.seconds, i.phase]), [["walk", 300, "warmup"], ["run", 60, "main"]]);
  assert.strictEqual(m.totalOf(t), 300 + 600 + 300);
  assert.strictEqual(m.setLabel(t[3]), "2/5");
  assert.strictEqual(m.setLabel(t[0]), "");
});
check("a continuous run is one main interval", () => {
  const t = m.timeline(m.sessionPlan({ sets: 1, run: 15, walk: 0 }));
  assert.strictEqual(t.length, 3);
  assert.strictEqual(t[1].seconds, 900);
});
check("half minutes survive", () => {
  const t = m.timeline(m.sessionPlan({ sets: 2, run: 0.5, walk: 1 }));
  assert.strictEqual(t[1].seconds, 30);
});
check("position: inside, at a boundary, past the end", () => {
  const t = m.timeline(m.sessionPlan({ sets: 2, run: 1, walk: 1 }));
  assert.deepStrictEqual([m.positionAt(t, 10).index, m.positionAt(t, 10).remaining], [0, 290]);
  assert.strictEqual(m.positionAt(t, 300).index, 1); // first run starts exactly at 5'
  assert.strictEqual(m.positionAt(t, 359).remaining, 1);
  const end = m.positionAt(t, 10000);
  assert.strictEqual(end.done, true);
  assert.strictEqual(end.remaining, 0);
});
check("next label and countdown read in French", () => {
  const t = m.timeline(m.sessionPlan({ sets: 2, run: 1, walk: 1 }));
  assert.strictEqual(m.nextLabel(t, 0), "Ensuite : 1' course");
  assert.strictEqual(m.nextLabel(t, t.length - 1), "Ensuite : fin de séance");
  assert.strictEqual(m.formatCountdown(65), "1:05");
  assert.strictEqual(m.formatCountdown(0.2), "0:01");
});

console.log("Sorties du club — Je viens");
check("the week ahead holds one Tuesday and one Saturday, dated", () => {
  const list = m.upcoming("2026-11-02"); // a Monday
  assert.deepStrictEqual(list.map((o) => [o.key, o.date]), [["tue", "2026-11-03"], ["sat", "2026-11-07"]]);
  assert.strictEqual(list[0].id, "outing-tue-2026-11-03");
  assert.strictEqual(m.upcoming("2026-11-03")[0].date, "2026-11-03"); // today counts
});
check("outing days read as Aujourd'hui / Demain / Mardi 3 novembre", () => {
  const [tue] = m.upcoming("2026-11-02");
  assert.strictEqual(m.outingDay(tue, "2026-11-03"), "Aujourd'hui");
  assert.strictEqual(m.outingDay(tue, "2026-11-02"), "Demain");
  assert.strictEqual(m.outingDay(tue, "2026-10-30"), "Mardi 3 novembre");
});
check("who's coming: me first, others by name, label in French", () => {
  const rows = [
    { session_id: "o", device_id: "me", name: "Sean" },
    { session_id: "o", device_id: "b", name: "Mel" },
    { session_id: "o", device_id: "c", name: "Kamel" },
    { session_id: "other", device_id: "d", name: "Zoé" },
  ];
  const c = m.comingList(rows, "o", "me");
  assert.deepStrictEqual(c, { count: 3, me: true, names: ["Moi", "Kamel", "Mel"] });
  assert.strictEqual(m.comingLabel(c), "Toi, Kamel et Mel");
  assert.strictEqual(m.comingLabel(m.comingList(rows, "o", "zz")), "Kamel, Mel et Sean");
  assert.strictEqual(m.comingLabel(m.comingList([], "o", "me")), "Personne pour l'instant");
  assert.strictEqual(m.comingLabel(m.comingList(rows.slice(0, 1), "o", "me")), "Toi, pour l'instant");
  const many = [...rows, { session_id: "o", device_id: "e", name: "Ana" }, { session_id: "o", device_id: "f", name: "Bo" }];
  assert.strictEqual(m.comingLabel(m.comingList(many, "o", "zz")), "Ana, Bo, Kamel et 2 autres");
});

console.log("Mot du coach / Ils étaient là");
check("attendees read in French and leave me out", () => {
  assert.strictEqual(m.attendeesLabel(["Kamel", "Mel", "Théo"], "Sean Klein"), "Kamel, Mel et Théo");
  assert.strictEqual(m.attendeesLabel(["Kamel", "Mel", "Sean"], "Sean Klein"), "Kamel et Mel");
  assert.strictEqual(m.attendeesLabel(["Ana", "Bo", "Kamel", "Mel", "Zoé"]), "Ana, Bo et 3 autres");
  assert.strictEqual(m.attendeesLabel(["Sean"], "Sean"), "");
  assert.strictEqual(m.attendeesLabel([]), "");
});

console.log("Le groupe ce cycle");
check("the cycle starts at the first session, else 8 weeks back", () => {
  assert.strictEqual(m.cycleStart([{ date: "2026-11-06" }, { date: "2026-10-30" }], "2026-11-20"), "2026-10-30");
  assert.strictEqual(m.cycleStart([], "2026-11-20"), "2026-09-25");
});
check("pulse lines and passages read in French", () => {
  const lines = m.pulseLines({ runners: 14, sessions: 23, active: 11, tests: 9, passages: [{ name: "Mehdi", level: "level3" }] });
  assert.deepStrictEqual(lines.map((l) => `${l.value} ${l.label}`), ["14 coureurs dans le club", "23 séances faites par 11", "9 tests VMA enregistrés"]);
  assert.deepStrictEqual(m.passageLines({ passages: [{ name: "Mehdi", level: "level3" }] }), ["Mehdi → Level 3"]);
  assert.deepStrictEqual(m.pulseLines(null), []);
  assert.deepStrictEqual(m.pulseLines({ runners: 0, sessions: 0 }), []);
});
check("the progress report carries the phone's level", () => {
  assert.strictEqual(m.progressReport({ level: "level3" }).level, "level3");
});

console.log("Débuter — coming back after a gap");
check("a missed session changes nothing; a fortnight repeats; a month goes back a week; longer restarts", () => {
  const base = { level: "beginnerB", programme: { beginnerB: 7 }, programmeLog: { beginnerB: [{ index: 6, at: "2026-11-01" }] } };
  assert.strictEqual(m.gapPlan(base, "beginnerB", "2026-11-05"), null);
  assert.strictEqual(m.gapPlan(base, "beginnerB", "2026-11-08"), null); // exactly 7 days
  const rep = m.gapPlan(base, "beginnerB", "2026-11-11");
  assert.deepStrictEqual([rep.action, rep.from, rep.to, rep.days], ["repeat", 7, 6, 10]);
  const back = m.gapPlan(base, "beginnerB", "2026-11-21");
  assert.deepStrictEqual([back.action, back.to], ["back", 4]);
  const restart = m.gapPlan(base, "beginnerB", "2026-12-05");
  assert.deepStrictEqual([restart.action, restart.to], ["restart", 0]);
  assert.strictEqual(m.gapPlan({ level: "beginnerB", programme: { beginnerB: 3 } }, "beginnerB", "2026-12-05"), null); // nothing logged yet
});
check("a gap already answered is not proposed twice; back never goes below zero", () => {
  const p = { level: "beginnerA", programme: { beginnerA: 2 }, programmeLog: { beginnerA: [{ index: 1, at: "2026-11-01" }] } };
  assert.strictEqual(m.gapPlan(p, "beginnerA", "2026-11-21").to, 0);
  const answered = { ...p, programmeReturn: { beginnerA: { lastAt: "2026-11-01", accepted: false } } };
  assert.strictEqual(m.gapPlan(answered, "beginnerA", "2026-11-21"), null);
  assert.strictEqual(m.indexLabel(7), "semaine 3, séance 2");
});
check("the coach reads where a Débuter runner is", () => {
  const a = m.toAthlete({ id: 1, level: "beginnerC", answers: {}, progress: { at: "2026-11-20", programme: { index: 8, lastAt: "2026-11-08", return: { days: 12, action: "repeat", accepted: true, at: "2026-11-20" } } } });
  assert.strictEqual(m.beginnerLine(a, "2026-11-20"), "Séance 9/18 · dernière il y a 12 j · a refait la dernière après 12 j");
  assert.strictEqual(m.beginnerLine({ level: "level2", programme: null }, "2026-11-20"), "");
  assert.strictEqual(m.quietBeginners([a], "2026-11-20").length, 1);
  assert.strictEqual(m.quietBeginners([a], "2026-11-10").length, 0);
});
check("the progress report carries the Débuter place", () => {
  const r = m.progressReport({ level: "beginnerB", programme: { beginnerB: 5 }, programmeLog: { beginnerB: [{ index: 4, at: "2026-11-06" }] } });
  assert.deepStrictEqual(r.programme, { index: 5, lastAt: "2026-11-06", return: null });
  assert.strictEqual(m.progressReport({ level: "level1" }).programme, null);
});

console.log("Ma semaine — sized for the runner");
check("the base comes from the 3-month volume, else the level", () => {
  assert.strictEqual(m.baseKm({ kmWeek: "20to40", level: "level3" }), 30);
  assert.strictEqual(m.baseKm({ kmWeek: "0", level: "level1" }), 8);
  assert.strictEqual(m.baseKm({ level: "level1" }), 30);
  assert.strictEqual(m.baseKm({ level: "level3" }), 12);
});
check("volume steps +5 % a week, eases week 4, caps at +25 %", () => {
  assert.strictEqual(m.volumeFactor(1), 1);
  assert.strictEqual(m.volumeFactor(3), 1.1);
  assert.strictEqual(m.volumeFactor(4), 0.85);
  assert.strictEqual(Math.round(m.volumeFactor(5) * 100), 115);
  assert.strictEqual(m.volumeFactor(12), 1.25);
});
check("the cycle week counts from the first club session", () => {
  const sessions = [{ date: "2026-10-30" }, { date: "2026-11-06" }];
  assert.strictEqual(m.cycleWeek(sessions, "2026-10-29"), 1);
  assert.strictEqual(m.cycleWeek(sessions, "2026-11-01"), 1);
  assert.strictEqual(m.cycleWeek(sessions, "2026-11-13"), 3);
});
check("two hard logs or a missed Friday hold the volume", () => {
  const sessions = [{ id: "a", date: "2026-10-30" }, { id: "b", date: "2026-11-06" }];
  assert.strictEqual(m.holdCheck({ log: { a: { at: "2026-10-30", feel: 4 }, b: { at: "2026-11-06", feel: 5 } }, done: { a: 1, b: 1 } }, sessions, "2026-11-10").hold, true);
  assert.strictEqual(m.holdCheck({ log: { a: { at: "2026-10-30", feel: 3 } }, done: { a: 1 } }, sessions, "2026-11-10").hold, true); // b missed
  assert.strictEqual(m.holdCheck({ log: { a: { at: "2026-10-30", feel: 3 }, b: { at: "2026-11-06", feel: 4 } }, done: { a: 1, b: 1 } }, sessions, "2026-11-10").hold, false);
});
check("a 30 km/week runner at VMA 15 gets a week that adds up to about 30 km, long run largest", () => {
  const { days, volume } = m.weekPlan({ level: "level2", kmWeek: "20to40", vma: 15, runsWeek: 4, runsPerWeek: "more" });
  assert.strictEqual(volume.week, 1);
  assert.ok(Math.abs(volume.km - 30) <= 4, `km ${volume.km}`);
  const long = days.find((d) => d.kind === "long");
  assert.ok(days.filter((d) => d.kind !== "club").every((d) => d.minutes <= long.minutes));
  assert.ok(days.every((d) => d.kind === "club" || d.minutes % 5 === 0));
  assert.strictEqual(days.map((d) => d.day).join(","), "Mardi,Jeudi,Vendredi,Dimanche");
});
check("someone new to running is capped at 3 runs with no strides", () => {
  const { days } = m.weekPlan({ level: "level3", kmWeek: "under10", runsWeek: 5, runsPerWeek: "once" });
  assert.strictEqual(days.length, 3);
  assert.ok(!days.some((d) => d.title.includes("lignes droites")));
  const { days: exp } = m.weekPlan({ level: "level2", kmWeek: "20to40", runsWeek: 3, runsPerWeek: "more" });
  assert.ok(exp.some((d) => d.title.includes("lignes droites")));
});
check("the volume line reads in French", () => {
  assert.strictEqual(m.volumeLine({ km: 32, week: 3, factor: 1.1, hold: false }), "≈ 32 km cette semaine · semaine 3 du cycle · +10 %");
  assert.strictEqual(m.volumeLine({ km: 30, week: 3, factor: 1.05, hold: true }), "≈ 30 km cette semaine · semaine 3 du cycle · volume maintenu");
  assert.strictEqual(m.volumeLine({ km: 24, week: 4, factor: 0.85, hold: false }), "≈ 24 km cette semaine · semaine 4 du cycle · −15 %");
});

(async () => {
  for (const [name, fn] of asyncChecks) {
    try { await fn(); passed++; } catch (e) { console.error(`✗ ${name}`); throw e; }
  }
  console.log(`\n${passed} checks passed`);
})().catch(() => process.exit(1));
