# Essor Athletics

The run club app for CrossFit Essor (Bayonne). iPhone and Android from one codebase.

- **Sign-up questionnaire** — the run club questionnaire is the first-run flow; the answers suggest a level, the runner confirms it. It also asks the average km/week over the last 3 months (`kmWeek`), which sets the runner's starting volume.
- **Ma semaine, sized for the runner** — Levels 1–3's week around Friday is built from their own 3-month volume (not their level), stepping +5 % a week with a lighter week 4 and a +25 % cap; it holds instead of stepping up when the last two logged sessions felt hard or last Friday was missed. Someone new to running is capped at 3 runs with no strides. Paces from their VMA zones. `js/lib/week.js`.
- **Sessions** — every Friday session, shown to each runner for their level (Level 3/2/1) with every rep turned into a time or distance from their VMA.
- **Séance faite** — after a session the runner logs how it went: average pace on the main set, feel (1–5), a short note. All optional; the tick alone still counts. Shown back to them on the session, and to the coaches.
- **Débuter A/B/C** — the three walk-run programmes from the Level System page, built in. The app keeps each beginner's place, checks the "ready?" rules before moving on, and the end-of-level test moves them up.
- **Sorties du club — "Je viens"** — the Tuesday 7h00 (Sean) and Saturday 10h00 (Arthur) group runs for the week ahead, on Home: one tap to say you're coming, and the first names of who else is. The coach view sees the full list. Rows live in Supabase's `attendance` table (schema.sql §1), one per phone per outing. Pattern and wording in `js/lib/outings.js`.
- **Mot du coach** — in the hub, a coach writes one line under a runner's logged session; it appears on that session's page in the runner's app ("Mot de Mel"). Kept in `coach_notes` (supabase/notes.sql).
- **Ils étaient là** — a past session shows the first names of everyone who logged it.
- **Le groupe ce cycle** — one card on Home: runners in the club, sessions logged (by how many), VMA tests recorded, and who moved up a level since the cycle began. `club_pulse()` in supabase/club.sql; first names only.
- **Le groupe** — buttons to the WhatsApp group and the Strava club (`COMMUNITY` in `js/lib/config.js`; a link left empty isn't shown).
- **Coming back after a gap (Débuter)** — the programme waits for a missed session, but not for a missed fortnight. From the days since the last session marked done: ≤ 7 nothing · 8–14 repeat the last session · 15–28 back a week · > 28 restart the level. Proposed on Home as a card the runner accepts ("D'accord") or declines ("J'ai couru de mon côté"); the coach sees the answer in the hub (`GAP_RULES` in `js/lib/beginner.js`).
- **Séance guidée** — a Débuter session run from the phone: one big countdown per walk/run interval, what comes next, a vibration at every switch and at the end. No watch, no GPS. Keeps the screen awake while it runs.
- **VMA and zones** — VMA typed in or from the 6-minute test (metres ÷ 100); the Pfitzinger zones from Sean's Running Progression Plan as % VMA (and bpm once a max HR is added).
- **Records** — 5 km, 10 km, semi, marathon: every time logged, best one marked.
- **Objectives** — the club race plus the runner's own ("Ma course": name, city, date, distance, goal time) and smaller goals they tick off. All visible to the coaches.
- **Race build** — the last two weeks before the club race taper inside Ma semaine (−30 % then −50 %, long run capped, strides kept). **Mon plan de course** turns the goal time (or the VMA's prediction) into a plan: pace, an easier first 2 km that still lands on the goal, cumulative km splits, the warm-up counted back from the gun, what to do if it goes wrong. **Jour J** is the day as a clock-following running order (wake → breakfast → meet → dossard → warm-up → corral → start → finish → coffee); on race day the current step is highlighted. Start times live in `goal.start` (`js/lib/goal.js`) — a placeholder, flagged "à confirmer", until the organiser publishes them. `js/lib/raceplan.js`.
- **Race countdown** — the hero card on Home: J-55, a photo of the race city (found on Wikimedia Commons, credit shown, "Autre photo" to swap), the cycle's Fridays as dots, race-week taper note + checklist, "Ajouter mon temps" after the race.
- **Coach view** — unlocked with the coach code (`js/lib/config.js`): write and edit sessions in the app, see who's coming, Sean's own week. "Vue membre" switches to what members see.
- No account yet: everything is saved on the phone. "Je viens" and coach-written sessions are shared through a small Supabase database once it's switched on (below). Until then they live on the phone that made them.

## How it's built

Expo (React Native), same base as Daily Move: Programme's components, transitions and type, with Essor's vert sapin as the accent and "essor" set in Archivo Black Italic.

| Where | What's in it |
| --- | --- |
| `js/App.js` | Theme, what's saved on the phone, which stack to show |
| `js/lib/sessions.js` | **The built-in sessions** — the seed; coaches add more in the app (format explained at the top of the file) |
| `js/lib/store.js` | Where sessions come from: built-in + Supabase + this phone's drafts |
| `js/lib/editor.js` | The session builder's blocs ↔ steps |
| `js/lib/levels.js`, `js/lib/placement.js` | The six levels, and questionnaire → level |
| `js/lib/beginner.js` | The Débuter A/B/C programmes |
| `js/lib/myWeek.js` | Sean's own week (coach view) |
| `js/lib/plan.js` | Turns a session into one runner's version (their level, their VMA) |
| `js/lib/paces.js` | VMA → speed → pace → target time |
| `js/lib/records.js` | Record distances |
| `js/lib/objectives.js`, `js/lib/photo.js` | Own race + objectives, countdown phases; the race-city photo |
| `js/lib/wodify.js` | Opens the Wodify app (schemes → store page → website) |
| `js/lib/attendance.js`, `js/lib/config.js` | "Je viens" and the shared list |
| `js/screens/` | Welcome, Question (questionnaire), Home, Session, Profile, Vma, Record, Programme, BeginnerSession, CoachCode, CoachHome, SessionEditor, MyWeek |
| `supabase/schema.sql` | The tables behind "Je viens" and coach-written sessions |
| `scripts/test_paces.js` | Checks the maths and that every session is written correctly |

## Writing sessions

Open `js/lib/sessions.js`, copy a session, change it. A rep is `{ run: 400, vma: 100 }` (400 m at 100 % VMA) or `{ run: "0:30", vma: 105 }`; recoveries are `{ jog: "1:00" }` / `{ walk: "1:00" }`; sets are `{ repeat: 2, steps: [...], rest: { jog: "3:00" } }`. Then:

```
node scripts/test_paces.js
```

It fails with the session and step if something's mistyped.

## Switching on the shared database

1. Create a free project at https://supabase.com/dashboard (region: Paris / eu-west-3).
2. SQL Editor → New query → paste `supabase/schema.sql` → Run.
3. Project Settings → API: copy the Project URL and the `anon` public key into `js/lib/config.js`.

## Who gets in (members only)

The app is for Essor members on the Run Club. Anyone can download it, but only approved runners can sign in:

1. The runner fills in the questionnaire on the website (`docs/index.html` → a row in `signups`).
2. When you add RUN CLUB to their Wodify membership, tick **app_access** on their row in Supabase (Table Editor → signups).
3. In the app they tap "Je cours avec Essor" and type the phone number + first name from their questionnaire. Their name, level, answers, bests and website VMA come straight in.

To place someone mid-programme, set **start_week** (1–6) on their row: e.g. level `beginnerC` + start_week `3` starts them at Débuter C week 3. Change level or start_week later and their app follows at its next launch. Untick app_access and they're signed out at their next launch.

Database setup for this: `supabase/members.sql` (run once). The VMA page: `supabase/vma.sql`.

## Booking

Bookings are in Wodify only, in the Wodify app: the button tries the app's URL schemes, then its App Store / Google Play page, then the website (`WODIFY_APP`, `WODIFY_BOOKING_URL` in `js/lib/config.js`). There is no in-app attendance list.

Still to fill in: `WODIFY_APP.androidPackage` — the `id=` from the Wodify app's Google Play link (Play Store → Wodify → Partager). Wodify doesn't publish a URL scheme; if one of the guesses in `schemes` turns out to work, keep just that one.

## Running it on your phone (first time, on a Mac)

Same setup as Daily Move (Xcode, Homebrew, `brew install node watchman cocoapods`). Then:

```
git clone https://github.com/Sean-Klein-64/essor-athletics.git
cd essor-athletics
npm install
npx expo run:ios --device
```

Android phone: install Android Studio once, turn on USB debugging on the phone, then `npx expo run:android --device`.

## Without a cable: cloud build → TestFlight

```
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --latest
```

Then App Store Connect → the app → TestFlight → add yourself as an internal tester; the TestFlight app on the phone installs it. Internal testers need no Apple review. Android: `--platform android --profile preview` gives an .apk to install directly.

## Getting it to members

- Build both in the cloud with EAS (`npx eas-cli@latest build --platform all`) — no Xcode needed for that.
- iPhone: TestFlight public link to start, App Store later. Android: Play Console internal/closed testing, or share the APK directly.
- New or changed sessions don't need a new download: `npx eas-cli@latest update` pushes them to everyone's app.

## Later

- **Garmin**: the Garmin Connect Training API pushes workouts to a runner's Garmin calendar and watch. Free, but Essor has to be approved as a business developer first — and as of autumn 2026 Garmin has paused new applications. Fallbacks: an aggregator such as Terra, or exporting .FIT workout files. The session format here is already step-by-step (distance or time + % VMA target), so it converts directly when the door opens.
- Coaches seeing everyone's VMA in the app (today: Supabase → vma table).

## Running it on your iPhone (on the Mac, same as Daily Move)

Xcode, Homebrew (`node watchman cocoapods`), your Apple ID in Xcode and Developer Mode on the iPhone are already set up from Daily Move. Plug the iPhone in with a cable, then in Terminal:

```
git clone https://github.com/Sean-Klein-64/essor-athletics.git
cd essor-athletics
npm install
npx expo run:ios --device
```

Pick your iPhone when it asks. The first build takes a while. If it stops on a signing error: `open ios/*.xcworkspace`, select the project → Signing & Capabilities → choose your Team, then run the last command again.

After that, every update is:

```
git pull
npm install
npx expo run:ios --device
```

## Checking the JavaScript without a phone

```
npx expo export --platform ios
npx expo export --platform android
node scripts/test_paces.js
```

## Coach Session Hub

In the coach view, tapping a session opens its hub: the session (date, time, Floride, structure, how many have logged it), then every runner expected, grouped by level, with their VMA and the times that session asks of them — and once they've logged it, what actually happened: their pace against the session's target ("+0:08 /km"), how it felt, their note. Tap a runner for their page (level, VMA and test date, every session logged with pace vs target, bests, goal race, injury notes from the questionnaire, training paces).

- Run `supabase/club.sql` once (after coach.sql and vma.sql) for the "Le groupe ce cycle" card.
- Run `supabase/notes.sql` once (after coach.sql) for the coach notes and "Ils étaient là".
- Run `supabase/coach.sql` once in Supabase → SQL Editor (run it again after pulling this version — `member_progress()` now keeps the logs). It adds `coach_athletes(code)` (the roster, gated by the coach code stored in `coach_settings`) and `member_progress()` (members' phones report sessions done and their logs, race goal, bests and VMA at launch and when they change).
- Who's in the list is decided in one place: `getSessionAttendees()` in `js/lib/coach.js`. Today it's everyone with `app_access`; Wodify bookings plug in there later.
- Lint: `npx expo lint` (ESLint config in `eslint.config.js`). Pure helpers are covered by `node scripts/test_paces.js`.
