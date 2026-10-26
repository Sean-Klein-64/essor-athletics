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
   export * from "../js/lib/beginner"; export * from "../js/lib/placement"; export * from "../js/lib/editor"; export * from "../js/lib/goal"; export * from "../js/lib/booking"; export * from "../js/lib/member"; export { default as goal } from "../js/lib/goal";
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
console.log(`\nExample — ${pyramid.title}, Level 2, VMA 15 (${m.totalLabel(pyramid, "level2", 15)}):`);
const print = (row, indent = "  ") => {
  console.log(`${indent}${row.title}${row.meta ? `  ${row.meta}` : ""}${row.target ? `  → ${row.target}` : ""}${row.sub ? `  (${row.sub})` : ""}`);
  (row.children || []).forEach((c) => print(c, indent + "   "));
  if (row.rest) print({ ...row.rest, title: `entre les séries : ${row.rest.title}` }, indent + "   ");
};
m.planFor(pyramid, "level2").main.forEach((s) => print(m.describeStep(s, 15)));

(async () => {
  for (const [name, fn] of asyncChecks) {
    try { await fn(); passed++; } catch (e) { console.error(`✗ ${name}`); throw e; }
  }
  console.log(`\n${passed} checks passed`);
})().catch(() => process.exit(1));
