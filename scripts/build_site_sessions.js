/*
  Copies the sessions from js/lib/sessions.js into docs/vma.html, so the
  website's "Ta prochaine séance" always matches the app.
  Run after changing a session:  node scripts/build_site_sessions.js
*/
const fs = require("fs");
const path = require("path");
const os = require("os");

const root = path.join(__dirname, "..");
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "essor-")), "sessions.mjs");
fs.copyFileSync(path.join(root, "js/lib/sessions.js"), tmp);

import(tmp).then(({ default: sessions }) => {
  const page = path.join(root, "docs/vma.html");
  const html = fs.readFileSync(page, "utf8");
  const block = `/* SESSIONS:START */\nconst SESSIONS = ${JSON.stringify(sessions)};\n/* SESSIONS:END */`;
  const next = html.replace(/\/\* SESSIONS:START \*\/[\s\S]*?\/\* SESSIONS:END \*\//, () => block);
  if (next === html && !html.includes(block)) throw new Error("SESSIONS markers not found in docs/vma.html");
  fs.writeFileSync(page, next);
  console.log(`docs/vma.html: ${sessions.length} sessions`);
});
