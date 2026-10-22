/*
  Push a session written as JSON into the shared database, so it shows on
  every phone — the way to have Claude (or anyone) write sessions from a chat.

    node scripts/push_session.js session.json

  session.json is one session in the format of js/lib/sessions.js, e.g.
    { "id": "2026-11-20-1km", "date": "2026-11-20", "title": "1 km",
      "kind": "threshold", "summary": "…",
      "levels": { "level1": [ {"repeat": 8, "steps": [{"run":1000,"vma":85},{"jog":"1:30"}]} ], … } }
  Warm-up and cool-down default to the standard ones when left out.

  Needs SUPABASE_URL and SUPABASE_SERVICE_KEY in the environment (the
  service key, from Supabase → Project Settings → API — never put it in the app).
  The session is checked first, like scripts/test_paces.js does.
*/
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/push_session.js session.json");
  process.exit(1);
}
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("set SUPABASE_URL and SUPABASE_SERVICE_KEY first");
  process.exit(1);
}

const entry = path.join(__dirname, ".push.entry.js");
const out = path.join(__dirname, ".push.bundle.js");
fs.writeFileSync(entry, `export * from "../js/lib/plan"; export * from "../js/lib/editor"; export * from "../js/lib/paces";`);
execSync(`npx -y esbuild@0.24.0 ${entry} --bundle --platform=node --format=cjs --log-level=error --outfile=${out}`);
fs.unlinkSync(entry);
const m = require(out);
fs.unlinkSync(out);

const s = JSON.parse(fs.readFileSync(file, "utf8"));
const problems = [];
if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date || "")) problems.push("date must be YYYY-MM-DD");
if (!s.title) problems.push("title missing");
if (!s.id) s.id = `${s.date}-${m.slug(s.title || "seance")}`;
s.warmup = s.warmup || m.STANDARD_WARMUP;
s.cooldown = s.cooldown || m.STANDARD_COOLDOWN;
s.summary = s.summary || "";
const KNOWN = ["run", "vma", "easy", "jog", "walk", "test", "drills", "repeat", "steps", "rest", "note"];
const walk = (steps, where) =>
  (steps || []).forEach((st, i) => {
    Object.keys(st).forEach((k) => KNOWN.includes(k) || problems.push(`${where}[${i}]: unknown key "${k}"`));
    if (st.run !== undefined && typeof st.vma !== "number") problems.push(`${where}[${i}]: a run needs vma`);
    ["easy", "jog", "walk", "test"].forEach((k) => st[k] && !m.toSeconds(st[k]) && problems.push(`${where}[${i}]: bad duration "${st[k]}"`));
    if (typeof st.run === "string" && !m.toSeconds(st.run)) problems.push(`${where}[${i}]: bad duration "${st.run}"`);
    if (st.repeat) {
      walk(st.steps, `${where}[${i}].steps`);
      if (st.rest) walk([st.rest], `${where}[${i}].rest`);
    }
  });
["level1", "level2", "level3"].forEach((l) => {
  if (!s.levels?.[l]?.length) problems.push(`no main set for ${l}`);
  else walk(s.levels[l], l);
});
if (problems.length) {
  console.error("Not pushed:\n  " + problems.join("\n  "));
  process.exit(1);
}

// What a Level 2 runner at VMA 15 will see, as a sanity check
console.log(`${s.date} · ${s.title} · Level 2 at VMA 15 (${m.totalLabel(s, "level2", 15)}):`);
s.levels.level2.forEach((st) => {
  const row = m.describeStep(st, 15);
  const line = (r) => `${r.title}${r.meta ? "  " + r.meta : ""}${r.target ? "  → " + r.target : ""}`;
  console.log("  " + (row.kind === "repeat" ? `${row.title} ` + row.children.map(line).join(" / ") : line(row)));
});

const row = {
  id: s.id, date: s.date, title: s.title, kind: s.kind || null, summary: s.summary,
  body: { warmup: s.warmup, cooldown: s.cooldown, levels: s.levels },
  author: process.env.AUTHOR || "Claude", hidden: !!s.hidden, updated_at: new Date().toISOString(),
};
fetch(`${url}/rest/v1/sessions?on_conflict=id`, {
  method: "POST",
  headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
  body: JSON.stringify(row),
}).then(async (r) => {
  if (!r.ok) {
    console.error(`Supabase said ${r.status}: ${await r.text()}`);
    process.exit(1);
  }
  console.log(`Pushed ${s.id} — on every phone at next open.`);
});
