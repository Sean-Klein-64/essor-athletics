# Essor Athletics

The run club app for CrossFit Essor (Bayonne). iPhone and Android from one codebase.

- **Sign-up questionnaire** — the run club questionnaire is the first-run flow; the answers suggest a level, the runner confirms it.
- **Sessions** — every Friday session, shown to each runner for their level (Level 3/2/1) with every rep turned into a time or distance from their VMA.
- **Débuter A/B/C** — the three walk-run programmes from the Level System page, built in. The app keeps each beginner's place, checks the "ready?" rules before moving on, and the end-of-level test moves them up.
- **VMA and zones** — VMA typed in or from the 6-minute test (metres ÷ 100); the Pfitzinger zones from Sean's Running Progression Plan as % VMA (and bpm once a max HR is added).
- **Records** — 5 km, 10 km, semi, marathon: every time logged, best one marked.
- **Objectives** — the club race plus the runner's own ("Ma course": name, city, date, distance, goal time) and smaller goals they tick off. All visible to the coaches.
- **Race countdown** — the hero card on Home: J-55, a photo of the race city (found on Wikimedia Commons, credit shown, "Autre photo" to swap), the cycle's Fridays as dots, race-week taper note + checklist, "Ajouter mon temps" after the race.
- **Coach view** — unlocked with the coach code (`js/lib/config.js`): write and edit sessions in the app, the session hub (who's booked, their paces, each athlete's page), Sean's own week. "Vue membre" switches to what members see.
- **Members only** — a runner signs in with the phone number and first name from their questionnaire once Sean has opened their access (below). Everything else is saved on the phone; coach-written sessions, VMA from the website and the coaches' view of each runner go through a small Supabase database.

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
| `js/lib/wodify.js`, `js/lib/booking.js` | Opens the Wodify app (schemes → store page → website); booking windows |
| `js/lib/member.js`, `js/lib/coach.js` | Members-only sign-in and the launch re-check; the coaches' roster and progress reports |
| `js/lib/week.js` | The rest of a runner's week around the Friday club session |
| `js/lib/config.js` | Supabase keys, coach code, Wodify links and booking rules |
| `js/screens/` | Welcome, Question (questionnaire), SignIn, Home, Session, Week, Profile, Vma, Record, Objectives, MyRace, Goal, Programme, BeginnerSession, CoachCode, CoachHome, CoachSession, CoachAthlete, SessionEditor, MyWeek |
| `supabase/*.sql` | `schema.sql` sessions, `members.sql` sign-ups + app access, `vma.sql` the website VMA page, `coach.sql` roster + progress, `planning.sql` the coaches' planning page |
| `docs/` | The GitHub Pages site: `index.html` sign-up questionnaire, `vma.html` my VMA, `app.html` the members' download page, `planning/` coaches' timetable |
| `scripts/test_paces.js` | Checks the maths and that every session is written correctly |

## Writing sessions

Open `js/lib/sessions.js`, copy a session, change it. A rep is `{ run: 400, vma: 100 }` (400 m at 100 % VMA) or `{ run: "0:30", vma: 105 }`; recoveries are `{ jog: "1:00" }` / `{ walk: "1:00" }`; sets are `{ repeat: 2, steps: [...], rest: { jog: "3:00" } }`. Then:

```
node scripts/test_paces.js
```

It fails with the session and step if something's mistyped.

## Switching on the shared database

Already done for project `essor-athletics` (keys in `js/lib/config.js`). To recreate it from scratch: create a free project at https://supabase.com/dashboard (region: Paris / eu-west-3), run each file in `supabase/` in the SQL Editor (`schema.sql` first), then copy the Project URL and the `anon` public key into `js/lib/config.js`, `docs/index.html` and `docs/vma.html`.

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

## Getting it to members (members-only download)

Anyone could download a public app; the sign-in gate is what keeps it members-only. The download itself still stays out of public view: **TestFlight** on iPhone, a **Google Play internal test** on Android. Both are built in the cloud with EAS — no Xcode needed. The members' page is `docs/app.html` → [sean-klein-64.github.io/essor-athletics/app.html](https://sean-klein-64.github.io/essor-athletics/app.html) (not linked from the site; share it in the run club WhatsApp group). Its two buttons say "Bientôt disponible" until `IOS_LINK` and `ANDROID_LINK` at the bottom of the file are filled in.

### Once, from the Mac (≈ 1 h, mostly waiting)

```
npm install
npx eas-cli@latest login            # Expo account (free)
npx eas-cli@latest init             # writes extra.eas.projectId into app.json — commit it
```

**iPhone → TestFlight**

1. App Store Connect → My Apps → **+** → New App: iOS, name `essor athletics`, primary language French, bundle ID `fr.crossfitessor.athletics`, SKU `essor-athletics`. Copy the app's **Apple ID** (a number, under App Information) into `submit.production.ios.ascAppId` in `eas.json`, and your Apple ID email into `appleId`.
2. `npx eas-cli@latest build --platform ios --profile production` — EAS creates the distribution certificate and profile itself; say yes when it asks. ≈ 15–25 min.
3. `npx eas-cli@latest submit --platform ios --latest` — uploads to App Store Connect. `ITSAppUsesNonExemptEncryption` is already `false` in `app.json`, so TestFlight won't stop on the export-compliance question.
4. App Store Connect → TestFlight → wait for "Ready to Test" (≈ 10–15 min) → **External Testing** → **+** group "Run Club" → add the build → **Enable Public Link**, tester limit 50. The first external build goes through a short Beta App Review (usually under a day; Sean's and Mel's accounts can test immediately as *internal* testers).
5. Paste the public link into `IOS_LINK` in `docs/app.html`.

**Android → Google Play internal test**

1. Google Play Console ([play.google.com/console](https://play.google.com/console), one-off $25) → Create app: `essor athletics`, app, free, French.
2. `npx eas-cli@latest build --platform android --profile production` — an .aab, EAS keeps the signing key. ≈ 15 min.
3. First upload by hand (Google requires it): Play Console → Testing → **Internal testing** → Create new release → upload the .aab from the EAS build page → Save → Testers tab → create an email list "Run Club" with the runners' Gmail addresses → copy the **"Join on the web"** link. Internal testing needs no review and takes up to 100 testers.
4. Later builds go up with `npx eas-cli@latest submit --platform android --latest` once a service-account key is in place (Play Console → Setup → API access; save the JSON as `google-play-service-account.json` at the repo root — it's git-ignored).
5. Paste the join link into `ANDROID_LINK` in `docs/app.html`. Each new Android runner: add their Gmail to the list, they open the link, accept, install.

### Each time the sessions change

The app has no over-the-air updates yet (`expo-updates` isn't installed), so a change to `js/lib/sessions.js` means a new build + submit of both platforms (`npx eas-cli@latest build --platform all --profile production --auto-submit`). Testers get it in TestFlight / Play automatically. Adding `expo-updates` later turns that into `npx eas-cli@latest update`, a few seconds, no store round-trip — worth doing before Cycle 2.

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

In the coach view, tapping a session opens its hub: the session (date, time, Floride, structure), then every runner expected, grouped by level, with their VMA and the times that session asks of them. Tap a runner for their page (level, VMA and test date, bests, sessions done, goal race, injury notes from the questionnaire, training paces).

- Run `supabase/coach.sql` once in Supabase → SQL Editor. It adds `coach_athletes(code)` (the roster, gated by the coach code stored in `coach_settings`) and `member_progress()` (members' phones report sessions done, race goal, bests and VMA at launch and when they change).
- Who's in the list is decided in one place: `getSessionAttendees()` in `js/lib/coach.js`. Today it's everyone with `app_access`; Wodify bookings plug in there later.
- Lint: `npx expo lint` (ESLint config in `eslint.config.js`). Pure helpers are covered by `node scripts/test_paces.js`.
