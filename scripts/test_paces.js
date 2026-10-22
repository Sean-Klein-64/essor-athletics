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
check("EF zone for VMA 15 is 5:20 – 6:09 /km", () => assert.strictEqual(m.zonePace(15, [65, 75]), "5:20 – 6:09 /km"));

console.log("Records");
check("best picks the fastest", () => {
  const records = { "10k": [{ seconds: 2700, date: "2026-01-01" }, { seconds: 2600, date: "2026-03-01" }] };
  assert.strictEqual(m.best(records, "10k").seconds, 2600);
  assert.strictEqual(m.best(records, "5k"), undefined);
});

console.log("Sessions");
const levelIds = m.levels.map((l) => l.id);
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

const pyramid = m.sessions.find((s) => s.kind === "pyramid");
console.log(`\nExample — ${pyramid.title}, Level 2, VMA 15 (${m.totalLabel(pyramid, "level2", 15)}):`);
const print = (row, indent = "  ") => {
  console.log(`${indent}${row.title}${row.meta ? `  ${row.meta}` : ""}${row.target ? `  → ${row.target}` : ""}${row.sub ? `  (${row.sub})` : ""}`);
  (row.children || []).forEach((c) => print(c, indent + "   "));
  if (row.rest) print({ ...row.rest, title: `entre les séries : ${row.rest.title}` }, indent + "   ");
};
m.planFor(pyramid, "level2").main.forEach((s) => print(m.describeStep(s, 15)));

console.log(`\n${passed} checks passed`);
