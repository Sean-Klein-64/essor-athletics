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
   export * from "../js/lib/beginner"; export * from "../js/lib/placement"; export * from "../js/lib/editor";
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
  const pyr = m.sessions.find((s) => s.kind === "pyramid").levels.level3;
  assert.strictEqual(m.stepsToBlocs(pyr).length, 4);
  assert.strictEqual(m.stepsToBlocs([{ test: "6:00" }]), null);
});

const pyramid = m.sessions.find((s) => s.kind === "pyramid");
console.log(`\nExample — ${pyramid.title}, Level 2, VMA 15 (${m.totalLabel(pyramid, "level2", 15)}):`);
const print = (row, indent = "  ") => {
  console.log(`${indent}${row.title}${row.meta ? `  ${row.meta}` : ""}${row.target ? `  → ${row.target}` : ""}${row.sub ? `  (${row.sub})` : ""}`);
  (row.children || []).forEach((c) => print(c, indent + "   "));
  if (row.rest) print({ ...row.rest, title: `entre les séries : ${row.rest.title}` }, indent + "   ");
};
m.planFor(pyramid, "level2").main.forEach((s) => print(m.describeStep(s, 15)));

console.log(`\n${passed} checks passed`);
